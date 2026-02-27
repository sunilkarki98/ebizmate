import { db, workspaces, coachConversations, interactions, customers, items, clarificationTickets } from '@ebizmate/db';
import { eq, desc, and, sql } from 'drizzle-orm';
import { decrypt, PlatformFactory } from '@ebizmate/shared';
import { getAIService } from './factory.js';
import type { TeachReplyDto } from '@ebizmate/contracts';

export async function getCoachHistory(userId: string) {
    const userWorkspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, userId)
    });

    if (!userWorkspace) return [];

    const messages = await db.query.coachConversations.findMany({
        where: eq(coachConversations.workspaceId, userWorkspace.id),
        orderBy: [desc(coachConversations.createdAt)],
        limit: 50,
    });

    return messages.reverse().map(m => ({
        id: m.id,
        role: m.role as "user" | "coach",
        content: m.content,
        createdAt: m.createdAt?.getTime() || Date.now()
    }));
}

export async function getCustomerInteractions(userId: string) {
    const userWorkspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, userId)
    });

    if (!userWorkspace) return [];

    return db.query.interactions.findMany({
        where: eq(interactions.workspaceId, userWorkspace.id),
        orderBy: [desc(interactions.createdAt)],
        limit: 50,
        with: {
            post: true,
        },
    });
}

export async function getCustomers(userId: string) {
    const userWorkspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, userId)
    });

    if (!userWorkspace) return [];

    return db.query.customers.findMany({
        where: eq(customers.workspaceId, userWorkspace.id),
        orderBy: [desc(customers.lastInteractionAt)],
        limit: 50,
    });
}

export async function getInboxCustomers(userId: string) {
    const userWorkspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, userId)
    });

    if (!userWorkspace) return [];

    return db.query.customers.findMany({
        where: and(
            eq(customers.workspaceId, userWorkspace.id),
            sql`"conversationState" != 'ARCHIVED'` // Exclude archived so the Inbox acts like an active queue
        ),
        orderBy: [desc(customers.lastInteractionAt)],
        limit: 50,
    });
}

export async function archiveCustomer(userId: string, customerId: string) {
    // 1. Verify ownership
    const customer = await getCustomer(userId, customerId);
    if (!customer) throw new Error("Customer not found or access denied");

    // 2. Set state to ARCHIVED
    await db.update(customers)
        .set({ conversationState: "ARCHIVED" })
        .where(eq(customers.id, customerId));

    return { success: true };
}

export async function getCustomer(userId: string, customerId: string) {
    const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId),
        with: { workspace: true },
    });

    if (!customer) throw new Error("Customer not found");
    if (customer.workspace.userId !== userId) throw new Error("Unauthorized workspace access");

    return customer;
}

export async function setCustomerAiStatus(userId: string, customerId: string, pause: boolean) {
    const customer = await getCustomer(userId, customerId);

    await db.update(customers)
        .set({
            aiPaused: pause,
            conversationState: pause ? customer.conversationState : "IDLE"
        })
        .where(eq(customers.id, customerId));

    return { success: true };
}

export async function sendInboxMessage(userId: string, customerId: string, text: string) {
    const customer = await getCustomer(userId, customerId);
    let accessToken: string | undefined;

    if (customer.workspace.accessToken) {
        try { accessToken = decrypt(customer.workspace.accessToken); }
        catch { console.warn("Failed to decrypt workspace access token"); }
    }

    const client = PlatformFactory.getClient(customer.workspace.platform || "generic", {
        ...(accessToken !== undefined && { accessToken }),
    });

    await client.send({
        to: customer.platformId,
        text,
        workspaceId: customer.workspaceId
    });

    // Record the manual response
    await db.insert(interactions).values({
        workspaceId: customer.workspaceId,
        sourceId: "inbox_manual",
        externalId: `manual-${Date.now()}`,
        authorId: customer.platformId,
        authorName: "Human Agent",
        customerId: customer.id,
        content: "[Manual Reply Sent]",
        response: text,
        status: "PROCESSED",
    });

    const { updateCustomerInboxMeta } = await import("../customer/service.js");
    await updateCustomerInboxMeta(customer.id).catch(e => console.error(e));

    return { success: true };
}

export async function teachAndReply(userId: string, dto: TeachReplyDto): Promise<{ success: boolean; newItemId?: string }> {
    const interaction = await db.query.interactions.findFirst({
        where: eq(interactions.id, dto.interactionId),
        with: { workspace: true }
    });

    if (!interaction) throw new Error("Interaction not found");
    if (interaction.workspace.userId !== userId) throw new Error("Unauthorized workspace access");

    if (interaction.authorId) {
        try {
            let accessToken: string | undefined;
            if (interaction.workspace.accessToken) {
                try { accessToken = decrypt(interaction.workspace.accessToken); }
                catch { console.warn("Failed to decrypt workspace access token"); }
            }

            const client = PlatformFactory.getClient(interaction.workspace.platform || "generic", {
                ...(accessToken !== undefined && { accessToken }),
            });
            await client.send({
                to: interaction.authorId,
                text: dto.humanResponse,
                replyToMessageId: interaction.externalId,
            });
        } catch (error) {
            console.error("Failed to dispatch human reply:", error);
        }
    }

    await db.update(interactions)
        .set({
            response: dto.humanResponse,
            status: "PROCESSED",
        })
        .where(eq(interactions.id, dto.interactionId));

    let newItemId: string | undefined;

    if (interaction.content && interaction.content.length > 5) {
        try {
            const [newItem] = await db.insert(items).values({
                workspaceId: interaction.workspaceId,
                name: interaction.content.substring(0, 80),
                content: dto.humanResponse,
                category: "faq",
                sourceId: `interaction:${interaction.id}`,
                embedding: null, // Generated asynchronously
                meta: {
                    originalQuestion: interaction.content,
                    learnedAt: new Date().toISOString(),
                }
            }).returning();
            newItemId = newItem.id;
        } catch (err) {
            console.error("Failed to learn from interaction:", err);
        }
    }

    // Sync UI Dashboard inbox metas
    let customerId = interaction.customerId;
    if (!customerId && interaction.authorId) {
        const cust = await db.query.customers.findFirst({
            where: and(eq(customers.workspaceId, interaction.workspaceId), eq(customers.platformId, interaction.authorId))
        });
        if (cust) customerId = cust.id;
    }

    if (customerId) {
        const { updateCustomerInboxMeta } = await import("../customer/service.js");
        await updateCustomerInboxMeta(customerId).catch(e => console.error(e));
    }

    // Auto-resolve any linked ClarificationTicket
    try {
        const ticket = await db.query.clarificationTickets.findFirst({
            where: and(
                eq(clarificationTickets.interactionId, dto.interactionId),
                eq(clarificationTickets.status, "pending"),
            ),
        });

        if (ticket) {
            await resolveTicketAndLearn(interaction.workspaceId, ticket.id, dto.humanResponse);
        }
    } catch (err) {
        console.error("Failed to auto-resolve ticket:", err);
    }

    return { success: true, newItemId };
}

/**
 * Resolve a ClarificationTicket by:
 * 1. Extracting structured knowledge from the seller's reply
 * 2. Storing validated knowledge items in the KB
 * 3. Resuming the paused customer conversation
 *
 * This is the orchestrator's escalation resolution flow.
 */
export async function resolveTicketAndLearn(
    workspaceId: string,
    ticketId: string,
    sellerReply: string,
): Promise<{ success: boolean; extractedCount: number }> {
    const { extractKnowledge, resolveEscalation } = await import('../orchestrator/index.js');

    // 1. Get AI service for knowledge extraction
    let ai;
    try {
        ai = await getAIService(workspaceId, "coach");
    } catch (err) {
        console.error("[ResolveTicket] Failed to get AI service:", err);
        // Still resolve the ticket even if AI is unavailable
        await resolveEscalation(ticketId, sellerReply, []);
        return { success: true, extractedCount: 0 };
    }

    // 2. Extract structured knowledge from seller's reply
    const ticket = await db.query.clarificationTickets.findFirst({
        where: eq(clarificationTickets.id, ticketId),
    });

    const context = ticket
        ? `Seller answering customer question: "${ticket.customerMessage}". Intent: ${ticket.detectedIntent}`
        : "Seller providing information";

    const extracted = await extractKnowledge(ai, workspaceId, sellerReply, context);

    // 3. Resolve the ticket (resumes customer AI, marks ticket resolved)
    await resolveEscalation(ticketId, sellerReply, extracted);

    console.log(`[ResolveTicket] Ticket ${ticketId} resolved. Extracted ${extracted.length} knowledge items.`);
    return { success: true, extractedCount: extracted.length };
}

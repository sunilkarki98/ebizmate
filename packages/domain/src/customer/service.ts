import { db } from "@ebizmate/db";
import { customers, interactions, workspaces } from "@ebizmate/db";
import { eq, and, asc, desc, sql } from "drizzle-orm";

export async function getConversation(userId: string, platformId: string, limit = 50, offset = 0) {
    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, userId),
    });

    if (!workspace) throw new Error("Workspace not found");

    const customer = await db.query.customers.findFirst({
        where: and(
            eq(customers.workspaceId, workspace.id),
            eq(customers.platformId, platformId)
        ),
        with: {
            workspace: true,
        },
    });

    if (!customer) throw new Error("Customer not found");

    // PERF-6 FIX: Add pagination to prevent loading entire conversation history.
    // Defaults to last 50 messages. Use limit/offset for pagination.
    const history = await db.query.interactions.findMany({
        where: and(
            eq(interactions.workspaceId, workspace.id),
            eq(interactions.authorId, platformId)
        ),
        orderBy: asc(interactions.createdAt),
        limit,
        offset,
        with: {
            post: true,
        }
    });

    return {
        success: true,
        customer: {
            id: customer.id,
            name: customer.name || customer.platformHandle || "Unknown",
            handle: customer.platformHandle,
            platform: customer.workspace.platform,
            platformId: customer.platformId,
            image: null as string | null
        },
        messages: history,
        pagination: { limit, offset, count: history.length },
    };
}

export async function resumeAi(userId: string, customerId: string) {
    const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId),
        with: { workspace: true },
    });

    if (!customer) throw new Error("Customer not found");
    if (customer.workspace.userId !== userId) {
        throw new Error("Unauthorized workspace access");
    }

    await db.update(customers)
        .set({
            aiPaused: false,
            aiPausedAt: null,
            conversationState: "IDLE",
            conversationContext: {},
            updatedAt: new Date(),
        })
        .where(eq(customers.id, customerId));

    await db.insert(interactions).values({
        workspaceId: customer.workspaceId,
        sourceId: "system",
        externalId: `resume-ai-${Date.now()}`,
        authorId: customer.platformId,
        authorName: "System",
        content: "Human takeover ended",
        response: "AI has been resumed for this conversation. I'm back to assist! 🤖",
        status: "PROCESSED",
    });

    return { success: true };
}

export async function pauseAi(userId: string, customerId: string) {
    const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId),
        with: { workspace: true },
    });

    if (!customer) throw new Error("Customer not found");
    if (customer.workspace.userId !== userId) {
        throw new Error("Unauthorized workspace access");
    }

    await db.update(customers)
        .set({
            aiPaused: true,
            aiPausedAt: new Date(),
            conversationState: "HUMAN_TAKEOVER",
            updatedAt: new Date(),
        })
        .where(eq(customers.id, customerId));

    return { success: true };
}

/**
 * Syncs the denormalized Inbox UI columns (latestMessagePreview, needsReviewCount)
 * on the customers table based on their actual interaction history.
 */
export async function updateCustomerInboxMeta(customerId: string) {
    // 1. Get the latest interaction for the preview text
    const latestInteractions = await db.query.interactions.findMany({
        where: eq(interactions.customerId, customerId),
        orderBy: desc(interactions.createdAt),
        limit: 1
    });

    let preview = null;
    if (latestInteractions.length > 0) {
        const latest = latestInteractions[0];
        if (latest.response) {
            preview = `Bot: ${latest.response.substring(0, 100)}`;
        } else {
            preview = latest.content.substring(0, 100);
        }
    }

    // 2. Count how many interactions are currently NEEDS_REVIEW
    const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(interactions)
        .where(
            and(
                eq(interactions.customerId, customerId),
                eq(interactions.status, "NEEDS_REVIEW")
            )
        );

    const needsReviewCount = Number(countResult[0]?.count || 0);

    // 3. Update the customer record
    await db.update(customers)
        .set({
            latestMessagePreview: preview,
            needsReviewCount: needsReviewCount
        })
        .where(eq(customers.id, customerId));
}

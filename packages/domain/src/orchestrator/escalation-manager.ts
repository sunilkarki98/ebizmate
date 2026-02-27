/**
 * Escalation Manager
 *
 * Handles the full escalation lifecycle:
 * 1. Creates ClarificationTicket when confidence is too low
 * 2. Generates specific questions for the seller
 * 3. Pauses the customer conversation
 * 4. Processes seller replies to extract and store knowledge
 * 5. Resumes conversations automatically
 */

import { db } from "@ebizmate/db";
import { clarificationTickets, customers, interactions, feedbackQueue, coachConversations } from "@ebizmate/db";
import { eq, and } from "drizzle-orm";
import type { ChatParams } from "@ebizmate/contracts";
import type { ClarificationTicketInput, Intent } from "./types.js";
import { ESCALATION_QUESTION_PROMPT } from "./prompts.js";

interface AIService {
    chat(params: ChatParams, interactionId?: string, usageType?: string): Promise<{ content: string; usage: any; model: string }>;
}

// ─── Create Escalation ──────────────────────────────────────────────────────

/**
 * Generate a specific question for the seller and create a ClarificationTicket.
 *
 * @param ai - AI service for question generation
 * @param input - Escalation context
 * @returns The generated question string
 */
export async function createEscalation(
    ai: AIService,
    input: ClarificationTicketInput,
): Promise<string> {
    // Generate a targeted question for the seller
    const question = await generateEscalationQuestion(
        ai,
        input.customerMessage,
        input.detectedIntent,
        input.interactionId,
    );

    // Create a ClarificationTicket record
    await db.insert(clarificationTickets).values({
        workspaceId: input.workspaceId,
        interactionId: input.interactionId,
        customerId: input.customerId,
        customerMessage: input.customerMessage,
        detectedIntent: input.detectedIntent,
        generatedQuestion: question,
        status: "pending",
    });

    // Also insert into feedbackQueue for backward compatibility with the existing dashboard
    await db.insert(feedbackQueue).values({
        workspaceId: input.workspaceId,
        interactionId: input.interactionId,
        content: input.customerMessage,
        itemsContext: `Escalation Question: ${question}`,
        status: "PENDING",
        createdAt: new Date(),
    });

    // Pause AI for this customer if we have a customerId
    if (input.customerId) {
        await db.update(customers)
            .set({ aiPaused: true, aiPausedAt: new Date(), updatedAt: new Date() })
            .where(eq(customers.id, input.customerId));
    }

    // Create an internal notification interaction (visible in seller dashboard)
    await db.insert(interactions).values({
        workspaceId: input.workspaceId,
        sourceId: "escalation",
        externalId: `escalation-${input.interactionId}-${Date.now()}`,
        authorId: "system_architect",
        authorName: "AI Orchestrator",
        content: `Escalated: "${input.customerMessage.substring(0, 200)}"`,
        response: `🚨 Bot needs help!\n\nCustomer asked: "${input.customerMessage}"\nDetected intent: ${input.detectedIntent}\n\n**Question for you:** ${question}`,
        status: "NEEDS_REVIEW",
        meta: {
            originalInteractionId: input.interactionId,
            escalationType: "clarification",
            detectedIntent: input.detectedIntent,
        },
    });

    // Send a proactive message to the user from the AI Coach
    await db.insert(coachConversations).values({
        workspaceId: input.workspaceId,
        role: "coach",
        content: `🚨 **Bot Needs Help!**\n\nA customer just asked: "${input.customerMessage}"\n\nI couldn't find the answer in the Knowledge Base. Can you help me out?\n\n**Question:** ${question}`
    });

    return question;
}

// ─── Resume Conversation ────────────────────────────────────────────────────

/**
 * Resume a paused conversation after seller provides an answer.
 * Called after KnowledgeExtractor has processed the seller's reply.
 *
 * @param ticketId - The ClarificationTicket to resolve
 * @param sellerReply - The seller's answer text
 */
export async function resolveEscalation(
    ticketId: string,
    sellerReply: string,
    extractedKnowledge: unknown[] = [],
): Promise<void> {
    const ticket = await db.query.clarificationTickets.findFirst({
        where: eq(clarificationTickets.id, ticketId),
    });

    if (!ticket) {
        console.warn(`[EscalationManager] Ticket ${ticketId} not found`);
        return;
    }

    // Update ticket
    await db.update(clarificationTickets)
        .set({
            sellerReply,
            extractedKnowledge: extractedKnowledge as any,
            status: "resolved",
            resolvedAt: new Date(),
        })
        .where(eq(clarificationTickets.id, ticketId));

    // Resume AI for the customer
    if (ticket.customerId) {
        await db.update(customers)
            .set({ aiPaused: false, updatedAt: new Date() })
            .where(eq(customers.id, ticket.customerId));
    }

    // Mark the original interaction as resolved (merge into existing meta)
    if (ticket.interactionId) {
        const origInteraction = await db.query.interactions.findFirst({
            where: eq(interactions.id, ticket.interactionId),
        });
        const existingMeta = (origInteraction?.meta as Record<string, unknown>) || {};

        await db.update(interactions)
            .set({
                status: "RESOLVED",
                meta: { ...existingMeta, resolvedVia: "seller_clarification", ticketId },
                updatedAt: new Date(),
            })
            .where(eq(interactions.id, ticket.interactionId));
    }

    // Sync UI Dashboard inbox metas
    if (ticket.customerId) {
        const { updateCustomerInboxMeta } = await import("../customer/service.js");
        await updateCustomerInboxMeta(ticket.customerId).catch(e => console.error(e));
    }
}

// ─── Question Generation ────────────────────────────────────────────────────

async function generateEscalationQuestion(
    ai: AIService,
    customerMessage: string,
    detectedIntent: Intent,
    interactionId: string,
): Promise<string> {
    const prompt = ESCALATION_QUESTION_PROMPT(
        customerMessage,
        detectedIntent,
        "The knowledge base does not contain sufficient information to answer this query.",
    );

    try {
        const result = await ai.chat({
            systemPrompt: "Return ONLY valid JSON. No markdown.",
            userMessage: prompt,
            temperature: 0.2,
            maxTokens: 300,
        }, interactionId, "chat");

        const raw = result.content.replace(/```json\s*|```\s*/g, "").trim();
        const parsed = JSON.parse(raw);

        return parsed.question || `A customer asked: "${customerMessage.substring(0, 100)}". What should we tell them?`;

    } catch (err) {
        console.warn("[EscalationManager] Question generation failed:", err);
        return `A customer asked: "${customerMessage.substring(0, 100)}". Can you provide guidance on how to respond?`;
    }
}

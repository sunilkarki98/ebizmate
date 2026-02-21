"use server";

import { auth } from "@/lib/auth";
import { db } from "@ebizmate/db";
import { customers, workspaces, interactions } from "@ebizmate/db";
import { eq, and } from "drizzle-orm";

/**
 * Resume AI responses for a customer after human takeover.
 * Resets aiPaused to false and conversationState to IDLE.
 */
export async function resumeAiForCustomerAction(customerId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    // Verify ownership: customer must belong to the user's workspace
    const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId),
        with: { workspace: true },
    });

    if (!customer) throw new Error("Customer not found");
    if (customer.workspace.userId !== session.user.id) {
        throw new Error("Unauthorized workspace access");
    }

    // Resume AI
    await db.update(customers)
        .set({
            aiPaused: false,
            aiPausedAt: null,
            conversationState: "IDLE",
            conversationContext: {},
            updatedAt: new Date(),
        })
        .where(eq(customers.id, customerId));

    // Insert a system note so the conversation history reflects the handoff
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

/**
 * Pause AI for a specific customer (enable human takeover).
 */
export async function pauseAiForCustomerAction(customerId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId),
        with: { workspace: true },
    });

    if (!customer) throw new Error("Customer not found");
    if (customer.workspace.userId !== session.user.id) {
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

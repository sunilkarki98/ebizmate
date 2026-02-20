"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { interactions, items } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PlatformFactory } from "@/lib/platform/factory";
import { getAIService } from "@/lib/ai/services/factory";

export async function teachAndReplyAction(interactionId: string, humanResponse: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    // 1. Fetch Interaction
    const interaction = await db.query.interactions.findFirst({
        where: eq(interactions.id, interactionId),
        with: { workspace: true }
    });

    if (!interaction) throw new Error("Interaction not found");

    // Verify ownership
    if (interaction.workspace.userId !== session.user.id) throw new Error("Unauthorized workspace access");

    // 2. Dispatch to Customer (The "Reply")
    let dispatchSuccess = false;
    if (interaction.authorId) {
        try {
            const client = PlatformFactory.getClient(interaction.workspace.platform || "generic");
            await client.send({
                to: interaction.authorId,
                text: humanResponse,
                replyToMessageId: interaction.externalId,
            });
            dispatchSuccess = true;
        } catch (error) {
            console.error("Failed to dispatch human reply:", error);
            // We proceed to save learning even if dispatch fails, but ideally we'd warn context
        }
    }

    // 3. Update Interaction Status
    await db.update(interactions)
        .set({
            response: humanResponse,
            status: "PROCESSED", // Mark as resolved
        })
        .where(eq(interactions.id, interactionId));

    // 4. LEARN: Create Knowledge Item (The "Teach")
    // We only learn if the input question was meaningful (heuristic) context
    if (interaction.content && interaction.content.length > 5) {
        // Generate embedding for the new item
        const ai = await getAIService(interaction.workspaceId, "coach");
        let embedding = null;
        try {
            const combinedText = `Q: ${interaction.content} A: ${humanResponse}`;
            const embedResult = await ai.embed(combinedText, `item-${Date.now()}`);
            embedding = embedResult.embedding;
        } catch (e) {
            console.error("Failed to generate embedding for new knowledge:", e);
        }

        await db.insert(items).values({
            workspaceId: interaction.workspaceId,
            name: interaction.content.substring(0, 80),
            content: humanResponse,
            category: "faq", // Q&A pair — customer bot understands this category
            sourceId: `interaction:${interaction.id}`,
            embedding: embedding,
            meta: {
                originalQuestion: interaction.content,
                learnedAt: new Date().toISOString(),
            }
        });
    }

    return { success: true };
}

"use server";

import { auth } from "@/lib/auth";
import { db } from "@ebizmate/db";
import { interactions, items } from "@ebizmate/db";
import { eq } from "drizzle-orm";
import { PlatformFactory } from "@/lib/platform/factory";
import { after } from "next/server";


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
        const combinedText = `Q: ${interaction.content} A: ${humanResponse}`;
        // Execute the heaviest parts out-of-band to return control to UI immediately
        after(async () => {
            let embedding = null;
            try {
                const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
                const response = await fetch(`${backendUrl}/ai/embed`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer system_token_${interaction.workspaceId}`
                    },
                    body: JSON.stringify({
                        input: combinedText,
                        interactionId: interaction.id,
                        botType: "coach"
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    embedding = data.embedding;
                } else {
                    console.error("Embedding API failed:", await response.text());
                }
            } catch (e) {
                console.error("Failed to generate embedding for new knowledge:", e);
            }

            // Save the newly learned item even if embedding failed (it will be null)
            try {
                await db.insert(items).values({
                    workspaceId: interaction.workspaceId,
                    name: interaction.content.substring(0, 80),
                    content: humanResponse,
                    category: "faq",
                    sourceId: `interaction:${interaction.id}`,
                    embedding: embedding,
                    meta: {
                        originalQuestion: interaction.content,
                        learnedAt: new Date().toISOString(),
                    }
                });
            } catch (err) {
                console.error("Failed to insert learned item database:", err);
            }
        });
    }

    return { success: true };
}

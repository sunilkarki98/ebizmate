import { db } from "@ebizmate/db";
import { aiUsageLog, workspaces } from "@ebizmate/db";
import { eq, sql } from "drizzle-orm";

export async function logUsage(
    workspaceId: string,
    interactionId: string | null,
    provider: string,
    model: string,
    operation: "chat" | "embedding" | "coach_chat",
    tokens: { input: number; output: number },
    latencyMs: number,
    success: boolean,
    errorMessage?: string,
) {
    try {
        await db.insert(aiUsageLog).values({
            workspaceId,
            interactionId,
            provider,
            model,
            operation,
            inputTokens: tokens.input,
            outputTokens: tokens.output,
            totalTokens: tokens.input + tokens.output,
            latencyMs,
            success,
            errorMessage: errorMessage || null,
        });

        // Update the fast-counter on the workspace to prevent need for SUM queries later
        await db.update(workspaces)
            .set({ usedTokens: sql`${workspaces.usedTokens} + ${tokens.input + tokens.output}` })
            .where(eq(workspaces.id, workspaceId));

    } catch (err) {
        console.error("Failed to log AI usage:", err);
    }
}

export async function resetMonthlyTokenUsage() {
    try {
        console.log("[Billing] Initiating monthly token usage reset for all workspaces...");
        await db.update(workspaces)
            .set({ usedTokens: 0, updatedAt: new Date() });
        console.log("[Billing] Successfully reset token usage for all workspaces.");
    } catch (err) {
        console.error("[Billing] Failed to reset monthly token usage:", err);
    }
}

import { db } from "@ebizmate/db";
import { aiUsageLog } from "@ebizmate/db";

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
    } catch (err) {
        console.error("Failed to log AI usage:", err);
    }
}

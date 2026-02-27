"use server";

import { revalidatePath } from "next/cache";
import { apiClient } from "@/lib/api-client";

export async function teachAndReplyAction(interactionId: string, humanResponse: string) {
    try {
        await apiClient(`/ai/teach-reply`, {
            method: "POST",
            body: JSON.stringify({ interactionId, humanResponse })
        });

        // Revalidate where relevant
        revalidatePath("/dashboard/interactions");
        revalidatePath("/dashboard/knowledge");
        return { success: true };
    } catch (error: any) {
        throw new Error(error.message || "Failed to process reply");
    }
}

"use server";

import { auth } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";

/**
 * Resume AI responses for a customer after human takeover.
 * Resets aiPaused to false and conversationState to IDLE.
 */
export async function resumeAiForCustomerAction(customerId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    try {
        await apiClient(`/ai/customer/${customerId}`, { cache: 'no-store' });
        await apiClient(`/customer/${customerId}/resume`, { method: "POST" });
        return { success: true };
    } catch (e: any) {
        throw new Error(e.message || "Failed to resume AI for customer");
    }
}

/**
 * Pause AI for a specific customer (enable human takeover).
 */
export async function pauseAiForCustomerAction(customerId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    try {
        await apiClient(`/ai/customer/${customerId}`, { cache: 'no-store' });
        await apiClient(`/customer/${customerId}/pause`, { method: "POST" });
        return { success: true };
    } catch (e: any) {
        throw new Error(e.message || "Failed to pause AI for customer");
    }
}

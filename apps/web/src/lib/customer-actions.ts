"use server";

import { auth, getBackendToken } from "@/lib/auth";

/**
 * Resume AI responses for a customer after human takeover.
 * Resets aiPaused to false and conversationState to IDLE.
 */
export async function resumeAiForCustomerAction(customerId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const backendToken = await getBackendToken();

    // Verify ownership via API endpoint
    const custRes = await fetch(`${backendUrl}/ai/customer/${customerId}`, {
        headers: { "Authorization": `Bearer ${backendToken}` },
        cache: 'no-store'
    });

    if (!custRes.ok) {
        if (custRes.status === 404) throw new Error("Customer not found");
        throw new Error("Unauthorized workspace access");
    }


    const response = await fetch(`${backendUrl}/customer/${customerId}/resume`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${backendToken}`
        }
    });

    if (!response.ok) {
        throw new Error("Failed to resume AI for customer");
    }

    return { success: true };
}

/**
 * Pause AI for a specific customer (enable human takeover).
 */
export async function pauseAiForCustomerAction(customerId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const backendToken = await getBackendToken();

    // Verify ownership via API endpoint
    const custRes = await fetch(`${backendUrl}/ai/customer/${customerId}`, {
        headers: { "Authorization": `Bearer ${backendToken}` },
        cache: 'no-store'
    });

    if (!custRes.ok) {
        if (custRes.status === 404) throw new Error("Customer not found");
        throw new Error("Unauthorized workspace access");
    }


    const response = await fetch(`${backendUrl}/customer/${customerId}/pause`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${backendToken}`
        }
    });

    if (!response.ok) {
        throw new Error("Failed to pause AI for customer");
    }

    return { success: true };
}

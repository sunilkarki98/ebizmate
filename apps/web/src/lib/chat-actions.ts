"use server";

import { getBackendToken } from "@/lib/auth";

// Now accepts platformId (external ID) instead of internal UUID
export async function getConversationAction(platformId: string) {
    const backendToken = await getBackendToken();
    if (!backendToken) return { error: "Unauthorized" };

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
        const response = await fetch(`${backendUrl}/customer/${platformId}/conversation`, {
            headers: {
                "Authorization": `Bearer ${backendToken}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            return { error: error.message || "Failed to fetch conversation" };
        }

        return await response.json();
    } catch (e: any) {
        return { error: e.message || "Failed to connect to API" };
    }
}

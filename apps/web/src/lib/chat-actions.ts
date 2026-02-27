"use server";

import { apiClient } from "@/lib/api-client";

// Now accepts platformId (external ID) instead of internal UUID
export async function getConversationAction(platformId: string) {
    try {
        return await apiClient(`/customer/${platformId}/conversation`);
    } catch (e: any) {
        return { error: e.message || "Failed to connect to API" };
    }
}

"use server";

import { getBackendToken } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function teachAndReplyAction(interactionId: string, humanResponse: string) {
    const backendToken = await getBackendToken();
    if (!backendToken) throw new Error("Unauthorized");

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
        const response = await fetch(`${backendUrl}/ai/teach-reply`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${backendToken}`
            },
            body: JSON.stringify({
                interactionId,
                humanResponse
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to process reply");
        }

        // Revalidate where relevant
        revalidatePath("/dashboard/interactions");
        revalidatePath("/dashboard/knowledge");
        return { success: true };
    } catch (error: any) {
        throw new Error(error.message || "Failed to process reply");
    }
}

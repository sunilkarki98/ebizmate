"use server";

import { auth, getBackendToken } from "@/lib/auth";


export async function simulateWebhookAction(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    if (!session?.user?.id) return { error: "Unauthorized" };

    const userId = formData.get("userId") as string;
    const userName = formData.get("userName") as string;
    const message = formData.get("message") as string;
    // New fields for Post Simulation
    const videoId = formData.get("videoId") as string;
    const postContent = formData.get("postContent") as string;

    const payload = {
        type: message ? "message.create" : "video.publish",
        userId: userId,
        userName: userName,
        message: message || undefined,
        text: message || undefined,
        video_id: videoId || undefined,
        post_id: videoId || undefined,
        description: postContent || undefined,
        caption: postContent || undefined,
    };

    try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const internalSecret = process.env.INTERNAL_API_SECRET;
        if (!internalSecret) {
            return { success: false, error: "INTERNAL_API_SECRET is not configured" };
        }
        const response = await fetch(`${backendUrl}/webhook/internal/simulate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${internalSecret}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to communicate with Backend");
        }

        return { success: true, reply: "Simulation Payload Sent" };
    } catch (error: any) {
        console.error("Simulation Processing Failed:", error);
        return { success: false, error: error.message || "Simulation Failed" };
    }
}

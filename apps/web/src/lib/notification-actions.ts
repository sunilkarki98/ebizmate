"use server";

import { getBackendToken } from "@/lib/auth";

export interface SystemNotification {
    id: string;
    type: "ingestion" | "escalation" | "system";
    title: string;
    message: string;
    createdAt: Date | null;
    interactionId?: string;
    originalInteractionId?: string; // For escalations: the stuck customer interaction
}

/**
 * Fetch system notifications for the current user's workspace.
 * These are interactions from "system_architect" in the simulator channel.
 */
export async function getNotificationsAction(limit = 20): Promise<{
    notifications: SystemNotification[];
    unreadCount: number;
}> {
    const backendToken = await getBackendToken();
    if (!backendToken) return { notifications: [], unreadCount: 0 };

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
        const response = await fetch(`${backendUrl}/notifications?limit=${limit}`, {
            headers: {
                "Authorization": `Bearer ${backendToken}`
            }
        });
        if (!response.ok) return { notifications: [], unreadCount: 0 };
        return await response.json();
    } catch (e) {
        return { notifications: [], unreadCount: 0 };
    }
}

/**
 * Mark notifications as read by clearing them (optional - for future use).
 * For now, we use a time-based "unread" heuristic.
 */
export async function dismissNotificationsAction() {
    // Future: could add a "read_at" timestamp or a separate notifications table
    return { success: true };
}

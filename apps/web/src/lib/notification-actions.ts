"use server";

import { apiClient } from "@/lib/api-client";

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
    try {
        return await apiClient(`/notifications?limit=${limit}`);
    } catch {
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

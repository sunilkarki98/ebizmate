"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { interactions, workspaces } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

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
    const session = await auth();
    if (!session?.user?.id) return { notifications: [], unreadCount: 0 };

    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, session.user.id),
    });

    if (!workspace) return { notifications: [], unreadCount: 0 };

    // Fetch system notifications (authorId = "system_architect")
    const systemInteractions = await db.query.interactions.findMany({
        where: and(
            eq(interactions.workspaceId, workspace.id),
            eq(interactions.authorId, "system_architect")
        ),
        orderBy: desc(interactions.createdAt),
        limit,
    });

    const notifications: SystemNotification[] = systemInteractions.map(i => {
        // Determine notification type from content
        let type: "ingestion" | "escalation" | "system" = "system";
        let title = "System Notification";

        if (i.content?.startsWith("Ingested post:")) {
            type = "ingestion";
            title = "📦 Post Ingested";
        } else if (i.content?.startsWith("Escalated:")) {
            type = "escalation";
            title = "🚨 Bot Needs Help";
        } else if (i.content === "Alert") {
            type = "escalation";
            title = "🚨 Bot Stuck";
        }

        // Extract original interaction ID — prefer `meta`, fall back to parsing `externalId`
        let originalInteractionId: string | undefined;
        const meta = i.meta as Record<string, any> | null;
        if (type === "escalation") {
            if (meta?.originalInteractionId) {
                originalInteractionId = meta.originalInteractionId;
            } else if (i.externalId?.startsWith("escalation-")) {
                originalInteractionId = i.externalId.replace("escalation-", "");
            }
        }

        return {
            id: i.id,
            type,
            title,
            message: i.response || i.content || "",
            createdAt: i.createdAt,
            interactionId: i.id,
            originalInteractionId,
        };
    });

    // Count unread = notifications in last 24 hours (simple heuristic)
    const oneDayAgo = new Date(Date.now() - 86400000);
    const unreadCount = notifications.filter(
        n => n.createdAt && n.createdAt > oneDayAgo
    ).length;

    return { notifications, unreadCount };
}

/**
 * Mark notifications as read by clearing them (optional - for future use).
 * For now, we use a time-based "unread" heuristic.
 */
export async function dismissNotificationsAction() {
    // Future: could add a "read_at" timestamp or a separate notifications table
    return { success: true };
}

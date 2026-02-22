import { Injectable } from '@nestjs/common';
import { db } from '@ebizmate/db';
import { interactions, workspaces } from '@ebizmate/db';
import { eq, and, desc } from 'drizzle-orm';

@Injectable()
export class NotificationsService {
    async getNotifications(userId: string, limit: number) {
        const workspace = await db.query.workspaces.findFirst({
            where: eq(workspaces.userId, userId),
        });

        if (!workspace) return { notifications: [], unreadCount: 0 };

        const systemInteractions = await db.query.interactions.findMany({
            where: and(
                eq(interactions.workspaceId, workspace.id),
                eq(interactions.authorId, "system_architect")
            ),
            orderBy: desc(interactions.createdAt),
            limit,
        });

        const notifications = systemInteractions.map(i => {
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

        const oneDayAgo = new Date(Date.now() - 86400000);
        const unreadCount = notifications.filter(
            n => n.createdAt && n.createdAt > oneDayAgo
        ).length;

        return { notifications, unreadCount };
    }
}

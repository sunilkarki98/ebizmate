"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@ebizmate/db");
const db_2 = require("@ebizmate/db");
const drizzle_orm_1 = require("drizzle-orm");
let NotificationsService = class NotificationsService {
    async getNotifications(userId, limit) {
        const workspace = await db_1.db.query.workspaces.findFirst({
            where: (0, drizzle_orm_1.eq)(db_2.workspaces.userId, userId),
        });
        if (!workspace)
            return { notifications: [], unreadCount: 0 };
        const systemInteractions = await db_1.db.query.interactions.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.interactions.workspaceId, workspace.id), (0, drizzle_orm_1.eq)(db_2.interactions.authorId, "system_architect")),
            orderBy: (0, drizzle_orm_1.desc)(db_2.interactions.createdAt),
            limit,
        });
        const notifications = systemInteractions.map(i => {
            let type = "system";
            let title = "System Notification";
            if (i.content?.startsWith("Ingested post:")) {
                type = "ingestion";
                title = "📦 Post Ingested";
            }
            else if (i.content?.startsWith("Escalated:")) {
                type = "escalation";
                title = "🚨 Bot Needs Help";
            }
            else if (i.content === "Alert") {
                type = "escalation";
                title = "🚨 Bot Stuck";
            }
            let originalInteractionId;
            const meta = i.meta;
            if (type === "escalation") {
                if (meta?.originalInteractionId) {
                    originalInteractionId = meta.originalInteractionId;
                }
                else if (i.externalId?.startsWith("escalation-")) {
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
        const unreadCount = notifications.filter(n => n.createdAt && n.createdAt > oneDayAgo).length;
        return { notifications, unreadCount };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)()
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map
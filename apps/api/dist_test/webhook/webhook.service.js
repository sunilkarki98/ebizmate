"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WebhookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@ebizmate/db");
const db_2 = require("@ebizmate/db");
const drizzle_orm_1 = require("drizzle-orm");
const ai_service_1 = require("../ai/ai.service");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let WebhookService = WebhookService_1 = class WebhookService {
    aiService;
    aiQueue;
    logger = new common_1.Logger(WebhookService_1.name);
    constructor(aiService, aiQueue) {
        this.aiService = aiService;
        this.aiQueue = aiQueue;
    }
    async handleWebhookEvent(platform, payload) {
        const platformUserId = payload.userId || payload.sec_uid || payload.authorId;
        if (!platformUserId) {
            this.logger.warn(`Missing user ID in webhook for platform ${platform}`);
            return { error: 'Missing user ID' };
        }
        const workspace = await db_1.db.query.workspaces.findFirst({
            where: (0, drizzle_orm_1.eq)(db_2.workspaces.platformId, platformUserId),
        });
        if (!workspace) {
            return { error: 'Workspace not found' };
        }
        const eventType = payload.type;
        // Content Indexing
        if (eventType === 'video.publish' || eventType === 'post.create' || eventType === 'media.create') {
            const videoId = payload.video_id || payload.item_id || payload.post_id;
            const caption = payload.description || payload.caption || payload.text || '';
            if (videoId) {
                await db_1.db.insert(db_2.posts).values({
                    workspaceId: workspace.id,
                    platformId: videoId,
                    content: caption,
                    meta: payload,
                }).onConflictDoUpdate({
                    target: db_2.posts.platformId,
                    set: { content: caption, updatedAt: new Date() }
                });
                this.logger.log(`Indexed content: ${videoId}`);
            }
            return { success: true, type: 'content_indexed' };
        }
        // Interaction Handling
        if (eventType === 'comment.create' || eventType === 'message.create') {
            const parentId = payload.video_id || payload.post_id;
            let localPostId = null;
            if (parentId) {
                const parentPost = await db_1.db.query.posts.findFirst({
                    where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.posts.platformId, parentId), (0, drizzle_orm_1.eq)(db_2.posts.workspaceId, workspace.id)),
                });
                if (parentPost) {
                    localPostId = parentPost.id;
                }
            }
            // Customer tracking
            let customerId = null;
            if (payload.userId) {
                const [customer] = await db_1.db.insert(db_2.customers).values({
                    workspaceId: workspace.id,
                    platformId: payload.userId,
                    platformHandle: payload.userName || 'unknown',
                    name: payload.userName || 'unknown',
                    lastInteractionAt: new Date(),
                }).onConflictDoUpdate({
                    target: [db_2.customers.workspaceId, db_2.customers.platformId],
                    set: {
                        platformHandle: payload.userName || undefined,
                        lastInteractionAt: new Date(),
                    }
                }).returning({ id: db_2.customers.id });
                customerId = customer?.id || null;
            }
            const externalId = payload.commentId || payload.messageId || `evt-${Date.now()}`;
            const result = await db_1.db.insert(db_2.interactions).values({
                workspaceId: workspace.id,
                postId: localPostId,
                sourceId: parentId || 'unknown',
                externalId,
                authorId: payload.userId || 'anonymous',
                authorName: payload.userName || 'User',
                customerId,
                content: payload.text || payload.message || '',
                status: 'PENDING',
            }).onConflictDoNothing({
                target: [db_2.interactions.workspaceId, db_2.interactions.externalId],
            }).returning();
            if (result.length === 0) {
                this.logger.log(`Duplicate webhook event skipped: ${externalId}`);
                return { success: true, duplicate: true };
            }
            const [interaction] = result;
            // Trigger AI Processing async via Queue (Guaranteed Delivery)
            this.aiQueue.add('process', { interactionId: interaction.id }, {
                removeOnComplete: true,
                removeOnFail: false,
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 }
            }).catch(err => {
                this.logger.error(`Failed to queue interaction ${interaction.id}:`, err);
            });
            return { success: true, interactionId: interaction.id };
        }
        return { received: true, type: eventType || 'unknown' };
    }
};
exports.WebhookService = WebhookService;
exports.WebhookService = WebhookService = WebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bullmq_1.InjectQueue)('ai')),
    __metadata("design:paramtypes", [ai_service_1.AiService,
        bullmq_2.Queue])
], WebhookService);
//# sourceMappingURL=webhook.service.js.map
import { Injectable, Logger } from '@nestjs/common';
import { db } from '@ebizmate/db';
import { workspaces, posts, customers, interactions } from '@ebizmate/db';
import { eq, and } from 'drizzle-orm';
import { AiService } from '../ai/ai.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class WebhookService {
    private readonly logger = new Logger(WebhookService.name);

    constructor(
        private readonly aiService: AiService,
        @InjectQueue('ai') private readonly aiQueue: Queue,
    ) { }

    async handleWebhookEvent(platform: string, payload: any) {
        const platformUserId = payload.userId || payload.sec_uid || payload.authorId;
        if (!platformUserId) {
            this.logger.warn(`Missing user ID in webhook for platform ${platform}`);
            return { error: 'Missing user ID' };
        }

        const workspace = await db.query.workspaces.findFirst({
            where: eq(workspaces.platformId, platformUserId),
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
                await db.insert(posts).values({
                    workspaceId: workspace.id,
                    platformId: videoId,
                    content: caption,
                    meta: payload,
                }).onConflictDoUpdate({
                    target: posts.platformId,
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
                const parentPost = await db.query.posts.findFirst({
                    where: and(
                        eq(posts.platformId, parentId),
                        eq(posts.workspaceId, workspace.id)
                    ),
                });
                if (parentPost) {
                    localPostId = parentPost.id;
                }
            }

            // Customer tracking
            let customerId: string | null = null;
            if (payload.userId) {
                const [customer] = await db.insert(customers).values({
                    workspaceId: workspace.id,
                    platformId: payload.userId,
                    platformHandle: payload.userName || 'unknown',
                    name: payload.userName || 'unknown',
                    lastInteractionAt: new Date(),
                }).onConflictDoUpdate({
                    target: [customers.workspaceId, customers.platformId],
                    set: {
                        platformHandle: payload.userName || undefined,
                        lastInteractionAt: new Date(),
                    }
                }).returning({ id: customers.id });
                customerId = customer?.id || null;
            }

            const externalId = payload.commentId || payload.messageId || `evt-${Date.now()}`;

            const result = await db.insert(interactions).values({
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
                target: [interactions.workspaceId, interactions.externalId],
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
}

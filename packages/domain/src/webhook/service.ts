import { db } from '@ebizmate/db';
import { workspaces, posts, customers, interactions } from '@ebizmate/db';
import { eq, and } from 'drizzle-orm';
import type { Queue } from 'bullmq';
import { checkInboundRateLimit } from '@ebizmate/shared';

export async function handleWebhookEvent(platform: string, payload: any, aiQueue: Queue) {
    const platformUserId = payload.userId || payload.sec_uid || payload.authorId;
    if (!platformUserId) {
        console.warn(`Missing user ID in webhook for platform ${platform}`);
        return { error: 'Missing user ID' };
    }

    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.platformId, platformUserId),
    });

    if (!workspace) {
        return { error: 'Workspace not found' };
    }

    // Early rejection for inactive/blocked workspaces — don't waste queue capacity
    if (workspace.status === 'suspended') {
        return { received: true, blocked: true, reason: 'workspace_suspended' };
    }
    if (workspace.aiBlocked) {
        return { received: true, blocked: true, reason: 'ai_blocked' };
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
            console.log(`Indexed content: ${videoId}`);
        }
        return { success: true, type: 'content_indexed' };
    }

    // Interaction Handling
    if (eventType === 'comment.create' || eventType === 'message.create') {
        const authorId = payload.userId || 'anonymous';

        if (authorId !== 'anonymous') {
            const isAllowed = await checkInboundRateLimit(workspace.id, authorId);
            if (!isAllowed) {
                console.warn(`[RateLimit] Dropping inbound webhook from user ${authorId} (Workspace ${workspace.id})`);
                return { received: true, blocked: true, reason: 'rate_limit_exceeded' };
            }
        }

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

        let contentText = payload.text || payload.message || '';
        const mediaUrl = payload.imageUrl || payload.mediaUrl || payload.image_url || payload.media_url || payload.media;
        let finalMeta: any = { ...payload };

        // PERF-4 FIX: Defer image analysis to the async BullMQ processor.
        // Previously, analyzeImage() was called here synchronously, blocking the
        // webhook response while downloading and processing the image via an LLM.
        // Now we save the raw URL and let the processor handle it.
        if (mediaUrl) {
            finalMeta.hasMedia = true;
            finalMeta.originalMediaUrl = mediaUrl;
            finalMeta.pendingImageAnalysis = true;
        }

        const result = await db.insert(interactions).values({
            workspaceId: workspace.id,
            postId: localPostId,
            sourceId: parentId || 'unknown',
            externalId,
            authorId: payload.userId || 'anonymous',
            authorName: payload.userName || 'User',
            customerId,
            content: contentText,
            meta: finalMeta,
            status: 'PENDING',
        }).onConflictDoNothing({
            target: [interactions.workspaceId, interactions.externalId],
        }).returning();

        let interaction;
        if (result.length === 0) {
            // Conflict occurred - record already exists. Check if it's still stuck in PENDING
            const existing = await db.query.interactions.findFirst({
                where: and(
                    eq(interactions.workspaceId, workspace.id),
                    eq(interactions.externalId, externalId)
                )
            });

            if (!existing || existing.status !== 'PENDING') {
                console.log(`Duplicate webhook event skipped (already processed or not found): ${externalId}`);
                return { success: true, duplicate: true };
            }
            // It is PENDING, meaning a previous enqueue attempt failed or it's currently in queue.
            // We will attempt to enqueue it again. BullMQ will deduplicate using jobId.
            interaction = existing;
            console.log(`Recovering stuck PENDING webhook event: ${externalId}`);
        } else {
            interaction = result[0];
        }

        // Trigger AI Processing async via Queue (Guaranteed Delivery)
        try {
            await aiQueue.add('process', { interactionId: interaction.id }, {
                jobId: interaction.id, // Idempotency key to prevent double queueing
                removeOnComplete: true,
                removeOnFail: false,
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 }
            });
        } catch (err) {
            console.error(`Failed to queue interaction ${interaction.id}:`, err);
            // Throwing ensures the controller returns 500, causing the external platform to retry the webhook later
            throw new Error(`Queue Failure: ${err instanceof Error ? err.message : String(err)}`);
        }

        return { success: true, interactionId: interaction.id };
    }

    return { received: true, type: eventType || 'unknown' };
}

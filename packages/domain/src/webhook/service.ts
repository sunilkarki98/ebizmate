import { db } from '@ebizmate/db';
import { workspaces, posts, customers, interactions } from '@ebizmate/db';
import { eq, and } from 'drizzle-orm';
import type { Queue } from 'bullmq';
import { checkInboundRateLimit } from '@ebizmate/shared';
import { normalizeWebhookPayload, type NormalizedWebhookEvent } from './normalizer.js';

export async function handleWebhookEvent(platform: string, payload: any, aiQueue: Queue) {
    // EPIC 13: Normalize the raw platform-specific payload into unified events
    const normalizedEvents = normalizeWebhookPayload(platform, payload);

    if (normalizedEvents.length === 0) {
        console.warn(`[Normalizer] No events extracted from ${platform} webhook`);
        return { received: true, events: 0 };
    }

    const results = [];

    for (const event of normalizedEvents) {
        try {
            const result = await processNormalizedEvent(event, aiQueue);
            results.push(result);
        } catch (err) {
            console.error(`[Webhook] Failed to process event from ${event.platform}:`, err);
            results.push({ error: String(err) });
        }
    }

    return { success: true, events: results.length, results };
}

/**
 * Process a single normalized webhook event.
 * This function is entirely platform-agnostic — it only works with the unified shape.
 */
async function processNormalizedEvent(event: NormalizedWebhookEvent, aiQueue: Queue) {
    const { platform, eventType, platformUserId, userName, text, mediaUrl, externalId, parentPostId, rawPayload } = event;

    if (platformUserId === 'unknown') {
        console.warn(`Missing user ID in ${platform} webhook event`);
        return { error: 'Missing user ID' };
    }

    // Look up workspace by platform user/page ID
    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.platformId, platformUserId),
    });

    if (!workspace) {
        return { error: 'Workspace not found' };
    }

    // Early rejection for inactive/blocked workspaces
    if (workspace.status === 'suspended') {
        return { received: true, blocked: true, reason: 'workspace_suspended' };
    }
    if (workspace.aiBlocked) {
        return { received: true, blocked: true, reason: 'ai_blocked' };
    }

    // Content Indexing (post/video publish events)
    if (eventType === 'post') {
        if (externalId) {
            await db.insert(posts).values({
                workspaceId: workspace.id,
                platformId: externalId,
                content: text,
                meta: rawPayload,
            }).onConflictDoUpdate({
                target: posts.platformId,
                set: { content: text, updatedAt: new Date() }
            });
            console.log(`Indexed content: ${externalId}`);
        }
        return { success: true, type: 'content_indexed' };
    }

    // Interaction Handling (messages and comments)
    if (eventType === 'message' || eventType === 'comment') {
        if (platformUserId !== 'anonymous') {
            const isAllowed = await checkInboundRateLimit(workspace.id, platformUserId);
            if (!isAllowed) {
                console.warn(`[RateLimit] Dropping inbound webhook from user ${platformUserId} (Workspace ${workspace.id})`);
                return { received: true, blocked: true, reason: 'rate_limit_exceeded' };
            }
        }

        let localPostId = null;
        if (parentPostId) {
            const parentPost = await db.query.posts.findFirst({
                where: and(
                    eq(posts.platformId, parentPostId),
                    eq(posts.workspaceId, workspace.id)
                ),
            });
            if (parentPost) {
                localPostId = parentPost.id;
            }
        }

        // Customer tracking
        let customerId: string | null = null;
        if (platformUserId) {
            const [customer] = await db.insert(customers).values({
                workspaceId: workspace.id,
                platformId: platformUserId,
                platformHandle: userName || 'unknown',
                name: userName || 'unknown',
                lastInteractionAt: new Date(),
            }).onConflictDoUpdate({
                target: [customers.workspaceId, customers.platformId],
                set: {
                    platformHandle: userName || undefined,
                    lastInteractionAt: new Date(),
                }
            }).returning({ id: customers.id });
            customerId = customer?.id || null;
        }

        let finalMeta: any = { ...rawPayload, normalizedPlatform: platform };

        // PERF-4: Defer image analysis to the async BullMQ processor
        if (mediaUrl) {
            finalMeta.hasMedia = true;
            finalMeta.originalMediaUrl = mediaUrl;
            finalMeta.pendingImageAnalysis = true;
        }

        const result = await db.insert(interactions).values({
            workspaceId: workspace.id,
            postId: localPostId,
            sourceId: parentPostId || 'dm',
            externalId,
            authorId: platformUserId,
            authorName: userName || 'User',
            customerId,
            content: text,
            meta: finalMeta,
            status: 'PENDING',
        }).onConflictDoNothing({
            target: [interactions.workspaceId, interactions.externalId],
        }).returning();

        let interaction;
        if (result.length === 0) {
            const existing = await db.query.interactions.findFirst({
                where: and(
                    eq(interactions.workspaceId, workspace.id),
                    eq(interactions.externalId, externalId)
                )
            });

            if (!existing || existing.status !== 'PENDING') {
                console.log(`Duplicate webhook event skipped: ${externalId}`);
                return { success: true, duplicate: true };
            }
            interaction = existing;
            console.log(`Recovering stuck PENDING event: ${externalId}`);
        } else {
            interaction = result[0];
        }

        // Trigger AI Processing via Queue
        try {
            await aiQueue.add('process', { interactionId: interaction.id }, {
                jobId: interaction.id,
                removeOnComplete: true,
                removeOnFail: false,
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 }
            });
        } catch (err) {
            console.error(`Failed to queue interaction ${interaction.id}:`, err);
            throw new Error(`Queue Failure: ${err instanceof Error ? err.message : String(err)}`);
        }

        return { success: true, interactionId: interaction.id };
    }

    return { received: true, type: eventType };
}

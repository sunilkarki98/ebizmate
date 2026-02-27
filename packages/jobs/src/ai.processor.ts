import { Processor, WorkerHost, InjectQueue, OnWorkerEvent } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { processInteraction, ingestPost, processBatchIngestion, refreshItemEmbedding, syncHistoricalPosts, summarizeCustomerProfile, processSmartNewProductNotification } from '@ebizmate/domain';
import { db, interactions, workspaces } from '@ebizmate/db';
import { eq } from 'drizzle-orm';
import { dragonfly, isDragonflyAvailable } from '@ebizmate/shared';
import { analyzeImage } from '@ebizmate/domain';

/** Pre-execution check: is the workspace still active and not AI-blocked? */
async function isWorkspaceActive(interactionId: string): Promise<{ active: boolean; workspaceId?: string }> {
    try {
        // PERF-2 FIX: Fetch interaction + workspace in one pass, returning workspaceId
        // so the caller can skip the duplicate DB read downstream.
        const interaction = await db.query.interactions.findFirst({
            where: eq(interactions.id, interactionId),
            columns: { workspaceId: true },
        });
        if (!interaction) return { active: false };

        const workspace = await db.query.workspaces.findFirst({
            where: eq(workspaces.id, interaction.workspaceId),
            columns: { status: true, aiBlocked: true },
        });
        if (!workspace) return { active: false };

        return {
            active: workspace.status !== 'suspended' && !workspace.aiBlocked,
            workspaceId: interaction.workspaceId,
        };
    } catch (err) {
        console.error(`[isWorkspaceActive] Failed to check workspace for interaction ${interactionId}:`, err);
        return { active: false };
    }
}

@Processor('ai', {
    concurrency: 10,
})
export class AiProcessor extends WorkerHost {
    constructor(
        @InjectQueue('ai') private readonly aiQueue: Queue,
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        const { name, data } = job;

        // RESILIENCE: Each job type is wrapped in its own try/catch
        // so one failing job type cannot interfere with processing of other types.
        switch (name) {
            case 'process':
                return this.handleProcess(data);
            case 'initial_sync':
                return this.handleSafely('initial_sync', () => syncHistoricalPosts(data.workspaceId, this.aiQueue));
            case 'ingest':
                return this.handleSafely('ingest', () => ingestPost(data.postId));
            case 'upload_batch':
                return this.handleSafely('upload_batch', () => processBatchIngestion(data.workspaceId, data.sourceId, data.items, this.aiQueue));
            case 'refresh_item_embedding':
                return this.handleSafely('refresh_item_embedding', () => refreshItemEmbedding(data.itemId));
            case 'summarize_profile':
                return this.handleSafely('summarize_profile', () => summarizeCustomerProfile(data.workspaceId, data.customerId));
            case 'smart_notification':
                return this.handleSafely('smart_notification', () => processSmartNewProductNotification(data.workspaceId, data.itemId));
            default:
                console.warn(`Unknown AI job type: ${name}`);
                throw new Error(`Unknown AI job type: ${name}`);
        }
    }

    /**
     * Main interaction processing — with deferred image analysis (PERF-4)
     * and reduced redundant DB reads (PERF-2).
     */
    private async handleProcess(data: { interactionId: string }) {
        try {
            const check = await isWorkspaceActive(data.interactionId);
            if (!check.active) {
                await db.update(interactions)
                    .set({ status: 'IGNORED', response: 'WORKSPACE_BLOCKED', updatedAt: new Date() })
                    .where(eq(interactions.id, data.interactionId));
                return { success: false, reason: 'workspace_blocked' };
            }

            // PERF-4: Handle deferred image analysis before AI processing
            await this.handlePendingImageAnalysis(data.interactionId, check.workspaceId!);

            await processInteraction(data.interactionId);

            // Emit real-time event if escalated (with resilience — failure here shouldn't fail the job)
            try {
                const finalInteraction = await db.query.interactions.findFirst({
                    where: eq(interactions.id, data.interactionId),
                    columns: { status: true, workspaceId: true },
                });
                if (finalInteraction?.status === 'NEEDS_REVIEW' && check.workspaceId) {
                    const workspace = await db.query.workspaces.findFirst({
                        where: eq(workspaces.id, check.workspaceId),
                        columns: { userId: true },
                    });
                    if (workspace?.userId && isDragonflyAvailable() && dragonfly) {
                        await dragonfly.publish('realtime_notifications', JSON.stringify({
                            type: 'escalation',
                            interactionId: data.interactionId,
                            userId: workspace.userId,
                        }));
                    }
                }
            } catch (notifyErr) {
                // RESILIENCE: Real-time notification failure should never crash the job
                console.error(`[AiProcessor] Non-critical: failed to emit escalation event:`, notifyErr);
            }

            return { success: true };
        } catch (error) {
            console.error(`[AiProcessor] process job failed for ${data.interactionId}:`, error);
            throw error; // Re-throw so BullMQ can retry
        }
    }

    /**
     * PERF-4: Analyze images deferred from the webhook path.
     * The webhook saves media URLs in meta.originalMediaUrl with pendingImageAnalysis=true.
     * We process them here, before AI processing, so the LLM sees the image description.
     */
    private async handlePendingImageAnalysis(interactionId: string, workspaceId: string) {
        try {
            const interaction = await db.query.interactions.findFirst({
                where: eq(interactions.id, interactionId),
                columns: { meta: true, content: true },
            });
            if (!interaction) return;

            const meta = interaction.meta as Record<string, any> | null;
            if (!meta?.pendingImageAnalysis || !meta?.originalMediaUrl) return;

            const imageDescription = await analyzeImage(workspaceId, meta.originalMediaUrl);
            if (imageDescription) {
                const updatedContent = `[Attached Image: ${imageDescription}]\n${interaction.content || ''}`.trim();
                await db.update(interactions).set({
                    content: updatedContent,
                    meta: { ...meta, pendingImageAnalysis: false, imageDescription },
                    updatedAt: new Date(),
                }).where(eq(interactions.id, interactionId));
            }
        } catch (err) {
            // RESILIENCE: Image analysis failure should not block AI processing
            console.error(`[AiProcessor] Image analysis failed (non-blocking):`, err);
        }
    }

    /**
     * RESILIENCE: Generic wrapper that isolates each job type.
     * Failure in one job type cannot cascade to others.
     */
    private async handleSafely(jobType: string, fn: () => Promise<any>) {
        try {
            await fn();
            return { success: true };
        } catch (error) {
            console.error(`[AiProcessor] ${jobType} failed:`, error);
            throw error; // Re-throw for BullMQ retry
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, error: Error) {
        console.error(`🚨 [BullMQ] Job ${job.id} of type ${job.name} failed after ${job.attemptsMade} attempts:`, error.message);
    }
}

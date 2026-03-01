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

async function handleSafely(jobType: string, fn: () => Promise<any>) {
    try {
        await fn();
        return { success: true };
    } catch (error) {
        console.error(`[Processor] ${jobType} failed:`, error);
        throw error; // Re-throw for BullMQ retry, which goes to DLQ if max attempts reached
    }
}

async function handleDLQ(job: Job, error: Error, queueName: string) {
    if (job.attemptsMade >= (job.opts.attempts || 1)) {
        console.error(`🚨 [DLQ] Job ${job.id} (${job.name}) from ${queueName} permanently failed after ${job.attemptsMade} attempts. Error: ${error.message}`);

        if (isDragonflyAvailable() && dragonfly) {
            try {
                const dlqEntry = {
                    jobId: job.id,
                    name: job.name,
                    queue: queueName,
                    data: job.data,
                    error: error.message,
                    stack: error.stack,
                    failedAt: new Date().toISOString(),
                };
                // Push to a Redis list acting as a DLQ
                await dragonfly.lpush('ai:dlq', JSON.stringify(dlqEntry));
                // Keep max 1000 items in DLQ
                await dragonfly.ltrim('ai:dlq', 0, 999);
            } catch (dlqErr) {
                console.error(`Failed to push job ${job.id} to DLQ:`, dlqErr);
            }
        }
    } else {
        console.warn(`⚠️ [BullMQ] Job ${job.id} (${job.name}) in ${queueName} failed (Attempt ${job.attemptsMade} of ${job.opts.attempts || 1}): ${error.message}`);
    }
}

// =========================================================================
// 1. HIGH PRIORITY: Customer Chat & Real-Time Processing
// =========================================================================
@Processor('ai-process', { concurrency: 50 })
export class AiProcessProcessor extends WorkerHost {
    constructor(@InjectQueue('ai-process') private readonly aiQueue: Queue) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        const { name, data } = job;
        switch (name) {
            case 'process':
                return this.handleProcess(data);
            case 'smart_notification': // Time sensitive
                return handleSafely('smart_notification', () => processSmartNewProductNotification(data.workspaceId, data.itemId));
            default:
                throw new Error(`Unknown high-priority job type: ${name}`);
        }
    }

    private async handleProcess(data: { interactionId: string }) {
        try {
            const check = await isWorkspaceActive(data.interactionId);
            if (!check.active) {
                await db.update(interactions)
                    .set({ status: 'IGNORED', response: 'WORKSPACE_BLOCKED', updatedAt: new Date() })
                    .where(eq(interactions.id, data.interactionId));
                return { success: false, reason: 'workspace_blocked' };
            }

            await this.handlePendingImageAnalysis(data.interactionId, check.workspaceId!);
            await processInteraction(data.interactionId);

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
                console.error(`[AiProcessProcessor] Non-critical: failed to emit escalation event:`, notifyErr);
            }

            return { success: true };
        } catch (error) {
            console.error(`[AiProcessProcessor] process job failed for ${data.interactionId}:`, error);
            throw error;
        }
    }

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
            console.error(`[AiProcessProcessor] Image analysis failed (non-blocking):`, err);
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, error: Error) {
        handleDLQ(job, error, 'ai-process');
    }
}

// =========================================================================
// 2. MEDIUM PRIORITY: Single Ingestions & Maintenance
// =========================================================================
@Processor('ai-ingest', { concurrency: 20 })
export class AiIngestProcessor extends WorkerHost {
    constructor(@InjectQueue('ai-ingest') private readonly aiQueue: Queue) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        const { name, data } = job;
        switch (name) {
            case 'ingest':
                return handleSafely('ingest', () => ingestPost(data.postId));
            case 'refresh_item_embedding':
                return handleSafely('refresh_item_embedding', () => refreshItemEmbedding(data.itemId));
            case 'summarize_profile':
                return handleSafely('summarize_profile', () => summarizeCustomerProfile(data.workspaceId, data.customerId));
            default:
                throw new Error(`Unknown ingest job type: ${name}`);
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, error: Error) {
        handleDLQ(job, error, 'ai-ingest');
    }
}

// =========================================================================
// 3. LOW PRIORITY: Batch Imports (Prevents starving real-time chats)
// =========================================================================
@Processor('ai-batch', { concurrency: 5 }) // Low concurrency to protect DB connection pool
export class AiBatchProcessor extends WorkerHost {
    constructor(@InjectQueue('ai-batch') private readonly aiQueue: Queue) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        const { name, data } = job;
        switch (name) {
            case 'upload_batch':
                return handleSafely('upload_batch', () => processBatchIngestion(data.workspaceId, data.sourceId, data.items, this.aiQueue));
            case 'initial_sync':
                return handleSafely('initial_sync', () => syncHistoricalPosts(data.workspaceId, this.aiQueue));
            default:
                throw new Error(`Unknown batch job type: ${name}`);
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, error: Error) {
        handleDLQ(job, error, 'ai-batch');
    }
}

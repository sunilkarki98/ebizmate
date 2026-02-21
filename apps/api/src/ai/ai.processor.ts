import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('ai')
export class AiProcessor extends WorkerHost {
    async process(job: Job<any, any, string>): Promise<any> {
        const { name, data } = job;

        try {
            switch (name) {
                case 'process': {
                    // Lazy load to avoid circular dependency issues at boot
                    const { processInteraction } = await import('./customer/processor.js');
                    await processInteraction(data.interactionId);
                    return { success: true };
                }
                case 'ingest': {
                    const { ingestPost } = await import('./services/ingestion.js');
                    await ingestPost(data.postId);
                    return { success: true };
                }
                case 'upload_batch': {
                    const { processBatchIngestion } = await import('./services/batch.js');
                    await processBatchIngestion(data.workspaceId, data.sourceId, data.items);
                    return { success: true };
                }
                default:
                    console.warn(`Unknown AI job type: ${name}`);
                    throw new Error(`Unknown AI job type: ${name}`);
            }
        } catch (error) {
            console.error(`AI Processor error on job ${job.id} [${name}]:`, error);
            throw error; // Re-throw allows BullMQ to retry or mark failed
        }
    }
}

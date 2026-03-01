import { Controller, Get, ServiceUnavailableException, Logger, UseGuards } from '@nestjs/common';
import { db } from '@ebizmate/db';
import { sql } from 'drizzle-orm';
import { dragonfly } from '@ebizmate/shared';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InternalNetworkGuard } from '../common/guards/internal-network.guard';

@Controller('health')
@UseGuards(InternalNetworkGuard)
export class HealthController {
    private readonly logger = new Logger(HealthController.name);

    constructor(
        @InjectQueue('ai-process') private readonly aiProcessQueue: Queue,
        @InjectQueue('ai-ingest') private readonly aiIngestQueue: Queue,
        @InjectQueue('ai-batch') private readonly aiBatchQueue: Queue,
    ) { }

    @Get()
    async check() {
        const metrics = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            db: 'unknown',
            redis: 'unknown',
            queues: {
                processWaiting: -1,
                ingestWaiting: -1,
                batchWaiting: -1,
            }
        };

        try {
            // Check Database Connection Pool
            await db.execute(sql`SELECT 1`);
            metrics.db = 'connected';

            // Check Dragonfly Cache
            const ping = await dragonfly.ping();
            if (ping === 'PONG') {
                metrics.redis = 'connected';
            } else {
                throw new Error('Redis ping failed');
            }

            // Check BullMQ Starvation / Backups
            metrics.queues.processWaiting = await this.aiProcessQueue.getWaitingCount();
            metrics.queues.ingestWaiting = await this.aiIngestQueue.getWaitingCount();
            metrics.queues.batchWaiting = await this.aiBatchQueue.getWaitingCount();

            return metrics;
        } catch (error: any) {
            this.logger.error(`Health check failed: ${error.message}`, error.stack);
            metrics.status = 'error';
            throw new ServiceUnavailableException(metrics);
        }
    }
}

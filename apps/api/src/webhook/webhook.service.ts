import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import * as DomainWebhookService from '@ebizmate/domain';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class WebhookService {
    private readonly logger = new Logger(WebhookService.name);

    constructor(
        @InjectQueue('ai') private readonly aiQueue: Queue,
    ) { }

    async handleWebhookEvent(platform: string, payload: any) {
        // Enforce Backpressure: Protect Dragonfly RAM from catastrophic webhook floods
        const waitingCount = await this.aiQueue.getWaitingCount();
        if (waitingCount > 10000) {
            this.logger.warn(`[Backpressure] Rejecting webhook: Queue limit exceeded (${waitingCount} pending jobs)`);
            throw new HttpException('Too Many Requests: AI processing queue is at capacity', HttpStatus.TOO_MANY_REQUESTS);
        }

        return DomainWebhookService.handleWebhookEvent(platform, payload, this.aiQueue);
    }
}

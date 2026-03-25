import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { InternalSecretGuard } from '../common/guards/internal-secret.guard';

import { BullModule } from '@nestjs/bullmq';
import { getDragonflyConfig } from '@ebizmate/shared';

@Module({
    imports: [
        BullModule.forRoot({
            connection: getDragonflyConfig(),
        }),
        BullModule.registerQueue(
            { name: 'ai-process' },
            { name: 'ai-ingest' },
            { name: 'ai-batch' }
        ),
    ],
    controllers: [WebhookController],
    providers: [WebhookService, InternalSecretGuard],
})
export class WebhookModule { }

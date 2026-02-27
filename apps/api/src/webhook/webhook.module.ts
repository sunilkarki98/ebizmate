import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

import { BullModule } from '@nestjs/bullmq';
import { getDragonflyConfig } from '@ebizmate/shared';

@Module({
    imports: [
        BullModule.forRoot({
            connection: getDragonflyConfig(),
        }),
        BullModule.registerQueue({
            name: 'ai',
        }),
    ],
    controllers: [WebhookController],
    providers: [WebhookService],
})
export class WebhookModule { }

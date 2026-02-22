import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { AiModule } from '../ai/ai.module';

import { BullModule } from '@nestjs/bullmq';

@Module({
    imports: [
        AiModule,
        BullModule.registerQueue({ name: 'ai' })
    ],
    controllers: [WebhookController],
    providers: [WebhookService],
})
export class WebhookModule { }

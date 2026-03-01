import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { BullModule } from '@nestjs/bullmq';

@Module({
    imports: [
        BullModule.registerQueue(
            { name: 'ai-process' },
            { name: 'ai-ingest' },
            { name: 'ai-batch' },
        ),
    ],
    controllers: [HealthController],
})
export class HealthModule { }

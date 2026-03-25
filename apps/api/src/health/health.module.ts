import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PingController } from './ping.controller';
import { BullModule } from '@nestjs/bullmq';

@Module({
    imports: [
        BullModule.registerQueue(
            { name: 'ai-process' },
            { name: 'ai-ingest' },
            { name: 'ai-batch' },
        ),
    ],
    controllers: [HealthController, PingController],
})
export class HealthModule { }

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiController } from './ai.controller';
import { CustomerController } from './customer.controller';
import { AiService } from './ai.service';
import { AiProcessProcessor, AiIngestProcessor, AiBatchProcessor, ScheduledProcessor, ScheduledWorker } from '@ebizmate/jobs';
import { getDragonflyConfig } from '@ebizmate/shared';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        BullModule.forRoot({
            connection: getDragonflyConfig(),
        }),
        BullModule.registerQueue(
            {
                name: 'ai-process',
                defaultJobOptions: {
                    removeOnComplete: true, // Don't store successful jobs
                    removeOnFail: {
                        age: 7 * 24 * 3600, // Hard purge failed jobs after 7 days
                        count: 1000, // Maximum of 1000 failed jobs stored in RAM
                    },
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 2000 },
                }
            },
            {
                name: 'ai-ingest',
                defaultJobOptions: {
                    removeOnComplete: true,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                }
            },
            {
                name: 'ai-batch',
                defaultJobOptions: {
                    removeOnComplete: true,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 10000 },
                }
            },
            {
                name: 'scheduled',
                defaultJobOptions: {
                    removeOnComplete: true,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                }
            }
        ),
        NotificationsModule,
    ],
    controllers: [AiController, CustomerController],
    providers: [AiService, AiProcessProcessor, AiIngestProcessor, AiBatchProcessor, ScheduledProcessor, ScheduledWorker],
    exports: [AiService],
})
export class AiModule { }

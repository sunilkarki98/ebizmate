import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiController } from './ai.controller';
import { CustomerController } from './customer.controller';
import { AiService } from './ai.service';
import { AiProcessor, ScheduledProcessor } from '@ebizmate/jobs';
import { getDragonflyConfig } from '@ebizmate/shared';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        BullModule.forRoot({
            connection: getDragonflyConfig(),
        }),
        BullModule.registerQueue({
            name: 'ai',
            defaultJobOptions: {
                removeOnComplete: true, // Don't store successful jobs
                removeOnFail: {
                    age: 7 * 24 * 3600, // Hard purge failed jobs after 7 days
                    count: 1000, // Maximum of 1000 failed jobs stored in RAM
                },
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
            }
        }),
        NotificationsModule,
    ],
    controllers: [AiController, CustomerController],
    providers: [AiService, AiProcessor, ScheduledProcessor],
    exports: [AiService],
})
export class AiModule { }

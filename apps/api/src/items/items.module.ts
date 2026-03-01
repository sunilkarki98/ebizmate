import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { BullModule } from '@nestjs/bullmq';
import { AiModule } from '../ai/ai.module';
import { getDragonflyConfig } from '@ebizmate/shared';

@Module({
    imports: [
        AiModule,
        BullModule.forRoot({
            connection: getDragonflyConfig(),
        }),
        BullModule.registerQueue(
            { name: 'ai-process' },
            { name: 'ai-ingest' },
            { name: 'ai-batch' }
        ),
    ],
    controllers: [ItemsController],
    providers: [ItemsService],
})
export class ItemsModule { }

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { getDragonflyConfig } from '@ebizmate/shared';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
    imports: [
        BullModule.forRoot({
            connection: getDragonflyConfig(),
        }),
        BullModule.registerQueue({
            name: 'ai',
        }),
    ],
    controllers: [SettingsController],
    providers: [SettingsService],
})
export class SettingsModule { }

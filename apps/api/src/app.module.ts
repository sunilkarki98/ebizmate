import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { HealthModule } from './health/health.module';
import { SettingsModule } from './settings/settings.module';
import { WebhookModule } from './webhook/webhook.module';
import { ItemsModule } from './items/items.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    AiModule,
    HealthModule,
    SettingsModule,
    WebhookModule,
    ItemsModule,
    AdminModule,
    NotificationsModule,
  ],
})
export class AppModule { }

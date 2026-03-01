import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { HealthModule } from './health/health.module';
import { SettingsModule } from './settings/settings.module';
import { WebhookModule } from './webhook/webhook.module';
import { ItemsModule } from './items/items.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ScheduleModule } from '@nestjs/schedule';
import { InboxModule } from './inbox/inbox.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
        autoLogging: false,
      },
    }),
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 1000,
      limit: 5,
    }, {
      name: 'default',
      ttl: 60000,
      limit: 60,
    }]),
    ScheduleModule.forRoot(),
    AuthModule,
    AiModule,
    HealthModule,
    SettingsModule,
    WebhookModule,
    ItemsModule,
    AdminModule,
    NotificationsModule,
    DashboardModule,
    InboxModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }

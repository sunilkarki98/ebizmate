import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as DomainNotificationsService from '@ebizmate/domain';
import { Subject, Observable } from 'rxjs';
import { getDragonflyConfig } from '@ebizmate/shared';
import { Redis } from 'ioredis';

export interface NotificationEvent {
    type: 'new_notification';
    data: any;
    userId: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(NotificationsService.name);
    private notificationSubject = new Subject<NotificationEvent>();
    private redisSub: Redis | null = null;
    private redisErrorLogged = false;

    onModuleInit() {
        try {
            const config = getDragonflyConfig();
            this.redisSub = new Redis({
                ...config,
                maxRetriesPerRequest: null,
                retryStrategy: (times: number) => {
                    if (times > 10) {
                        this.logger.warn('Redis subscriber giving up after 10 retries');
                        return null;
                    }
                    return Math.min(times * 1000, 10000);
                },
            });

            this.redisSub.on('error', (err) => {
                if (!this.redisErrorLogged) {
                    this.logger.warn(`Redis subscriber error: ${err.message}`);
                    this.redisErrorLogged = true;
                }
            });

            this.redisSub.on('connect', () => {
                this.redisErrorLogged = false;
                this.logger.log('Redis subscriber connected');
            });

            this.redisSub.subscribe('realtime_notifications', (err) => {
                if (err) this.logger.error('Failed to subscribe to realtime_notifications:', err.message);
                else this.logger.log('Subscribed to realtime_notifications channel');
            });

            this.redisSub.on('message', (channel, message) => {
                if (channel === 'realtime_notifications') {
                    try {
                        const parsed = JSON.parse(message);
                        if (parsed.userId) {
                            this.emitNotification(parsed.userId, parsed);
                        }
                    } catch (e) {
                        this.logger.error('Invalid notification payload:', message);
                    }
                }
            });
        } catch (err: any) {
            this.logger.warn(`Redis subscriber init failed: ${err.message}. SSE notifications will not work.`);
        }
    }

    onModuleDestroy() {
        this.redisSub?.disconnect();
    }

    async getNotifications(userId: string, limit: number) {
        return DomainNotificationsService.getNotifications(userId, limit);
    }

    emitNotification(userId: string, data: any) {
        this.notificationSubject.next({ type: 'new_notification', userId, data });
    }

    subscribeToNotifications(): Observable<NotificationEvent> {
        return this.notificationSubject.asObservable();
    }
}


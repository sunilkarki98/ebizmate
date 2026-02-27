import { Controller, Get, Query, UseGuards, Req, Sse } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    async getNotifications(
        @Req() req: AuthenticatedRequest,
        @Query('limit') limitArg?: string,
    ) {
        const limit = limitArg ? parseInt(limitArg, 10) : 20;
        const bounded = isNaN(limit) ? 20 : Math.min(Math.max(limit, 1), 100);
        return this.notificationsService.getNotifications(req.user.userId, bounded);
    }

    @Sse('stream')
    streamNotifications(@Req() req: AuthenticatedRequest): Observable<MessageEvent> {
        return this.notificationsService.subscribeToNotifications().pipe(
            // Only send events that belong to the connected user
            filter(event => event.userId === req.user.userId),
            // Map the event into a standard SSE MessageEvent
            map(event => ({
                data: event.data,
            }) as MessageEvent),
        );
    }
}

import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

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
        return this.notificationsService.getNotifications(req.user.userId, isNaN(limit) ? 20 : limit);
    }
}

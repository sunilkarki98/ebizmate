import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthSyncService } from './auth-sync.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { SyncProfileDto } from './sync-profile.schema';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@Controller('auth')
export class AuthSyncController {
    constructor(private readonly authSyncService: AuthSyncService) { }

    @UseGuards(JwtAuthGuard)
    @Post('sync')
    async syncProfile(@Req() req: AuthenticatedRequest, @Body() body: SyncProfileDto) {
        const userId = req.user.sub || req.user.userId;

        return this.authSyncService.syncUser(
            userId,
            body.email,
            body.name,
            body.image
        );
    }
}

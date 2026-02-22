import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthSyncService } from './auth-sync.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { SyncProfileDto } from './sync-profile.dto';

@Controller('auth')
export class AuthSyncController {
    constructor(private readonly authSyncService: AuthSyncService) { }

    @UseGuards(JwtAuthGuard)
    @Post('sync')
    async syncProfile(@Req() req: any, @Body() body: SyncProfileDto) {
        // The user ID should come from the validated JWT token provided by Supabase
        const userId = req.user.sub || req.user.id;

        return this.authSyncService.syncUser(
            userId,
            body.email,
            body.name,
            body.image
        );
    }
}

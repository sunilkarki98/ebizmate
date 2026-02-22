import { Controller, Put, Get, Body, UseGuards, Req } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateIdentityDto } from './dto/update-identity.dto';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get('workspace')
    async getWorkspace(@Req() req: AuthenticatedRequest) {
        return this.settingsService.getWorkspace(req.user.userId);
    }

    @Get('workspace-detailed')
    async getWorkspaceDetailed(@Req() req: AuthenticatedRequest) {
        return this.settingsService.getWorkspaceDetailed(req.user.userId);
    }

    @Put('identity')
    async updateIdentity(
        @Req() req: AuthenticatedRequest,
        @Body() dto: UpdateIdentityDto
    ) {
        return this.settingsService.updateIdentity(req.user.userId, dto);
    }

    @Put('profile')
    async updateProfile(
        @Req() req: AuthenticatedRequest,
        @Body() dto: UpdateProfileDto
    ) {
        return this.settingsService.updateProfile(req.user.userId, dto);
    }

    @Put('ai')
    async updateAiSettings(
        @Req() req: AuthenticatedRequest,
        @Body() dto: UpdateAiSettingsDto
    ) {
        return this.settingsService.updateAiSettings(req.user.userId, dto);
    }
}

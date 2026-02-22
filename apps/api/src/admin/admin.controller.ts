import { Controller, Get, Post, Put, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    private getAdminId(req: any) {
        return req.user.sub || req.user.id;
    }

    @Get('analytics')
    async getAnalytics() {
        return this.adminService.getAnalytics();
    }

    @Get('users')
    async getUsers() {
        return this.adminService.getUsers();
    }

    @Put('users/:id/role')
    async updateUserRole(@Req() req: any, @Param('id') userId: string, @Body('role') role: 'admin' | 'user') {
        const adminId = this.getAdminId(req);
        return this.adminService.updateUserRole(adminId, userId, role);
    }

    @Get('workspaces')
    async getWorkspaces() {
        return this.adminService.getWorkspaces();
    }

    @Put('workspaces/:id/global-ai')
    async toggleGlobalAiAccess(@Req() req: any, @Param('id') workspaceId: string, @Body('allowed') allowed: boolean) {
        const adminId = this.getAdminId(req);
        return this.adminService.toggleGlobalAiAccess(adminId, workspaceId, allowed);
    }

    @Put('workspaces/:id/plan')
    async updateWorkspacePlan(@Req() req: any, @Param('id') workspaceId: string, @Body() data: any) {
        const adminId = this.getAdminId(req);
        return this.adminService.updateWorkspacePlan(adminId, workspaceId, data);
    }

    @Get('escalations')
    async getEscalations() {
        return this.adminService.getEscalations();
    }

    @Post('escalations/:id/resolve')
    async resolveEscalation(@Req() req: any, @Param('id') interactionId: string) {
        const adminId = this.getAdminId(req);
        return this.adminService.resolveEscalation(adminId, interactionId);
    }

    @Get('webhooks')
    async getWebhooks() {
        return this.adminService.getWebhooks();
    }

    @Get('webhooks/secrets')
    async getWebhookSecrets() {
        return this.adminService.getWebhookSecrets();
    }

    @Get('audit-logs')
    async getAuditLogs() {
        return this.adminService.getAuditLogs();
    }

    @Get('overview')
    async getAdminOverview() {
        return this.adminService.getAdminOverview();
    }

    @Post('customers/pause')
    async toggleAiPause(@Req() req: any, @Body() body: { workspaceId: string, platformId: string }) {
        const adminId = this.getAdminId(req);
        return this.adminService.toggleAiPause(adminId, body.workspaceId, body.platformId);
    }

    @Get('ai-settings')
    async getAISettings() {
        return this.adminService.getAISettings();
    }

    @Put('ai-settings')
    async updateAISettings(@Req() req: any, @Body() body: any) {
        const adminId = this.getAdminId(req);
        return this.adminService.updateAISettings(adminId, body);
    }

    @Get('usage-stats')
    async getUsageStats() {
        return this.adminService.getUsageStats();
    }

    @Post('fetch-models')
    async fetchAvailableModels(@Body() body: { provider: string, apiKey: string }) {
        return this.adminService.fetchAvailableModels(body.provider, body.apiKey);
    }
}

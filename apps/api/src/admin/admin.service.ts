import { Injectable, Logger } from '@nestjs/common';
import { AdminDomain } from '@ebizmate/domain';
import type { WorkspacePlanDto, UpdateAiSettingsDto } from '@ebizmate/contracts';
import { AiService } from '../ai/ai.service';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(private readonly aiService: AiService) { }

    async getAnalytics() {
        return AdminDomain.getAnalytics();
    }

    async getUsers() {
        return AdminDomain.getUsers();
    }

    async updateUserRole(adminId: string, userId: string, newRole: "admin" | "user") {
        return AdminDomain.updateUserRole(adminId, userId, newRole);
    }

    async getWorkspaces() {
        return AdminDomain.getWorkspaces();
    }

    async toggleGlobalAiAccess(adminId: string, workspaceId: string, allowed: boolean) {
        return AdminDomain.toggleGlobalAiAccess(adminId, workspaceId, allowed);
    }

    async toggleAiBlocked(adminId: string, workspaceId: string, blocked: boolean) {
        return AdminDomain.toggleAiBlocked(adminId, workspaceId, blocked);
    }

    async updateWorkspacePlan(adminId: string, workspaceId: string, data: WorkspacePlanDto) {
        try {
            return await AdminDomain.updateWorkspacePlan(adminId, workspaceId, data);
        } catch (error) {
            this.logger.error(`Failed to update workspace plan for ${workspaceId}:`, error);
            throw error;
        }
    }

    async getEscalations() {
        return AdminDomain.getEscalations();
    }

    async resolveEscalation(adminId: string, interactionId: string) {
        return AdminDomain.resolveEscalation(adminId, interactionId);
    }

    async getWebhooks() {
        return AdminDomain.getWebhooks();
    }

    async getWebhookSecrets() {
        return AdminDomain.getWebhookSecrets();
    }

    async getAuditLogs() {
        return AdminDomain.getAuditLogs();
    }

    async getAdminOverview() {
        return AdminDomain.getAdminOverview();
    }

    async toggleAiPause(adminId: string, workspaceId: string, platformId: string) {
        return AdminDomain.toggleAiPause(adminId, workspaceId, platformId);
    }

    async getAISettings() {
        return AdminDomain.getAISettings();
    }

    async updateAISettings(adminId: string, data: UpdateAiSettingsDto) {
        return AdminDomain.updateAISettings(adminId, data);
    }

    async getUsageStats() {
        return AdminDomain.getUsageStats();
    }

    async fetchAvailableModels(provider: string, apiKey: string) {
        return AdminDomain.fetchAvailableModels(provider, apiKey);
    }
}


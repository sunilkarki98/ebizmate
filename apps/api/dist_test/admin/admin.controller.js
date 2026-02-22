"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const admin_guard_1 = require("../auth/admin.guard");
let AdminController = class AdminController {
    adminService;
    constructor(adminService) {
        this.adminService = adminService;
    }
    getAdminId(req) {
        return req.user.sub || req.user.id;
    }
    async getAnalytics() {
        return this.adminService.getAnalytics();
    }
    async getUsers() {
        return this.adminService.getUsers();
    }
    async updateUserRole(req, userId, role) {
        const adminId = this.getAdminId(req);
        return this.adminService.updateUserRole(adminId, userId, role);
    }
    async getWorkspaces() {
        return this.adminService.getWorkspaces();
    }
    async toggleGlobalAiAccess(req, workspaceId, allowed) {
        const adminId = this.getAdminId(req);
        return this.adminService.toggleGlobalAiAccess(adminId, workspaceId, allowed);
    }
    async updateWorkspacePlan(req, workspaceId, data) {
        const adminId = this.getAdminId(req);
        return this.adminService.updateWorkspacePlan(adminId, workspaceId, data);
    }
    async getEscalations() {
        return this.adminService.getEscalations();
    }
    async resolveEscalation(req, interactionId) {
        const adminId = this.getAdminId(req);
        return this.adminService.resolveEscalation(adminId, interactionId);
    }
    async getWebhooks() {
        return this.adminService.getWebhooks();
    }
    async getWebhookSecrets() {
        return this.adminService.getWebhookSecrets();
    }
    async getAuditLogs() {
        return this.adminService.getAuditLogs();
    }
    async getAdminOverview() {
        return this.adminService.getAdminOverview();
    }
    async toggleAiPause(req, body) {
        const adminId = this.getAdminId(req);
        return this.adminService.toggleAiPause(adminId, body.workspaceId, body.platformId);
    }
    async getAISettings() {
        return this.adminService.getAISettings();
    }
    async updateAISettings(req, body) {
        const adminId = this.getAdminId(req);
        return this.adminService.updateAISettings(adminId, body);
    }
    async getUsageStats() {
        return this.adminService.getUsageStats();
    }
    async fetchAvailableModels(body) {
        return this.adminService.fetchAvailableModels(body.provider, body.apiKey);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('analytics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Get)('users'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Put)('users/:id/role'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUserRole", null);
__decorate([
    (0, common_1.Get)('workspaces'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getWorkspaces", null);
__decorate([
    (0, common_1.Put)('workspaces/:id/global-ai'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('allowed')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Boolean]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "toggleGlobalAiAccess", null);
__decorate([
    (0, common_1.Put)('workspaces/:id/plan'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateWorkspacePlan", null);
__decorate([
    (0, common_1.Get)('escalations'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getEscalations", null);
__decorate([
    (0, common_1.Post)('escalations/:id/resolve'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "resolveEscalation", null);
__decorate([
    (0, common_1.Get)('webhooks'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getWebhooks", null);
__decorate([
    (0, common_1.Get)('webhooks/secrets'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getWebhookSecrets", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Get)('overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAdminOverview", null);
__decorate([
    (0, common_1.Post)('customers/pause'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "toggleAiPause", null);
__decorate([
    (0, common_1.Get)('ai-settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAISettings", null);
__decorate([
    (0, common_1.Put)('ai-settings'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateAISettings", null);
__decorate([
    (0, common_1.Get)('usage-stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUsageStats", null);
__decorate([
    (0, common_1.Post)('fetch-models'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "fetchAvailableModels", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map
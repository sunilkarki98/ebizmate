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
exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const settings_service_1 = require("./settings.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const update_identity_dto_1 = require("./dto/update-identity.dto");
const update_ai_settings_dto_1 = require("./dto/update-ai-settings.dto");
const update_profile_dto_1 = require("./dto/update-profile.dto");
let SettingsController = class SettingsController {
    settingsService;
    constructor(settingsService) {
        this.settingsService = settingsService;
    }
    async getWorkspace(req) {
        return this.settingsService.getWorkspace(req.user.userId);
    }
    async getWorkspaceDetailed(req) {
        return this.settingsService.getWorkspaceDetailed(req.user.userId);
    }
    async updateIdentity(req, dto) {
        return this.settingsService.updateIdentity(req.user.userId, dto);
    }
    async updateProfile(req, dto) {
        return this.settingsService.updateProfile(req.user.userId, dto);
    }
    async updateAiSettings(req, dto) {
        return this.settingsService.updateAiSettings(req.user.userId, dto);
    }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, common_1.Get)('workspace'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getWorkspace", null);
__decorate([
    (0, common_1.Get)('workspace-detailed'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getWorkspaceDetailed", null);
__decorate([
    (0, common_1.Put)('identity'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_identity_dto_1.UpdateIdentityDto]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "updateIdentity", null);
__decorate([
    (0, common_1.Put)('profile'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Put)('ai'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_ai_settings_dto_1.UpdateAiSettingsDto]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "updateAiSettings", null);
exports.SettingsController = SettingsController = __decorate([
    (0, common_1.Controller)('settings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [settings_service_1.SettingsService])
], SettingsController);
//# sourceMappingURL=settings.controller.js.map
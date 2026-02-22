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
exports.AuthSyncController = void 0;
const common_1 = require("@nestjs/common");
const auth_sync_service_1 = require("./auth-sync.service");
const jwt_auth_guard_1 = require("../jwt-auth.guard");
const sync_profile_dto_1 = require("./sync-profile.dto");
let AuthSyncController = class AuthSyncController {
    authSyncService;
    constructor(authSyncService) {
        this.authSyncService = authSyncService;
    }
    async syncProfile(req, body) {
        // The user ID should come from the validated JWT token provided by Supabase
        const userId = req.user.sub || req.user.id;
        return this.authSyncService.syncUser(userId, body.email, body.name, body.image);
    }
};
exports.AuthSyncController = AuthSyncController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('sync'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, sync_profile_dto_1.SyncProfileDto]),
    __metadata("design:returntype", Promise)
], AuthSyncController.prototype, "syncProfile", null);
exports.AuthSyncController = AuthSyncController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_sync_service_1.AuthSyncService])
], AuthSyncController);
//# sourceMappingURL=auth-sync.controller.js.map
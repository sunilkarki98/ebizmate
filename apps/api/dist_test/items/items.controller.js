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
exports.ItemsController = void 0;
const common_1 = require("@nestjs/common");
const items_service_1 = require("./items.service");
const create_item_dto_1 = require("./dto/create-item.dto");
const update_item_dto_1 = require("./dto/update-item.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let ItemsController = class ItemsController {
    itemsService;
    constructor(itemsService) {
        this.itemsService = itemsService;
    }
    // Utility: Ensure we get a workspace for the authenticated user
    async resolveWorkspaceId(req) {
        const userId = req.user.userId;
        const workspace = await this.itemsService.getWorkspace(userId, req.user.email, req.user.name);
        if (!workspace)
            throw new common_1.UnauthorizedException('No workspace found');
        return workspace.id;
    }
    async getWorkspaceInfo(req) {
        const userId = req.user.userId;
        return this.itemsService.getWorkspace(userId, req.user.email, req.user.name);
    }
    async getAllItems(req) {
        const workspaceId = await this.resolveWorkspaceId(req);
        return this.itemsService.getWorkspaceItems(workspaceId);
    }
    async getRecentPosts(req, limit) {
        const workspaceId = await this.resolveWorkspaceId(req);
        return this.itemsService.getRecentPosts(workspaceId, limit ? parseInt(limit, 10) : 12);
    }
    async createItem(req, dto) {
        const workspaceId = await this.resolveWorkspaceId(req);
        return this.itemsService.createItem(workspaceId, dto);
    }
    async updateItem(req, id, dto) {
        const workspaceId = await this.resolveWorkspaceId(req);
        return this.itemsService.updateItem(workspaceId, id, dto);
    }
    async deleteItem(req, id) {
        const workspaceId = await this.resolveWorkspaceId(req);
        return this.itemsService.deleteItem(workspaceId, id);
    }
};
exports.ItemsController = ItemsController;
__decorate([
    (0, common_1.Get)('workspace'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ItemsController.prototype, "getWorkspaceInfo", null);
__decorate([
    (0, common_1.Get)('all'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ItemsController.prototype, "getAllItems", null);
__decorate([
    (0, common_1.Get)('posts'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ItemsController.prototype, "getRecentPosts", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_item_dto_1.CreateItemDto]),
    __metadata("design:returntype", Promise)
], ItemsController.prototype, "createItem", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_item_dto_1.UpdateItemDto]),
    __metadata("design:returntype", Promise)
], ItemsController.prototype, "updateItem", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ItemsController.prototype, "deleteItem", null);
exports.ItemsController = ItemsController = __decorate([
    (0, common_1.Controller)('items'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [items_service_1.ItemsService])
], ItemsController);
//# sourceMappingURL=items.controller.js.map
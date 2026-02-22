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
exports.CustomerController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const db_1 = require("@ebizmate/db");
const db_2 = require("@ebizmate/db");
const drizzle_orm_1 = require("drizzle-orm");
let CustomerController = class CustomerController {
    async getConversation(req, platformId) {
        try {
            const userId = req.user.userId;
            const workspace = await db_1.db.query.workspaces.findFirst({
                where: (0, drizzle_orm_1.eq)(db_2.workspaces.userId, userId),
            });
            if (!workspace)
                throw new Error("Workspace not found");
            const customer = await db_1.db.query.customers.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.customers.workspaceId, workspace.id), (0, drizzle_orm_1.eq)(db_2.customers.platformId, platformId)),
                with: {
                    workspace: true,
                },
            });
            if (!customer)
                throw new Error("Customer not found");
            const history = await db_1.db.query.interactions.findMany({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.interactions.workspaceId, workspace.id), (0, drizzle_orm_1.eq)(db_2.interactions.authorId, platformId)),
                orderBy: (0, drizzle_orm_1.asc)(db_2.interactions.createdAt),
                with: {
                    post: true,
                }
            });
            return {
                success: true,
                customer: {
                    id: customer.id,
                    name: customer.name || customer.platformHandle || "Unknown",
                    handle: customer.platformHandle,
                    platform: customer.workspace.platform,
                    platformId: customer.platformId,
                    image: null
                },
                messages: history
            };
        }
        catch (error) {
            throw new common_1.HttpException(error instanceof Error ? error.message : 'Internal Server Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async resumeAi(req, customerId) {
        try {
            const userId = req.user.userId;
            const customer = await db_1.db.query.customers.findFirst({
                where: (0, drizzle_orm_1.eq)(db_2.customers.id, customerId),
                with: { workspace: true },
            });
            if (!customer)
                throw new Error("Customer not found");
            if (customer.workspace.userId !== userId) {
                throw new Error("Unauthorized workspace access");
            }
            await db_1.db.update(db_2.customers)
                .set({
                aiPaused: false,
                aiPausedAt: null,
                conversationState: "IDLE",
                conversationContext: {},
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(db_2.customers.id, customerId));
            await db_1.db.insert(db_2.interactions).values({
                workspaceId: customer.workspaceId,
                sourceId: "system",
                externalId: `resume-ai-${Date.now()}`,
                authorId: customer.platformId,
                authorName: "System",
                content: "Human takeover ended",
                response: "AI has been resumed for this conversation. I'm back to assist! 🤖",
                status: "PROCESSED",
            });
            return { success: true };
        }
        catch (error) {
            throw new common_1.HttpException(error instanceof Error ? error.message : 'Internal Server Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async pauseAi(req, customerId) {
        try {
            const userId = req.user.userId;
            const customer = await db_1.db.query.customers.findFirst({
                where: (0, drizzle_orm_1.eq)(db_2.customers.id, customerId),
                with: { workspace: true },
            });
            if (!customer)
                throw new Error("Customer not found");
            if (customer.workspace.userId !== userId) {
                throw new Error("Unauthorized workspace access");
            }
            await db_1.db.update(db_2.customers)
                .set({
                aiPaused: true,
                aiPausedAt: new Date(),
                conversationState: "HUMAN_TAKEOVER",
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(db_2.customers.id, customerId));
            return { success: true };
        }
        catch (error) {
            throw new common_1.HttpException(error instanceof Error ? error.message : 'Internal Server Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.CustomerController = CustomerController;
__decorate([
    (0, common_1.Get)(':platformId/conversation'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('platformId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "getConversation", null);
__decorate([
    (0, common_1.Post)(':id/resume'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "resumeAi", null);
__decorate([
    (0, common_1.Post)(':id/pause'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "pauseAi", null);
exports.CustomerController = CustomerController = __decorate([
    (0, common_1.Controller)('customer'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard)
], CustomerController);
//# sourceMappingURL=customer.controller.js.map
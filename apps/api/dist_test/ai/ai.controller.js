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
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const ai_service_1 = require("./ai.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const dto_1 = require("./dto");
let AiController = class AiController {
    aiService;
    constructor(aiService) {
        this.aiService = aiService;
    }
    async processAiInteraction(req, dto) {
        try {
            return await this.aiService.processInteraction(dto.interactionId);
        }
        catch (error) {
            throw new common_1.HttpException(error instanceof Error ? error.message : 'Internal Server Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async generateEmbedding(req, dto) {
        try {
            return await this.aiService.generateEmbedding(req.user.userId, dto);
        }
        catch (error) {
            throw new common_1.HttpException(error instanceof Error ? error.message : 'Internal Server Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async performChat(req, dto) {
        try {
            return await this.aiService.chat(req.user.userId, dto);
        }
        catch (error) {
            throw new common_1.HttpException(error instanceof Error ? error.message : 'Internal Server Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async processCoachMessage(req, dto) {
        try {
            return await this.aiService.coachChat(req.user.userId, dto);
        }
        catch (error) {
            throw new common_1.HttpException(error instanceof Error ? error.message : 'Internal Server Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getCoachHistory(req) {
        try {
            return await this.aiService.getCoachHistory(req.user.userId);
        }
        catch (error) {
            throw new common_1.HttpException(error instanceof Error ? error.message : 'Internal Server Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getCustomerInteractions(req) {
        try {
            return await this.aiService.getCustomerInteractions(req.user.userId);
        }
        catch (error) {
            throw new common_1.HttpException(error instanceof Error ? error.message : 'Internal Server Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getCustomers(req) {
        try {
            return await this.aiService.getCustomers(req.user.userId);
        }
        catch (error) {
            throw new common_1.HttpException(error instanceof Error ? error.message : 'Internal Server Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getCustomer(req, id) {
        try {
            return await this.aiService.getCustomer(req.user.userId, id);
        }
        catch (error) {
            throw new common_1.HttpException(error instanceof Error ? error.message : 'Internal Server Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async pauseCustomerAi(req, id) {
        try {
            return await this.aiService.setCustomerAiStatus(req.user.userId, id, true);
        }
        catch (error) {
            throw new common_1.HttpException(error instanceof Error ? error.message : 'Internal Server Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async resumeCustomerAi(req, id) {
        try {
            return await this.aiService.setCustomerAiStatus(req.user.userId, id, false);
        }
        catch (error) {
            throw new common_1.HttpException(error instanceof Error ? error.message : 'Internal Server Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async ingestPostData(req, dto) {
        try {
            return await this.aiService.ingestPost(dto.postId);
        }
        catch (error) {
            throw new common_1.HttpException(error instanceof Error ? error.message : 'Internal Server Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async queueBatchIngest(req, dto) {
        try {
            return await this.aiService.batchIngest(req.user.userId, dto);
        }
        catch (error) {
            throw new common_1.HttpException(error instanceof Error ? error.message : 'Internal Server Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async testProviderConnection(req) {
        try {
            return await this.aiService.testConnection();
        }
        catch (error) {
            throw new common_1.HttpException(error instanceof Error ? error.message : 'Internal Server Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async teachAndReply(req, dto) {
        try {
            return await this.aiService.teachAndReply(req.user.userId, dto);
        }
        catch (error) {
            throw new common_1.HttpException(error instanceof Error ? error.message : 'Internal Server Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Post)('process'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.ProcessInteractionDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "processAiInteraction", null);
__decorate([
    (0, common_1.Post)('embed'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.GenerateEmbeddingDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "generateEmbedding", null);
__decorate([
    (0, common_1.Post)('chat'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.ChatDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "performChat", null);
__decorate([
    (0, common_1.Post)('coach/chat'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CoachChatDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "processCoachMessage", null);
__decorate([
    (0, common_1.Get)('coach/history'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getCoachHistory", null);
__decorate([
    (0, common_1.Get)('customer/interactions'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getCustomerInteractions", null);
__decorate([
    (0, common_1.Get)('customer/all'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getCustomers", null);
__decorate([
    (0, common_1.Get)('customer/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getCustomer", null);
__decorate([
    (0, common_1.Post)('customer/:id/pause'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "pauseCustomerAi", null);
__decorate([
    (0, common_1.Post)('customer/:id/resume'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "resumeCustomerAi", null);
__decorate([
    (0, common_1.Post)('ingest'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.IngestPostDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "ingestPostData", null);
__decorate([
    (0, common_1.Post)('upload-batch'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.BatchIngestDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "queueBatchIngest", null);
__decorate([
    (0, common_1.Post)('test-connection'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "testProviderConnection", null);
__decorate([
    (0, common_1.Post)('teach-reply'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.TeachReplyDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "teachAndReply", null);
exports.AiController = AiController = __decorate([
    (0, common_1.Controller)('ai'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], AiController);
//# sourceMappingURL=ai.controller.js.map
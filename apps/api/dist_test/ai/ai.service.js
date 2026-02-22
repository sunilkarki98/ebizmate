"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const factory_1 = require("./services/factory");
const db_1 = require("@ebizmate/db");
const drizzle_orm_1 = require("drizzle-orm");
const shared_1 = require("@ebizmate/shared");
let AiService = AiService_1 = class AiService {
    aiQueue;
    logger = new common_1.Logger(AiService_1.name);
    constructor(aiQueue) {
        this.aiQueue = aiQueue;
    }
    async processInteraction(interactionId) {
        await this.aiQueue.add('process', { interactionId });
        this.logger.log(`Queued interaction processing: ${interactionId}`);
        return { success: true };
    }
    async generateEmbedding(workspaceId, dto) {
        const ai = await (0, factory_1.getAIService)(workspaceId, dto.botType);
        const result = await ai.embed(dto.input, dto.interactionId);
        return { success: true, embedding: result.embedding };
    }
    async chat(workspaceId, dto) {
        const ai = await (0, factory_1.getAIService)(workspaceId, dto.botType);
        const result = await ai.chat({
            systemPrompt: dto.systemPrompt,
            userMessage: dto.userMessage,
            ...(dto.temperature !== undefined && { temperature: dto.temperature }),
        });
        return { success: true, content: result.content };
    }
    async coachChat(workspaceId, dto) {
        const { processCoachMessage } = await Promise.resolve().then(() => __importStar(require('./coach/agent.js')));
        const reply = await processCoachMessage(workspaceId, dto.message, dto.history);
        return { success: true, reply };
    }
    async getCoachHistory(userId) {
        const userWorkspace = await db_1.db.query.workspaces.findFirst({
            where: (0, drizzle_orm_1.eq)(db_1.workspaces.userId, userId)
        });
        if (!userWorkspace)
            return [];
        const messages = await db_1.db.query.coachConversations.findMany({
            where: (0, drizzle_orm_1.eq)(db_1.coachConversations.workspaceId, userWorkspace.id),
            orderBy: [(0, drizzle_orm_1.desc)(db_1.coachConversations.createdAt)],
            limit: 50,
        });
        return messages.reverse().map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt?.getTime() || Date.now()
        }));
    }
    async getCustomerInteractions(userId) {
        const userWorkspace = await db_1.db.query.workspaces.findFirst({
            where: (0, drizzle_orm_1.eq)(db_1.workspaces.userId, userId)
        });
        if (!userWorkspace)
            return [];
        const logs = await db_1.db.query.interactions.findMany({
            where: (0, drizzle_orm_1.eq)(db_1.interactions.workspaceId, userWorkspace.id),
            orderBy: [(0, drizzle_orm_1.desc)(db_1.interactions.createdAt)],
            limit: 50,
            with: {
                post: true,
            },
        });
        return logs;
    }
    async getCustomers(userId) {
        const userWorkspace = await db_1.db.query.workspaces.findFirst({
            where: (0, drizzle_orm_1.eq)(db_1.workspaces.userId, userId)
        });
        if (!userWorkspace)
            return [];
        const customerList = await db_1.db.query.customers.findMany({
            where: (0, drizzle_orm_1.eq)(db_1.customers.workspaceId, userWorkspace.id),
            orderBy: [(0, drizzle_orm_1.desc)(db_1.customers.lastInteractionAt)],
            limit: 50,
        });
        return customerList;
    }
    async getCustomer(userId, customerId) {
        const customer = await db_1.db.query.customers.findFirst({
            where: (0, drizzle_orm_1.eq)(db_1.customers.id, customerId),
            with: { workspace: true },
        });
        if (!customer)
            throw new Error("Customer not found");
        if (customer.workspace.userId !== userId)
            throw new Error("Unauthorized workspace access");
        return customer;
    }
    async setCustomerAiStatus(userId, customerId, pause) {
        const customer = await this.getCustomer(userId, customerId);
        await db_1.db.update(db_1.customers)
            .set({
            aiPaused: pause,
            conversationState: pause ? customer.conversationState : "IDLE"
        })
            .where((0, drizzle_orm_1.eq)(db_1.customers.id, customerId));
        return { success: true };
    }
    async ingestPost(postId) {
        await this.aiQueue.add('ingest', { postId });
        this.logger.log(`Queued post ingestion: ${postId}`);
        return { success: true };
    }
    async batchIngest(workspaceId, dto) {
        await this.aiQueue.add('upload_batch', {
            workspaceId,
            sourceId: dto.sourceId,
            items: dto.items,
        });
        this.logger.log(`Queued batch ingestion for workspace: ${workspaceId}`);
        return { success: true, queued: true };
    }
    async testConnection() {
        const ai = await (0, factory_1.getAIService)('global', 'customer');
        const result = await ai.chat({
            systemPrompt: 'You are a helpful assistant. Reply with exactly: CONNECTION_OK',
            userMessage: 'Test connection. Reply with: CONNECTION_OK',
        });
        return {
            success: true,
            provider: ai.settings.customerProvider,
            model: result.model,
            response: result.content.slice(0, 200),
        };
    }
    async teachAndReply(userId, dto) {
        const interaction = await db_1.db.query.interactions.findFirst({
            where: (0, drizzle_orm_1.eq)(db_1.interactions.id, dto.interactionId),
            with: { workspace: true }
        });
        if (!interaction)
            throw new Error("Interaction not found");
        if (interaction.workspace.userId !== userId)
            throw new Error("Unauthorized workspace access");
        if (interaction.authorId) {
            try {
                let accessToken;
                if (interaction.workspace.accessToken) {
                    try {
                        accessToken = (0, shared_1.decrypt)(interaction.workspace.accessToken);
                    }
                    catch {
                        console.warn("Failed to decrypt workspace access token");
                    }
                }
                const client = shared_1.PlatformFactory.getClient(interaction.workspace.platform || "generic", {
                    ...(accessToken !== undefined && { accessToken }),
                });
                await client.send({
                    to: interaction.authorId,
                    text: dto.humanResponse,
                    replyToMessageId: interaction.externalId,
                });
            }
            catch (error) {
                console.error("Failed to dispatch human reply:", error);
            }
        }
        await db_1.db.update(db_1.interactions)
            .set({
            response: dto.humanResponse,
            status: "PROCESSED",
        })
            .where((0, drizzle_orm_1.eq)(db_1.interactions.id, dto.interactionId));
        if (interaction.content && interaction.content.length > 5) {
            const combinedText = `Q: ${interaction.content} A: ${dto.humanResponse}`;
            try {
                const ai = await (0, factory_1.getAIService)(interaction.workspace.id, 'coach');
                const embedResult = await ai.embed(combinedText, interaction.id);
                await db_1.db.insert(db_1.items).values({
                    workspaceId: interaction.workspaceId,
                    name: interaction.content.substring(0, 80),
                    content: dto.humanResponse,
                    category: "faq",
                    sourceId: `interaction:${interaction.id}`,
                    embedding: embedResult.embedding,
                    meta: {
                        originalQuestion: interaction.content,
                        learnedAt: new Date().toISOString(),
                    }
                });
            }
            catch (err) {
                console.error("Failed to learn from interaction:", err);
            }
        }
        return { success: true };
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('ai')),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], AiService);
//# sourceMappingURL=ai.service.js.map
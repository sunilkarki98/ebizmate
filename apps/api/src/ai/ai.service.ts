import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
    getAIService,
    getCoachHistory,
    getCustomerInteractions,
    getCustomers,
    getCustomer,
    setCustomerAiStatus,
    teachAndReply,
    testConnection,
    processCoachMessage,
    getWorkspace
} from '@ebizmate/domain';
import type {
    ChatDto,
    GenerateEmbeddingDto,
    CoachChatDto,
    BatchIngestDto,
    TeachReplyDto
} from '@ebizmate/contracts';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    constructor(@InjectQueue('ai') private readonly aiQueue: Queue) { }

    async processInteraction(interactionId: string): Promise<{ success: boolean }> {
        await this.aiQueue.add('process', { interactionId });
        this.logger.log(`Queued interaction processing: ${interactionId}`);
        return { success: true };
    }

    async generateEmbedding(userId: string, dto: GenerateEmbeddingDto) {
        const workspace = await getWorkspace(userId);
        const ai = await getAIService(workspace.id, dto.botType);
        const result = await ai.embed(dto.input, dto.interactionId);
        return { success: true, embedding: result.embedding };
    }

    async chat(userId: string, dto: ChatDto) {
        const workspace = await getWorkspace(userId);
        const ai = await getAIService(workspace.id, dto.botType);
        const result = await ai.chat({
            systemPrompt: dto.systemPrompt,
            userMessage: dto.userMessage,
            ...(dto.temperature !== undefined && { temperature: dto.temperature }),
        });
        return { success: true, content: result.content };
    }

    async coachChat(userId: string, dto: CoachChatDto): Promise<{ success: boolean; reply: string }> {
        const workspace = await getWorkspace(userId);
        const history = (dto.history ?? []).map(h => ({
            role: h.role as 'user' | 'coach',
            content: h.content as string,
        }));
        const reply = await processCoachMessage(workspace.id, dto.message, history);
        return { success: true, reply };
    }

    async getCoachHistory(userId: string) {
        return getCoachHistory(userId);
    }

    async getCustomerInteractions(userId: string) {
        return getCustomerInteractions(userId);
    }

    async getCustomers(userId: string) {
        return getCustomers(userId);
    }

    async getCustomer(userId: string, customerId: string) {
        return getCustomer(userId, customerId);
    }

    async setCustomerAiStatus(userId: string, customerId: string, pause: boolean) {
        return setCustomerAiStatus(userId, customerId, pause);
    }

    async ingestPost(postId: string): Promise<{ success: boolean }> {
        await this.aiQueue.add('ingest', { postId });
        this.logger.log(`Queued post ingestion: ${postId}`);
        return { success: true };
    }

    async batchIngest(userId: string, dto: BatchIngestDto): Promise<{ success: boolean; queued: boolean }> {
        const workspace = await getWorkspace(userId);
        await this.aiQueue.add('upload_batch', {
            workspaceId: workspace.id,
            sourceId: dto.sourceId,
            items: dto.items,
        });
        this.logger.log(`Queued batch ingestion for workspace: ${workspace.id}`);
        return { success: true, queued: true };
    }

    async testConnection() {
        return testConnection();
    }

    async teachAndReply(userId: string, dto: TeachReplyDto) {
        const result = await teachAndReply(userId, dto);
        if (result.newItemId) {
            await this.aiQueue.add('refresh_item_embedding', { itemId: result.newItemId });
            this.logger.log(`Queued background embedding for learned item: ${result.newItemId}`);
        }
        return result;
    }
}

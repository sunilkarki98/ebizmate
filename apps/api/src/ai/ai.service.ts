import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { getAIService } from './services/factory';
import type { ChatDto, GenerateEmbeddingDto, CoachChatDto, BatchIngestDto } from './dto';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    constructor(@InjectQueue('ai') private readonly aiQueue: Queue) { }

    async processInteraction(interactionId: string): Promise<{ success: boolean }> {
        await this.aiQueue.add('process', { interactionId });
        this.logger.log(`Queued interaction processing: ${interactionId}`);
        return { success: true };
    }

    async generateEmbedding(workspaceId: string, dto: GenerateEmbeddingDto) {
        const ai = await getAIService(workspaceId, dto.botType);
        const result = await ai.embed(dto.input, dto.interactionId);

        return { success: true, embedding: result.embedding };
    }

    async chat(workspaceId: string, dto: ChatDto) {
        const ai = await getAIService(workspaceId, dto.botType);
        const result = await ai.chat({
            systemPrompt: dto.systemPrompt,
            userMessage: dto.userMessage,
            temperature: dto.temperature,
        });

        return { success: true, content: result.content };
    }

    async coachChat(workspaceId: string, dto: CoachChatDto): Promise<{ success: boolean; reply: string }> {
        const { processCoachMessage } = await import('./coach/agent.js');
        const reply = await processCoachMessage(workspaceId, dto.message, dto.history);

        return { success: true, reply };
    }

    async ingestPost(postId: string): Promise<{ success: boolean }> {
        await this.aiQueue.add('ingest', { postId });
        this.logger.log(`Queued post ingestion: ${postId}`);
        return { success: true };
    }

    async batchIngest(workspaceId: string, dto: BatchIngestDto): Promise<{ success: boolean; queued: boolean }> {
        await this.aiQueue.add('upload_batch', {
            workspaceId,
            sourceId: dto.sourceId,
            items: dto.items,
        });
        this.logger.log(`Queued batch ingestion for workspace: ${workspaceId}`);
        return { success: true, queued: true };
    }

    async testConnection() {
        const ai = await getAIService('global', 'customer');
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
}

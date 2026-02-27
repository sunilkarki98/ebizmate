import { getAIService } from './factory.js';
import type { ChatDto, GenerateEmbeddingDto, CoachChatDto, BatchIngestDto } from '@ebizmate/contracts';

export async function generateEmbedding(workspaceId: string, dto: GenerateEmbeddingDto) {
    const ai = await getAIService(workspaceId, dto.botType);
    const result = await ai.embed(dto.input, dto.interactionId);

    return { success: true, embedding: result.embedding };
}

export async function chat(workspaceId: string, dto: ChatDto) {
    const ai = await getAIService(workspaceId, dto.botType);
    const result = await ai.chat({
        systemPrompt: dto.systemPrompt,
        userMessage: dto.userMessage,
        ...(dto.temperature !== undefined && { temperature: dto.temperature }),
    });

    return { success: true, content: result.content };
}

export async function coachChat(workspaceId: string, dto: CoachChatDto): Promise<{ success: boolean; reply: string }> {
    const { processCoachMessage } = await import('../coach/agent.js');
    const reply = await processCoachMessage(workspaceId, dto.message, dto.history as any);

    return { success: true, reply };
}

export async function testConnection() {
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

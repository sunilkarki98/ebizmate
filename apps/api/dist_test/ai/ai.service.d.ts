import { Queue } from 'bullmq';
import type { ChatDto, GenerateEmbeddingDto, CoachChatDto, BatchIngestDto, TeachReplyDto } from './dto';
export declare class AiService {
    private readonly aiQueue;
    private readonly logger;
    constructor(aiQueue: Queue);
    processInteraction(interactionId: string): Promise<{
        success: boolean;
    }>;
    generateEmbedding(workspaceId: string, dto: GenerateEmbeddingDto): Promise<{
        success: boolean;
        embedding: number[];
    }>;
    chat(workspaceId: string, dto: ChatDto): Promise<{
        success: boolean;
        content: string;
    }>;
    coachChat(workspaceId: string, dto: CoachChatDto): Promise<{
        success: boolean;
        reply: string;
    }>;
    getCoachHistory(userId: string): Promise<{
        id: string;
        role: "user" | "coach";
        content: string;
        createdAt: number;
    }[]>;
    getCustomerInteractions(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: "PENDING" | "PROCESSED" | "IGNORED" | "FAILED" | "NEEDS_REVIEW" | "ACTION_REQUIRED" | "RESOLVED";
        workspaceId: string;
        sourceId: string;
        content: string;
        meta: unknown;
        postId: string;
        externalId: string;
        authorId: string;
        authorName: string;
        customerId: string;
        response: string;
        post: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            platformId: string;
            workspaceId: string;
            content: string;
            meta: unknown;
            transcript: string;
        };
    }[]>;
    getCustomers(userId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        platformId: string;
        platformHandle: string;
        workspaceId: string;
        firstInteractionAt: Date;
        lastInteractionAt: Date;
        aiPaused: boolean;
        aiPausedAt: Date;
        conversationState: string;
        conversationContext: unknown;
    }[]>;
    getCustomer(userId: string, customerId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        platformId: string;
        platformHandle: string;
        workspaceId: string;
        firstInteractionAt: Date;
        lastInteractionAt: Date;
        aiPaused: boolean;
        aiPausedAt: Date;
        conversationState: string;
        conversationContext: unknown;
        workspace: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            platform: string;
            platformId: string;
            platformHandle: string;
            accessToken: string;
            businessName: string;
            industry: string;
            about: string;
            targetAudience: string;
            toneOfVoice: string;
            settings: {
                ai_active?: boolean;
                language?: string;
                systemPromptTemplate?: string;
            };
            allowGlobalAi: boolean;
            plan: "free" | "paid";
            status: "active" | "suspended" | "past_due";
            trialEndsAt: Date;
            customUsageLimit: number;
        };
    }>;
    setCustomerAiStatus(userId: string, customerId: string, pause: boolean): Promise<{
        success: boolean;
    }>;
    ingestPost(postId: string): Promise<{
        success: boolean;
    }>;
    batchIngest(workspaceId: string, dto: BatchIngestDto): Promise<{
        success: boolean;
        queued: boolean;
    }>;
    testConnection(): Promise<{
        success: boolean;
        provider: import("../common/types/ai").ProviderName;
        model: string;
        response: string;
    }>;
    teachAndReply(userId: string, dto: TeachReplyDto): Promise<{
        success: boolean;
    }>;
}
//# sourceMappingURL=ai.service.d.ts.map
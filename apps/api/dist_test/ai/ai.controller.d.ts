import { AiService } from './ai.service';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { ProcessInteractionDto, GenerateEmbeddingDto, ChatDto, CoachChatDto, IngestPostDto, BatchIngestDto, TeachReplyDto } from './dto';
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    processAiInteraction(req: AuthenticatedRequest, dto: ProcessInteractionDto): Promise<{
        success: boolean;
    }>;
    generateEmbedding(req: AuthenticatedRequest, dto: GenerateEmbeddingDto): Promise<{
        success: boolean;
        embedding: number[];
    }>;
    performChat(req: AuthenticatedRequest, dto: ChatDto): Promise<{
        success: boolean;
        content: string;
    }>;
    processCoachMessage(req: AuthenticatedRequest, dto: CoachChatDto): Promise<{
        success: boolean;
        reply: string;
    }>;
    getCoachHistory(req: AuthenticatedRequest): Promise<{
        id: string;
        role: "user" | "coach";
        content: string;
        createdAt: number;
    }[]>;
    getCustomerInteractions(req: AuthenticatedRequest): Promise<{
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
    getCustomers(req: AuthenticatedRequest): Promise<{
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
    getCustomer(req: AuthenticatedRequest, id: string): Promise<{
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
    pauseCustomerAi(req: AuthenticatedRequest, id: string): Promise<{
        success: boolean;
    }>;
    resumeCustomerAi(req: AuthenticatedRequest, id: string): Promise<{
        success: boolean;
    }>;
    ingestPostData(req: AuthenticatedRequest, dto: IngestPostDto): Promise<{
        success: boolean;
    }>;
    queueBatchIngest(req: AuthenticatedRequest, dto: BatchIngestDto): Promise<{
        success: boolean;
        queued: boolean;
    }>;
    testProviderConnection(req: AuthenticatedRequest): Promise<{
        success: boolean;
        provider: import("../common/types/ai").ProviderName;
        model: string;
        response: string;
    }>;
    teachAndReply(req: AuthenticatedRequest, dto: TeachReplyDto): Promise<{
        success: boolean;
    }>;
}
//# sourceMappingURL=ai.controller.d.ts.map
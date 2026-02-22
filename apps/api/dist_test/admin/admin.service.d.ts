import { AiService } from '../ai/ai.service';
export declare class AdminService {
    private readonly aiService;
    private readonly logger;
    constructor(aiService: AiService);
    logAudit(userId: string, action: string, targetType: string, targetId: string, details?: Record<string, any>): Promise<void>;
    getAnalytics(): Promise<{
        dailyUsage: {
            date: string;
            provider: string;
            calls: number;
            tokens: number;
            avgLatency: number;
            errors: number;
        }[];
        providerBreakdown: {
            provider: string;
            operation: "embedding" | "chat" | "coach_chat";
            totalCalls: number;
            totalTokens: number;
            avgLatency: number;
            errorRate: number;
        }[];
        topWorkspaces: {
            workspaceId: string;
            workspaceName: string;
            totalCalls: number;
            totalTokens: number;
        }[];
        totals: {
            totalCalls: number;
            totalTokens: number;
            totalErrors: number;
        };
    }>;
    getUsers(): Promise<{
        id: string;
        name: string;
        email: string;
        role: "user" | "admin";
        createdAt: Date;
        image: string;
    }[]>;
    updateUserRole(adminId: string, userId: string, newRole: "admin" | "user"): Promise<{
        success: boolean;
    }>;
    getWorkspaces(): Promise<{
        id: string;
        name: string;
        platform: string;
        platformHandle: string;
        ownerName: string;
        ownerEmail: string;
        allowGlobalAi: boolean;
        plan: "free" | "paid";
        status: "active" | "suspended" | "past_due";
        trialEndsAt: Date;
        customUsageLimit: number;
        createdAt: Date;
        itemCount: number;
        interactionCount: number;
        currentMonthUsage: number;
    }[]>;
    toggleGlobalAiAccess(adminId: string, workspaceId: string, allowed: boolean): Promise<{
        success: boolean;
    }>;
    updateWorkspacePlan(adminId: string, workspaceId: string, data: any): Promise<{
        success: boolean;
    }>;
    getEscalations(): Promise<{
        id: string;
        content: string;
        response: string;
        authorName: string;
        authorId: string;
        status: "PENDING" | "PROCESSED" | "IGNORED" | "FAILED" | "NEEDS_REVIEW" | "ACTION_REQUIRED" | "RESOLVED";
        createdAt: Date;
        workspaceId: string;
        workspaceName: string;
    }[]>;
    resolveEscalation(adminId: string, interactionId: string): Promise<{
        success: boolean;
    }>;
    getWebhooks(): Promise<{
        id: string;
        name: string;
        platform: string;
        platformId: string;
        platformHandle: string;
        hasAccessToken: boolean;
        ownerEmail: string;
        createdAt: Date;
    }[]>;
    getWebhookSecrets(): Promise<{
        secret: string;
        verifyToken: string;
    }>;
    getAuditLogs(): Promise<{
        id: string;
        action: string;
        targetType: string;
        targetId: string;
        details: unknown;
        createdAt: Date;
        userName: string;
        userEmail: string;
    }[]>;
    getAdminOverview(): Promise<{
        users: number;
        workspaces: number;
        interactions: number;
        items: number;
        escalations: number;
        totalTokens: number;
        totalApiCalls: number;
        coachCalls: number;
        botCalls: number;
        health: {
            db: boolean;
            redis: boolean;
            ai: boolean;
        };
    }>;
    toggleAiPause(adminId: string, workspaceId: string, platformId: string): Promise<{
        success: boolean;
        paused: boolean;
    }>;
    getAISettings(): Promise<{
        coachProvider: string;
        coachModel: string;
        customerProvider: string;
        customerModel: string;
        openaiApiKeyMasked: string;
        openaiApiKeySet: boolean;
        openaiModel: string;
        openaiEmbeddingModel: string;
        geminiApiKeySet: boolean;
        geminiModel: string;
        openrouterApiKeyMasked: string;
        openrouterApiKeySet: boolean;
        openrouterModel: string;
        groqApiKeyMasked: string;
        groqApiKeySet: boolean;
        groqModel: string;
        temperature: string | number;
        maxTokens: number;
        topP: string | number;
        systemPromptTemplate: string;
        rateLimitPerMinute: number;
        retryAttempts: number;
    }>;
    updateAISettings(adminId: string, data: any): Promise<{
        success: boolean;
    }>;
    getUsageStats(): Promise<{
        last7Days: {
            provider: string;
            operation: "embedding" | "chat" | "coach_chat";
            totalCalls: number;
            totalTokens: number;
            avgLatency: number;
            errorCount: number;
        }[];
        allTime: {
            totalCalls: number;
            totalTokens: number;
        };
    }>;
    fetchAvailableModels(provider: string, apiKey: string): Promise<{
        error: string;
        success?: undefined;
        models?: undefined;
    } | {
        success: boolean;
        models: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        models?: undefined;
    }>;
}
//# sourceMappingURL=admin.service.d.ts.map
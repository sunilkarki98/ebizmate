import { SettingsService } from './settings.service';
import { UpdateIdentityDto } from './dto/update-identity.dto';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
export declare class SettingsController {
    private readonly settingsService;
    constructor(settingsService: SettingsService);
    getWorkspace(req: AuthenticatedRequest): Promise<{
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
    }>;
    getWorkspaceDetailed(req: AuthenticatedRequest): Promise<{
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
        aiSettings: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            workspaceId: string;
            coachProvider: string;
            coachModel: string;
            customerProvider: string;
            customerModel: string;
            openaiApiKey: string;
            openaiModel: string;
            openaiEmbeddingModel: string;
            geminiApiKey: string;
            geminiModel: string;
            openrouterApiKey: string;
            openrouterModel: string;
            groqApiKey: string;
            groqModel: string;
            temperature: number;
            maxTokens: number;
            topP: number;
            systemPromptTemplate: string;
            rateLimitPerMinute: number;
            retryAttempts: number;
        };
    }>;
    updateIdentity(req: AuthenticatedRequest, dto: UpdateIdentityDto): Promise<{
        success: boolean;
    }>;
    updateProfile(req: AuthenticatedRequest, dto: UpdateProfileDto): Promise<{
        success: boolean;
    }>;
    updateAiSettings(req: AuthenticatedRequest, dto: UpdateAiSettingsDto): Promise<{
        success: boolean;
    }>;
}
//# sourceMappingURL=settings.controller.d.ts.map
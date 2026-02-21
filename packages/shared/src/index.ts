// Shared Types and Contracts for EbizMate

export type ProviderName = "openai" | "gemini" | "openrouter" | "groq" | "mock";

export interface ChatResult {
    content: string;
    toolCalls?: Array<{ id: string; name: string; arguments: any }>;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
    confidence?: number;
}

export interface EmbedResult {
    embedding: number[];
}

export interface AISettingsConfig {
    coachProvider: ProviderName;
    coachModel: string;
    customerProvider: ProviderName;
    customerModel: string;
    openaiApiKey: string | null;
    openaiModel: string;
    openaiEmbeddingModel: string;
    geminiApiKey: string | null;
    geminiModel: string;
    openrouterApiKey: string | null;
    openrouterModel: string;
    groqApiKey: string | null;
    groqModel: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    systemPromptTemplate: string | null;
    rateLimitPerMinute: number;
    retryAttempts: number;
    plan?: string;
    usageLimit?: number;
    trialEndsAt?: Date | null;
    status?: string | null;
}

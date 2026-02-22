export type ProviderName = "openai" | "gemini" | "openrouter" | "groq" | "mock";
export interface ChatParams {
    systemPrompt: string;
    history?: Array<{
        role: "system" | "user" | "assistant";
        content: string;
    }>;
    userMessage: string | Array<{
        type: "text";
        text: string;
    } | {
        type: "image_url";
        image_url: {
            url: string;
        };
    }>;
    tools?: Array<{
        name: string;
        description: string;
        parameters: object;
    }>;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    userId?: string;
    returnConfidence?: boolean;
}
export interface ChatResult {
    content: string;
    toolCalls?: Array<{
        id: string;
        name: string;
        arguments: any;
    }>;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
    confidence?: number;
}
export interface EmbedParams {
    input: string;
}
export interface EmbedResult {
    embedding: number[];
}
/**
 * Every AI provider adapter must implement this interface.
 * Adding a new provider = implement this interface + register in factory.
 */
export interface AIProvider {
    readonly name: ProviderName;
    chat(params: ChatParams): Promise<ChatResult>;
    embed(text: string, userId?: string): Promise<EmbedResult>;
}
export interface AISettings {
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
//# sourceMappingURL=ai.d.ts.map
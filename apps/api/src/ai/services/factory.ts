import { decrypt } from "@ebizmate/shared";
import type { AISettings, AIProvider, ChatParams, ChatResult, EmbedResult, ProviderName } from "../../common/types/ai";
import { OpenAIProvider } from "./providers/openai";
import { GeminiProvider } from "./providers/gemini";
import { GroqProvider } from "./providers/groq";
import { OpenRouterProvider } from "./providers/openrouter";
import { MockProvider } from "./providers/mock";
import { checkRateLimit } from "../../common/utils/redis";
import { loadSettings, checkUsage } from "./settings";
import { withRetry } from "./retry";
import { logUsage } from "./usage";

// --- Provider Factory ---

function createProvider(name: ProviderName, settings: AISettings): AIProvider {
    switch (name) {
        case "openai": {
            const apiKey = settings.openaiApiKey;
            if (!apiKey) throw new Error("OpenAI API key not configured");
            return new OpenAIProvider(
                decrypt(apiKey),
                settings.openaiModel,
                settings.openaiEmbeddingModel,
            );
        }
        case "gemini": {
            const apiKey = settings.geminiApiKey;
            if (!apiKey) throw new Error("Gemini API key not configured");
            return new GeminiProvider(
                decrypt(apiKey),
                settings.geminiModel,
            );
        }
        case "openrouter": {
            const apiKey = settings.openrouterApiKey;
            if (!apiKey) throw new Error("OpenRouter API key not configured");
            return new OpenRouterProvider(
                decrypt(apiKey),
                settings.openrouterModel,
            );
        }
        case "groq": {
            const apiKey = settings.groqApiKey;
            if (!apiKey) throw new Error("Groq API key not configured");
            return new GroqProvider(
                decrypt(apiKey),
                settings.groqModel,
            );
        }
        case "mock":
            return new MockProvider();
        default:
            throw new Error(`Unknown provider: ${name}`);
    }
}

// --- Public API ---

/**
 * Get an AI service bound to a workspace.
 * Handles provider creation, retry, fallback, and usage logging.
 */
export async function getAIService(workspaceId: string, botType: "coach" | "customer") {
    const settings = await loadSettings(workspaceId);

    // Rate Limiting Check
    const limitResult = await checkRateLimit(workspaceId, settings.rateLimitPerMinute);
    if (!limitResult.success) {
        throw new Error(`Rate limit exceeded for workspace ${workspaceId}. Limit: ${settings.rateLimitPerMinute}/min.`);
    }

    // Usage Limit Check (Token Count)
    if (settings.usageLimit && settings.usageLimit !== Infinity) {
        await checkUsage(workspaceId, settings.usageLimit);
    }

    // For unconfigured workspaces using env var directly
    const envOpenAIKey = process.env.OPENAI_API_KEY;
    const envGeminiKey = process.env.GEMINI_API_KEY;
    const envOpenRouterKey = process.env.OPENROUTER_API_KEY;
    const envGroqKey = process.env.GROQ_API_KEY;
    const useMock = process.env.MOCK_AI_RESPONSE;

    function getProvider(name: ProviderName): AIProvider {
        // Special case: no DB keys configured, fall back to env var or mock
        if (name === "groq" && !settings.groqApiKey && envGroqKey) {
            return new GroqProvider(envGroqKey, settings.groqModel);
        }
        if (name === "openrouter" && !settings.openrouterApiKey && envOpenRouterKey) {
            return new OpenRouterProvider(envOpenRouterKey, settings.openrouterModel);
        }
        if (name === "openai" && !settings.openaiApiKey && envOpenAIKey) {
            return new OpenAIProvider(envOpenAIKey, settings.openaiModel, settings.openaiEmbeddingModel);
        }
        if (name === "gemini" && !settings.geminiApiKey && envGeminiKey) {
            // Env var is plaintext, no decryption needed
            return new GeminiProvider(envGeminiKey, settings.geminiModel);
        }
        if (!settings.openaiApiKey && !settings.geminiApiKey && !settings.openrouterApiKey && useMock) {
            return new MockProvider();
        }
        return createProvider(name, settings);
    }

    async function callProvider<T>(
        operation: string,
        fn: (provider: AIProvider) => Promise<T>,
    ): Promise<{ result: T, provider: ProviderName }> {
        const providerName = botType === "coach" ? settings.coachProvider : settings.customerProvider;
        const providerObj = getProvider(providerName);
        const result = await withRetry(() => fn(providerObj), settings.retryAttempts, `${operation}[${providerName}]`);
        return { result, provider: providerName };
    }

    return {
        settings,

        async chat(params: ChatParams, interactionId?: string, usageType: "chat" | "embedding" | "coach_chat" = "chat"): Promise<ChatResult> {
            const start = Date.now();
            try {
                const { result, provider } = await callProvider("chat", (providerObj) =>
                    providerObj.chat({
                        ...params,
                        temperature: params.temperature ?? settings.temperature,
                        maxTokens: params.maxTokens ?? settings.maxTokens,
                        topP: params.topP ?? settings.topP,
                    })
                );

                const chatResult = result as ChatResult;
                await logUsage(
                    workspaceId, interactionId || null,
                    provider, chatResult.model, usageType,
                    { input: chatResult.usage.promptTokens, output: chatResult.usage.completionTokens },
                    Date.now() - start, true,
                );

                return result;
            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                const providerName = botType === "coach" ? settings.coachProvider : settings.customerProvider;
                await logUsage(
                    workspaceId, interactionId || null,
                    providerName, "unknown", usageType,
                    { input: 0, output: 0 },
                    Date.now() - start, false, errMsg,
                );
                throw error;
            }
        },

        async embed(input: string, interactionId?: string): Promise<EmbedResult> {
            const start = Date.now();
            try {
                const { result, provider } = await callProvider("embed", (providerObj) =>
                    providerObj.embed(input)
                );

                await logUsage(
                    workspaceId, interactionId || null,
                    provider, "embedding-model", "embedding",
                    { input: 0, output: 0 }, // Fake output if token isn't available
                    Date.now() - start, true,
                );

                return result;
            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                const providerName = botType === "coach" ? settings.coachProvider : settings.customerProvider;
                await logUsage(
                    workspaceId, interactionId || null,
                    providerName, "unknown", "embedding",
                    { input: 0, output: 0 },
                    Date.now() - start, false, errMsg,
                );
                throw error;
            }
        },
    };
}

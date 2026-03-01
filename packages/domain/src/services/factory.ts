import { decrypt, checkRateLimit, dragonfly } from "@ebizmate/shared";
import type { AISettings, AIProvider, ChatParams, ChatResult, EmbedResult, ProviderName } from "@ebizmate/contracts";
import { OpenAIProvider } from "./providers/openai.js";
import { GeminiProvider } from "./providers/gemini.js";
import { GroqProvider } from "./providers/groq.js";
import { OpenRouterProvider } from "./providers/openrouter.js";
import { MockProvider } from "./providers/mock.js";
import { loadSettings, checkUsage } from "./settings.js";
import { withRetry } from "./retry.js";
import { logUsage } from "./usage.js";

// Removed in-memory _providerCache to prevent memory leaks and support horizontal scaling (PERF-3)
const PROVIDER_CACHE_TTL = 300; // 5 minutes in seconds

// --- Provider Factory ---

function createProvider(name: ProviderName, config: any): AIProvider {
    switch (name) {
        case "openai":
            if (!config.apiKey) throw new Error("OpenAI API key not configured");
            return new OpenAIProvider(config.apiKey, config.model, config.embeddingModel);
        case "gemini":
            if (!config.apiKey) throw new Error("Gemini API key not configured");
            return new GeminiProvider(config.apiKey, config.model, config.embeddingModel);
        case "openrouter":
            if (!config.apiKey) throw new Error("OpenRouter API key not configured");
            return new OpenRouterProvider(config.apiKey, config.model);
        case "groq":
            if (!config.apiKey) throw new Error("Groq API key not configured");
            return new GroqProvider(config.apiKey, config.model);
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

    async function getProvider(name: ProviderName): Promise<AIProvider> {
        // PERF-3: Check Dragonfly cache for decrypted provider config
        const cacheKey = `provider_config:${workspaceId}:${name}:${botType}`;
        let config: any = null;

        if (dragonfly) {
            try {
                const cached = await dragonfly.get(cacheKey);
                if (cached) {
                    config = JSON.parse(cached);
                    return createProvider(name, config);
                }
            } catch (err) {
                console.warn(`[Factory] Failed to read provider cache from Dragonfly:`, err);
            }
        }

        const canFallback = settings.allowGlobalAi !== false;

        // Build config based on DB settings or fallback
        if (name === "groq") {
            const key = settings.groqApiKey ? decrypt(settings.groqApiKey) : (canFallback ? envGroqKey : null);
            config = { apiKey: key, model: settings.groqModel };
        } else if (name === "openrouter") {
            const key = settings.openrouterApiKey ? decrypt(settings.openrouterApiKey) : (canFallback ? envOpenRouterKey : null);
            config = { apiKey: key, model: settings.openrouterModel };
        } else if (name === "openai") {
            const key = settings.openaiApiKey ? decrypt(settings.openaiApiKey) : (canFallback ? envOpenAIKey : null);
            config = { apiKey: key, model: settings.openaiModel, embeddingModel: settings.openaiEmbeddingModel };
        } else if (name === "gemini") {
            const key = settings.geminiApiKey ? decrypt(settings.geminiApiKey) : (canFallback ? envGeminiKey : null);
            config = { apiKey: key, model: settings.geminiModel, embeddingModel: settings.geminiEmbeddingModel };
        } else if (name === "mock") {
            if (!settings.openaiApiKey && !settings.geminiApiKey && !settings.openrouterApiKey && useMock && canFallback) {
                config = { isMock: true };
            } else {
                config = { isMock: true }; // Allow mock explicitly
            }
        }

        // Write decrypted config to Dragonfly
        if (config && dragonfly && name !== "mock") {
            try {
                await dragonfly.set(cacheKey, JSON.stringify(config), 'EX', PROVIDER_CACHE_TTL);
            } catch (err) {
                console.warn(`[Factory] Failed to write provider cache to Dragonfly:`, err);
            }
        }

        return createProvider(name, config);
    }

    function getFallbackChain(primary: ProviderName): ProviderName[] {
        const chain: ProviderName[] = [primary];

        if (settings.allowGlobalAi === false) {
            // If BYOK is enforced, we can only fallback to providers the user actually configured
            if (primary !== 'gemini' && settings.geminiApiKey) chain.push('gemini');
            if (primary !== 'openai' && settings.openaiApiKey) chain.push('openai');
            return chain;
        }

        // Global fallback routing (Fast/cheap models first)
        if (primary === 'groq' || primary === 'openrouter') {
            chain.push('gemini', 'openai');
        } else if (primary === 'gemini') {
            chain.push('openai', 'groq');
        } else if (primary === 'openai') {
            chain.push('gemini', 'groq');
        }

        return Array.from(new Set(chain));
    }

    async function callProvider<T>(
        operation: string,
        fn: (provider: AIProvider) => Promise<T>,
    ): Promise<{ result: T, provider: ProviderName }> {
        const primaryName = botType === "coach" ? settings.coachProvider : settings.customerProvider;
        const fallbackChain = getFallbackChain(primaryName);

        let lastError: any;

        for (const providerName of fallbackChain) {
            try {
                const providerObj = await getProvider(providerName);

                // If getProvider throws (e.g., missing API key for fallback), we catch it and try next
                const result = await withRetry(() => fn(providerObj), settings.retryAttempts, `${operation}[${providerName}]`);

                if (providerName !== primaryName) {
                    console.log(`[Factory] 🔄 Outage mitigated: Fallback successful. Used ${providerName} instead of failing ${primaryName}`);
                }

                return { result, provider: providerName };
            } catch (err) {
                lastError = err;
                console.warn(`[Factory] ⚠️ Provider ${providerName} failed/unavailable for ${operation}. Attempting next callback...`);
                // Move to the next provider in the chain
            }
        }

        // If all providers in the chain fail, throw the last error
        throw lastError;
    }

    /**
     * Get a provider that supports embeddings.
     * Groq and OpenRouter don't support embeddings — fall back to OpenAI or Gemini.
     */
    async function getEmbedProvider(): Promise<{ provider: AIProvider; name: ProviderName }> {
        const chatProvider = botType === "coach" ? settings.coachProvider : settings.customerProvider;

        // These providers support embeddings natively
        const EMBED_CAPABLE: ProviderName[] = ["openai", "gemini", "mock"];

        if (EMBED_CAPABLE.includes(chatProvider)) {
            return { provider: await getProvider(chatProvider), name: chatProvider };
        }

        // Fall back to an embedding-capable provider
        // Priority: OpenAI (best embeddings) → Gemini → Mock
        if (settings.openaiApiKey || process.env.OPENAI_API_KEY) {
            return { provider: await getProvider("openai"), name: "openai" };
        }
        if (settings.geminiApiKey || process.env.GEMINI_API_KEY) {
            return { provider: await getProvider("gemini"), name: "gemini" };
        }
        if (process.env.MOCK_AI_RESPONSE) {
            return { provider: await getProvider("mock"), name: "mock" };
        }

        // Last resort: try the chat provider and let it throw
        return { provider: await getProvider(chatProvider), name: chatProvider };
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
            const { provider: embedProvider, name: embedProviderName } = await getEmbedProvider();

            try {
                const result = await withRetry(
                    () => embedProvider.embed(input),
                    settings.retryAttempts,
                    `embed[${embedProviderName}]`,
                );

                if (!result.embedding || result.embedding.length !== 768) {
                    throw new Error(`Vector DB Typing Error: Expected embedding dimension of 768, got ${result.embedding?.length ?? 0}`);
                }

                await logUsage(
                    workspaceId, interactionId || null,
                    embedProviderName, "embedding-model", "embedding",
                    { input: 0, output: 0 },
                    Date.now() - start, true,
                );

                return result;
            } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                await logUsage(
                    workspaceId, interactionId || null,
                    embedProviderName, "unknown", "embedding",
                    { input: 0, output: 0 },
                    Date.now() - start, false, errMsg,
                );
                throw error;
            }
        },
    };
}

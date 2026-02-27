import { decrypt, checkRateLimit } from "@ebizmate/shared";
import type { AISettings, AIProvider, ChatParams, ChatResult, EmbedResult, ProviderName } from "@ebizmate/contracts";
import { OpenAIProvider } from "./providers/openai.js";
import { GeminiProvider } from "./providers/gemini.js";
import { GroqProvider } from "./providers/groq.js";
import { OpenRouterProvider } from "./providers/openrouter.js";
import { MockProvider } from "./providers/mock.js";
import { loadSettings, checkUsage } from "./settings.js";
import { withRetry } from "./retry.js";
import { logUsage } from "./usage.js";

// PERF-3 FIX: Provider instance cache to avoid creating new SDK instances on every call.
// Keyed by "workspaceId:providerName:apiKeyFingerprint", TTL 5 minutes.
const _providerCache = new Map<string, { provider: AIProvider; expiresAt: number }>();
const PROVIDER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const PROVIDER_CACHE_CLEANUP_INTERVAL = 60_000;
let _lastProviderCleanup = Date.now();

function getCachedProvider(cacheKey: string): AIProvider | null {
    const now = Date.now();
    // Periodic cleanup
    if (now - _lastProviderCleanup > PROVIDER_CACHE_CLEANUP_INTERVAL) {
        _lastProviderCleanup = now;
        for (const [k, v] of _providerCache) {
            if (v.expiresAt < now) _providerCache.delete(k);
        }
    }
    const entry = _providerCache.get(cacheKey);
    if (entry && entry.expiresAt > now) return entry.provider;
    return null;
}

function setCachedProvider(cacheKey: string, provider: AIProvider) {
    _providerCache.set(cacheKey, { provider, expiresAt: Date.now() + PROVIDER_CACHE_TTL });
}

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
                settings.geminiEmbeddingModel,
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
        // PERF-3: Check provider cache first
        const cacheKey = `${workspaceId}:${name}:${botType}`;
        const cached = getCachedProvider(cacheKey);
        if (cached) return cached;

        const canFallback = settings.allowGlobalAi !== false;
        let provider: AIProvider;

        // Special case: no DB keys configured, fall back to env var or mock
        if (canFallback) {
            if (name === "groq" && !settings.groqApiKey && envGroqKey) {
                provider = new GroqProvider(envGroqKey, settings.groqModel);
                setCachedProvider(cacheKey, provider);
                return provider;
            }
            if (name === "openrouter" && !settings.openrouterApiKey && envOpenRouterKey) {
                provider = new OpenRouterProvider(envOpenRouterKey, settings.openrouterModel);
                setCachedProvider(cacheKey, provider);
                return provider;
            }
            if (name === "openai" && !settings.openaiApiKey && envOpenAIKey) {
                provider = new OpenAIProvider(envOpenAIKey, settings.openaiModel, settings.openaiEmbeddingModel);
                setCachedProvider(cacheKey, provider);
                return provider;
            }
            if (name === "gemini" && !settings.geminiApiKey && envGeminiKey) {
                provider = new GeminiProvider(envGeminiKey, settings.geminiModel, settings.geminiEmbeddingModel);
                setCachedProvider(cacheKey, provider);
                return provider;
            }
            if (!settings.openaiApiKey && !settings.geminiApiKey && !settings.openrouterApiKey && useMock) {
                return new MockProvider(); // Don't cache mock
            }
        }

        provider = createProvider(name, settings);
        setCachedProvider(cacheKey, provider);
        return provider;
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
                const providerObj = getProvider(providerName);

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
    function getEmbedProvider(): { provider: AIProvider; name: ProviderName } {
        const chatProvider = botType === "coach" ? settings.coachProvider : settings.customerProvider;

        // These providers support embeddings natively
        const EMBED_CAPABLE: ProviderName[] = ["openai", "gemini", "mock"];

        if (EMBED_CAPABLE.includes(chatProvider)) {
            return { provider: getProvider(chatProvider), name: chatProvider };
        }

        // Fall back to an embedding-capable provider
        // Priority: OpenAI (best embeddings) → Gemini → Mock
        if (settings.openaiApiKey || process.env.OPENAI_API_KEY) {
            return { provider: getProvider("openai"), name: "openai" };
        }
        if (settings.geminiApiKey || process.env.GEMINI_API_KEY) {
            return { provider: getProvider("gemini"), name: "gemini" };
        }
        if (process.env.MOCK_AI_RESPONSE) {
            return { provider: getProvider("mock"), name: "mock" };
        }

        // Last resort: try the chat provider and let it throw
        return { provider: getProvider(chatProvider), name: chatProvider };
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
            const { provider: embedProvider, name: embedProviderName } = getEmbedProvider();

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

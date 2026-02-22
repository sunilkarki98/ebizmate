"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAIService = getAIService;
const shared_1 = require("@ebizmate/shared");
const openai_1 = require("./providers/openai");
const gemini_1 = require("./providers/gemini");
const groq_1 = require("./providers/groq");
const openrouter_1 = require("./providers/openrouter");
const mock_1 = require("./providers/mock");
const redis_1 = require("../../common/utils/redis");
const settings_1 = require("./settings");
const retry_1 = require("./retry");
const usage_1 = require("./usage");
// --- Provider Factory ---
function createProvider(name, settings) {
    switch (name) {
        case "openai": {
            const apiKey = settings.openaiApiKey;
            if (!apiKey)
                throw new Error("OpenAI API key not configured");
            return new openai_1.OpenAIProvider((0, shared_1.decrypt)(apiKey), settings.openaiModel, settings.openaiEmbeddingModel);
        }
        case "gemini": {
            const apiKey = settings.geminiApiKey;
            if (!apiKey)
                throw new Error("Gemini API key not configured");
            return new gemini_1.GeminiProvider((0, shared_1.decrypt)(apiKey), settings.geminiModel);
        }
        case "openrouter": {
            const apiKey = settings.openrouterApiKey;
            if (!apiKey)
                throw new Error("OpenRouter API key not configured");
            return new openrouter_1.OpenRouterProvider((0, shared_1.decrypt)(apiKey), settings.openrouterModel);
        }
        case "groq": {
            const apiKey = settings.groqApiKey;
            if (!apiKey)
                throw new Error("Groq API key not configured");
            return new groq_1.GroqProvider((0, shared_1.decrypt)(apiKey), settings.groqModel);
        }
        case "mock":
            return new mock_1.MockProvider();
        default:
            throw new Error(`Unknown provider: ${name}`);
    }
}
// --- Public API ---
/**
 * Get an AI service bound to a workspace.
 * Handles provider creation, retry, fallback, and usage logging.
 */
async function getAIService(workspaceId, botType) {
    const settings = await (0, settings_1.loadSettings)(workspaceId);
    // Rate Limiting Check
    const limitResult = await (0, redis_1.checkRateLimit)(workspaceId, settings.rateLimitPerMinute);
    if (!limitResult.success) {
        throw new Error(`Rate limit exceeded for workspace ${workspaceId}. Limit: ${settings.rateLimitPerMinute}/min.`);
    }
    // Usage Limit Check (Token Count)
    if (settings.usageLimit && settings.usageLimit !== Infinity) {
        await (0, settings_1.checkUsage)(workspaceId, settings.usageLimit);
    }
    // For unconfigured workspaces using env var directly
    const envOpenAIKey = process.env.OPENAI_API_KEY;
    const envGeminiKey = process.env.GEMINI_API_KEY;
    const envOpenRouterKey = process.env.OPENROUTER_API_KEY;
    const envGroqKey = process.env.GROQ_API_KEY;
    const useMock = process.env.MOCK_AI_RESPONSE;
    function getProvider(name) {
        // Special case: no DB keys configured, fall back to env var or mock
        if (name === "groq" && !settings.groqApiKey && envGroqKey) {
            return new groq_1.GroqProvider(envGroqKey, settings.groqModel);
        }
        if (name === "openrouter" && !settings.openrouterApiKey && envOpenRouterKey) {
            return new openrouter_1.OpenRouterProvider(envOpenRouterKey, settings.openrouterModel);
        }
        if (name === "openai" && !settings.openaiApiKey && envOpenAIKey) {
            return new openai_1.OpenAIProvider(envOpenAIKey, settings.openaiModel, settings.openaiEmbeddingModel);
        }
        if (name === "gemini" && !settings.geminiApiKey && envGeminiKey) {
            // Env var is plaintext, no decryption needed
            return new gemini_1.GeminiProvider(envGeminiKey, settings.geminiModel);
        }
        if (!settings.openaiApiKey && !settings.geminiApiKey && !settings.openrouterApiKey && useMock) {
            return new mock_1.MockProvider();
        }
        return createProvider(name, settings);
    }
    async function callProvider(operation, fn) {
        const providerName = botType === "coach" ? settings.coachProvider : settings.customerProvider;
        const providerObj = getProvider(providerName);
        const result = await (0, retry_1.withRetry)(() => fn(providerObj), settings.retryAttempts, `${operation}[${providerName}]`);
        return { result, provider: providerName };
    }
    return {
        settings,
        async chat(params, interactionId, usageType = "chat") {
            const start = Date.now();
            try {
                const { result, provider } = await callProvider("chat", (providerObj) => providerObj.chat({
                    ...params,
                    temperature: params.temperature ?? settings.temperature,
                    maxTokens: params.maxTokens ?? settings.maxTokens,
                    topP: params.topP ?? settings.topP,
                }));
                const chatResult = result;
                await (0, usage_1.logUsage)(workspaceId, interactionId || null, provider, chatResult.model, usageType, { input: chatResult.usage.promptTokens, output: chatResult.usage.completionTokens }, Date.now() - start, true);
                return result;
            }
            catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                const providerName = botType === "coach" ? settings.coachProvider : settings.customerProvider;
                await (0, usage_1.logUsage)(workspaceId, interactionId || null, providerName, "unknown", usageType, { input: 0, output: 0 }, Date.now() - start, false, errMsg);
                throw error;
            }
        },
        async embed(input, interactionId) {
            const start = Date.now();
            try {
                const { result, provider } = await callProvider("embed", (providerObj) => providerObj.embed(input));
                await (0, usage_1.logUsage)(workspaceId, interactionId || null, provider, "embedding-model", "embedding", { input: 0, output: 0 }, // Fake output if token isn't available
                Date.now() - start, true);
                return result;
            }
            catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                const providerName = botType === "coach" ? settings.coachProvider : settings.customerProvider;
                await (0, usage_1.logUsage)(workspaceId, interactionId || null, providerName, "unknown", "embedding", { input: 0, output: 0 }, Date.now() - start, false, errMsg);
                throw error;
            }
        },
    };
}
//# sourceMappingURL=factory.js.map
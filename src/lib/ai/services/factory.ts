import { db } from "@/lib/db";
import { aiSettings, aiUsageLog, workspaces } from "@/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import type { AISettings, AIProvider, ChatParams, ChatResult, EmbedResult, ProviderName } from "@/types/ai";
import { OpenAIProvider } from "./providers/openai";
import { GeminiProvider } from "./providers/gemini";
import { GroqProvider } from "./providers/groq";
import { OpenRouterProvider } from "./providers/openrouter";
import { MockProvider } from "./providers/mock";
import { checkRateLimit } from "@/lib/redis";

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

// --- Load Settings ---

// --- Limit Check ---

async function checkUsage(workspaceId: string, limit: number) {
    if (limit === Infinity) return; // BYOK or Unlimited

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [usage] = await db
        .select({
            totalTokens: sql<number>`coalesce(sum(${aiUsageLog.totalTokens}), 0)::int`,
        })
        .from(aiUsageLog)
        .where(and(
            eq(aiUsageLog.workspaceId, workspaceId),
            gte(aiUsageLog.createdAt, startOfMonth)
        ));

    if (usage.totalTokens >= limit) {
        throw new Error(`AI_LIMIT_EXCEEDED: You have used ${usage.totalTokens.toLocaleString()} / ${limit.toLocaleString()} tokens this month. Upgrade your plan.`);
    }
}

// --- Load Settings ---

async function loadSettings(workspaceId: string): Promise<AISettings> {
    // 0. Fetch Workspace Details (Permissions & Limits)
    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
        columns: {
            allowGlobalAi: true,
            plan: true,
            status: true,
            trialEndsAt: true,
            customUsageLimit: true
        }
    });

    if (!workspace) throw new Error("Workspace not found");

    if (workspace.status === "suspended") {
        throw new Error("AI_ACCESS_DENIED: Workspace is suspended.");
    }

    // Define Limits
    let limit = 10000; // Default Free
    if (workspace.plan === "paid") limit = 1000000;
    if (workspace.customUsageLimit) limit = workspace.customUsageLimit;

    // 1. Try to find PER-WORKSPACE settings (BYOK)
    const workspaceSettings = await db.query.aiSettings.findFirst({
        where: eq(aiSettings.workspaceId, workspaceId),
    });

    if (workspaceSettings && (workspaceSettings.geminiApiKey || workspaceSettings.openaiApiKey || workspaceSettings.openrouterApiKey)) {
        // BYOK: Limit is Infinity (unless manually suspended above)
        return {
            coachProvider: workspaceSettings.coachProvider as ProviderName,
            coachModel: workspaceSettings.coachModel || "gpt-4o-mini",
            customerProvider: workspaceSettings.customerProvider as ProviderName,
            customerModel: workspaceSettings.customerModel || "llama-3.3-70b-versatile",
            openaiApiKey: workspaceSettings.openaiApiKey,
            openaiModel: workspaceSettings.openaiModel || "gpt-4o-mini",
            openaiEmbeddingModel: workspaceSettings.openaiEmbeddingModel || "text-embedding-3-small",
            geminiApiKey: workspaceSettings.geminiApiKey,
            geminiModel: workspaceSettings.geminiModel || "gemini-2.0-flash",
            openrouterApiKey: workspaceSettings.openrouterApiKey,
            openrouterModel: workspaceSettings.openrouterModel || "meta-llama/llama-3.3-70b-instruct",
            groqApiKey: workspaceSettings.groqApiKey,
            groqModel: workspaceSettings.groqModel || "llama-3.3-70b-versatile",
            temperature: parseFloat(workspaceSettings.temperature || "0.7"),
            maxTokens: workspaceSettings.maxTokens ?? 1024,
            topP: parseFloat(workspaceSettings.topP || "1.0"),
            systemPromptTemplate: workspaceSettings.systemPromptTemplate,
            rateLimitPerMinute: workspaceSettings.rateLimitPerMinute ?? 60,
            retryAttempts: workspaceSettings.retryAttempts ?? 3,
            usageLimit: Infinity, // BYOK = No Token Limit
            plan: workspace.plan || "free",
        };
    }

    // 1.5 Global AI Checks
    if (workspace.allowGlobalAi === false) {
        throw new Error("AI_ACCESS_DENIED: Global AI access disabled by admin.");
    }

    // Trial Check - Disabled for now to allow Admin's global keys to work
    // if (workspace.plan === "free" && workspace.trialEndsAt && new Date() > workspace.trialEndsAt) {
    //     throw new Error("AI_TRIAL_EXPIRED: Your 7-day trial has ended. Please upgrade or add your own API key.");
    // }

    // 2. Fallback to GLOBAL settings (SaaS Admin defaults)
    const globalSettings = await db.query.aiSettings.findFirst({
        where: eq(aiSettings.workspaceId, "global"),
    });

    if (globalSettings) {
        return {
            coachProvider: globalSettings.coachProvider as ProviderName,
            coachModel: globalSettings.coachModel || "gpt-4o-mini",
            customerProvider: globalSettings.customerProvider as ProviderName,
            customerModel: globalSettings.customerModel || "llama-3.3-70b-versatile",
            openaiApiKey: globalSettings.openaiApiKey,
            openaiModel: globalSettings.openaiModel || "gpt-4o-mini",
            openaiEmbeddingModel: globalSettings.openaiEmbeddingModel || "text-embedding-3-small",
            geminiApiKey: globalSettings.geminiApiKey,
            geminiModel: globalSettings.geminiModel || "gemini-2.0-flash",
            openrouterApiKey: globalSettings.openrouterApiKey,
            openrouterModel: globalSettings.openrouterModel || "meta-llama/llama-3.3-70b-instruct",
            groqApiKey: globalSettings.groqApiKey,
            groqModel: globalSettings.groqModel || "llama-3.3-70b-versatile",
            temperature: parseFloat(globalSettings.temperature || "0.7"),
            maxTokens: globalSettings.maxTokens ?? 1024,
            topP: parseFloat(globalSettings.topP || "1.0"),
            systemPromptTemplate: globalSettings.systemPromptTemplate,
            rateLimitPerMinute: globalSettings.rateLimitPerMinute ?? 60,
            retryAttempts: globalSettings.retryAttempts ?? 3,
            usageLimit: limit, // Enforce calculated limit
            plan: workspace.plan || "free",
        };
    }

    // 3. Last Resort: Env Vars (Development Mode / Self-Hosted)
    const envOpenAIKey = process.env.OPENAI_API_KEY;
    const envGeminiKey = process.env.GEMINI_API_KEY;
    const envOpenRouterKey = process.env.OPENROUTER_API_KEY;
    const envGroqKey = process.env.GROQ_API_KEY;

    return {
        coachProvider: envOpenAIKey ? "openai" : "mock",
        coachModel: "gpt-4o-mini",
        customerProvider: envGroqKey ? "groq" : "mock",
        customerModel: "llama-3.3-70b-versatile",
        openaiApiKey: null,
        openaiModel: "gpt-4o-mini",
        openaiEmbeddingModel: "text-embedding-3-small",
        geminiApiKey: null,
        geminiModel: "gemini-2.0-flash",
        openrouterApiKey: null,
        openrouterModel: "meta-llama/llama-3.3-70b-instruct",
        groqApiKey: null,
        groqModel: "llama-3.3-70b-versatile",
        temperature: 0.7,
        maxTokens: 1024,
        topP: 1.0,
        systemPromptTemplate: null,
        rateLimitPerMinute: 60,
        retryAttempts: 3,
        usageLimit: Infinity, // Dev mode = no limit
        plan: "dev",
    };
}

// --- Retry with Exponential Backoff ---

async function withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number,
    operationName: string,
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < maxAttempts) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Cap at 10s
                console.warn(`${operationName} attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

// --- Usage Logger ---

async function logUsage(
    workspaceId: string,
    interactionId: string | null,
    provider: string,
    model: string,
    operation: string, // Changed from literal "chat" | "embedding" to string to support "coach_chat"
    tokens: { input: number; output: number },
    latencyMs: number,
    success: boolean,
    errorMessage?: string,
) {
    try {
        await db.insert(aiUsageLog).values({
            workspaceId,
            interactionId,
            provider,
            model,
            operation,
            inputTokens: tokens.input,
            outputTokens: tokens.output,
            totalTokens: tokens.input + tokens.output,
            latencyMs,
            success,
            errorMessage: errorMessage || null,
        });
    } catch (err) {
        // Never let logging failure crash the main flow
        console.error("Failed to log AI usage:", err);
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

        async chat(params: ChatParams, interactionId?: string, usageType: string = "chat"): Promise<ChatResult> {
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

                await logUsage(
                    workspaceId, interactionId || null,
                    provider, result.model, usageType,
                    { input: result.usage.promptTokens, output: result.usage.completionTokens },
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

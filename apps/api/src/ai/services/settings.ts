import { db } from "@ebizmate/db";
import { aiSettings, aiUsageLog, workspaces } from "@ebizmate/db";
import { eq, sql, and, gte } from "drizzle-orm";
import type { AISettings, ProviderName } from "../../common/types/ai";

export async function checkUsage(workspaceId: string, limit: number) {
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

export async function loadSettings(workspaceId: string): Promise<AISettings> {
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

    let limit = 10000;
    if (workspace.plan === "paid") limit = 1000000;
    if (workspace.customUsageLimit) limit = workspace.customUsageLimit;

    const workspaceSettings = await db.query.aiSettings.findFirst({
        where: eq(aiSettings.workspaceId, workspaceId),
    });

    if (workspaceSettings && (workspaceSettings.geminiApiKey || workspaceSettings.openaiApiKey || workspaceSettings.openrouterApiKey)) {
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
            temperature: workspaceSettings.temperature ?? 0.7,
            maxTokens: workspaceSettings.maxTokens ?? 1024,
            topP: workspaceSettings.topP ?? 1.0,
            systemPromptTemplate: workspaceSettings.systemPromptTemplate,
            rateLimitPerMinute: workspaceSettings.rateLimitPerMinute ?? 60,
            retryAttempts: workspaceSettings.retryAttempts ?? 3,
            usageLimit: Infinity,
            plan: workspace.plan || "free",
        };
    }

    if (workspace.allowGlobalAi === false) {
        throw new Error("AI_ACCESS_DENIED: Global AI access disabled by admin.");
    }

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
            temperature: globalSettings.temperature ?? 0.7,
            maxTokens: globalSettings.maxTokens ?? 1024,
            topP: globalSettings.topP ?? 1.0,
            systemPromptTemplate: globalSettings.systemPromptTemplate,
            rateLimitPerMinute: globalSettings.rateLimitPerMinute ?? 60,
            retryAttempts: globalSettings.retryAttempts ?? 3,
            usageLimit: limit,
            plan: workspace.plan || "free",
        };
    }

    const envOpenAIKey = process.env["OPENAI_API_KEY"];
    const envGeminiKey = process.env["GEMINI_API_KEY"];
    const envOpenRouterKey = process.env["OPENROUTER_API_KEY"];
    const envGroqKey = process.env["GROQ_API_KEY"];

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
        usageLimit: Infinity,
        plan: "dev",
    };
}

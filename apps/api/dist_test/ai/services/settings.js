"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUsage = checkUsage;
exports.loadSettings = loadSettings;
const db_1 = require("@ebizmate/db");
const db_2 = require("@ebizmate/db");
const drizzle_orm_1 = require("drizzle-orm");
async function checkUsage(workspaceId, limit) {
    if (limit === Infinity)
        return; // BYOK or Unlimited
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const [usage] = await db_1.db
        .select({
        totalTokens: (0, drizzle_orm_1.sql) `coalesce(sum(${db_2.aiUsageLog.totalTokens}), 0)::int`,
    })
        .from(db_2.aiUsageLog)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.aiUsageLog.workspaceId, workspaceId), (0, drizzle_orm_1.gte)(db_2.aiUsageLog.createdAt, startOfMonth)));
    if (usage.totalTokens >= limit) {
        throw new Error(`AI_LIMIT_EXCEEDED: You have used ${usage.totalTokens.toLocaleString()} / ${limit.toLocaleString()} tokens this month. Upgrade your plan.`);
    }
}
async function loadSettings(workspaceId) {
    const workspace = await db_1.db.query.workspaces.findFirst({
        where: (0, drizzle_orm_1.eq)(db_2.workspaces.id, workspaceId),
        columns: {
            allowGlobalAi: true,
            plan: true,
            status: true,
            trialEndsAt: true,
            customUsageLimit: true
        }
    });
    if (!workspace)
        throw new Error("Workspace not found");
    if (workspace.status === "suspended") {
        throw new Error("AI_ACCESS_DENIED: Workspace is suspended.");
    }
    let limit = 10000;
    if (workspace.plan === "paid")
        limit = 1000000;
    if (workspace.customUsageLimit)
        limit = workspace.customUsageLimit;
    const workspaceSettings = await db_1.db.query.aiSettings.findFirst({
        where: (0, drizzle_orm_1.eq)(db_2.aiSettings.workspaceId, workspaceId),
    });
    if (workspaceSettings && (workspaceSettings.geminiApiKey || workspaceSettings.openaiApiKey || workspaceSettings.openrouterApiKey)) {
        return {
            coachProvider: workspaceSettings.coachProvider,
            coachModel: workspaceSettings.coachModel || "gpt-4o-mini",
            customerProvider: workspaceSettings.customerProvider,
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
    const globalSettings = await db_1.db.query.aiSettings.findFirst({
        where: (0, drizzle_orm_1.eq)(db_2.aiSettings.workspaceId, "global"),
    });
    if (globalSettings) {
        return {
            coachProvider: globalSettings.coachProvider,
            coachModel: globalSettings.coachModel || "gpt-4o-mini",
            customerProvider: globalSettings.customerProvider,
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
//# sourceMappingURL=settings.js.map
import { db } from "@ebizmate/db";
import { aiSettings, aiUsageLog, workspaces } from "@ebizmate/db";
import { eq, sql, and, gte } from "drizzle-orm";
import type { AISettings, ProviderName } from "@ebizmate/contracts";
import { dragonfly, isDragonflyAvailable } from "@ebizmate/shared";

export async function checkUsage(workspaceId: string, limit: number) {
    if (limit === Infinity) return; // BYOK or Unlimited

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const cacheKey = `usage:${workspaceId}:${startOfMonth.getTime()}`;
    let totalTokens = 0;

    try {
        const cached = isDragonflyAvailable() ? await dragonfly?.get(cacheKey) : null;
        if (cached) totalTokens = parseInt(cached, 10);
        else {
            let gotLock = false;
            let retryCount = 0;
            const lockKey = `lock:${cacheKey}`;

            while (isDragonflyAvailable() && !gotLock && retryCount < 10) {
                // @ts-ignore - upstash/dragonfly set command typing for NX EX
                const acq = await dragonfly.set(lockKey, "1", "NX", "EX", 10);
                if (acq) { gotLock = true; break; }

                // Another process is building the cache, wait and double check
                await new Promise(r => setTimeout(r, 100));
                const check = await dragonfly.get(cacheKey);
                if (check) {
                    totalTokens = parseInt(check, 10);
                    break;
                }
                retryCount++;
            }

            if (!cached && totalTokens === 0) { // Still not resolved by cache
                const [usage] = await db
                    .select({
                        totalTokens: sql<number>`coalesce(sum(${aiUsageLog.totalTokens}), 0)::int`,
                    })
                    .from(aiUsageLog)
                    .where(and(
                        eq(aiUsageLog.workspaceId, workspaceId),
                        gte(aiUsageLog.createdAt, startOfMonth)
                    ));
                totalTokens = usage.totalTokens;

                if (gotLock) {
                    await dragonfly?.set(cacheKey, totalTokens.toString(), "EX", 60); // 1 min cache
                    await dragonfly?.del(lockKey);
                }
            }
        }
    } catch (err) {
        console.warn("Usage check check failed, falling back to aggregate:", err);
        const [usage] = await db
            .select({
                totalTokens: sql<number>`coalesce(sum(${aiUsageLog.totalTokens}), 0)::int`,
            })
            .from(aiUsageLog)
            .where(and(
                eq(aiUsageLog.workspaceId, workspaceId),
                gte(aiUsageLog.createdAt, startOfMonth)
            ));
        totalTokens = usage.totalTokens;
    }

    if (totalTokens >= limit) {
        throw new Error(`AI_LIMIT_EXCEEDED: You have used ${totalTokens.toLocaleString()} / ${limit.toLocaleString()} tokens this month. Upgrade your plan.`);
    }
}

export async function loadSettings(workspaceId: string): Promise<AISettings> {
    const cacheKey = `ai_settings:${workspaceId}`;
    const versionKey = `policy_version:${workspaceId}`;
    if (isDragonflyAvailable()) {
        try {
            const [cached, currentVersion] = await Promise.all([
                dragonfly?.get(cacheKey),
                dragonfly?.get(versionKey),
            ]);
            if (cached) {
                const parsed = JSON.parse(cached);
                // Only serve cache if policy version matches (prevents stale cache after admin changes)
                if (!currentVersion || parsed._policyVersion === currentVersion) {
                    return parsed;
                }
                // Version mismatch — cache is stale, fall through to DB
            }
        } catch (err) {
            console.warn("Dragonfly settings cache read failed:", err);
        }
    }

    let allowGlobalAi = true;
    let currentPlan = "free";
    let currentLimit = 10000;

    if (workspaceId !== "global") {
        const workspace = await db.query.workspaces.findFirst({
            where: eq(workspaces.id, workspaceId),
            columns: {
                allowGlobalAi: true,
                aiBlocked: true,
                plan: true,
                status: true,
                trialEndsAt: true,
                customUsageLimit: true
            }
        });

        if (!workspace) throw new Error("Workspace not found");

        const now = new Date();
        const trialExpired = workspace.trialEndsAt && new Date(workspace.trialEndsAt) < now;
        const status = workspace.status as string;
        const isInactive = status === "suspended" || status === "past_due";

        if (status === "suspended") {
            throw new Error("AI_ACCESS_DENIED: Workspace is suspended.");
        }

        // HARD BLOCK — aiBlocked overrides everything including BYOK
        if (workspace.aiBlocked) {
            throw new Error("AI_ACCESS_DENIED: AI has been completely blocked by the platform administrator.");
        }

        // Enforcement Logic:
        // 1. If status is PAST_DUE -> No Global AI.
        // 2. If trial is EXPIRED on FREE plan -> No Global AI.
        // 3. Otherwise, use what the admin set (default=true).

        if (isInactive || (workspace.plan === "free" && trialExpired)) {
            allowGlobalAi = false;
        } else {
            allowGlobalAi = workspace.allowGlobalAi ?? true;
        }

        currentPlan = workspace.plan || "free";
        currentLimit = workspace.customUsageLimit || (workspace.plan === "paid" ? 1000000 : 10000);
    }

    const workspaceSettings = await db.query.aiSettings.findFirst({
        where: eq(aiSettings.workspaceId, workspaceId),
    });

    // Strategy:
    // 1. If workspace has its own keys (BYOK), use them — bypasses admin block.
    // 2. If allowGlobalAi is TRUE, fall back to global/shared settings.
    // 3. If allowGlobalAi is FALSE and NO own keys, block access entirely.

    if (workspaceSettings && (workspaceSettings.geminiApiKey || workspaceSettings.openaiApiKey || workspaceSettings.openrouterApiKey || workspaceSettings.groqApiKey)) {
        const settings: AISettings = {
            coachProvider: workspaceSettings.coachProvider as ProviderName,
            coachModel: workspaceSettings.coachModel || "gpt-4o-mini",
            customerProvider: workspaceSettings.customerProvider as ProviderName,
            customerModel: workspaceSettings.customerModel || "llama-3.3-70b-versatile",
            openaiApiKey: workspaceSettings.openaiApiKey,
            openaiModel: workspaceSettings.openaiModel || "gpt-4o-mini",
            openaiEmbeddingModel: workspaceSettings.openaiEmbeddingModel || "text-embedding-3-small",
            geminiApiKey: workspaceSettings.geminiApiKey,
            geminiModel: workspaceSettings.geminiModel || "gemini-2.0-flash",
            geminiEmbeddingModel: workspaceSettings.geminiEmbeddingModel || "gemini-embedding-001",
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
            usageLimit: Infinity, // BYOK = Unlimited by platform (external billing)
            plan: currentPlan as any,
            allowGlobalAi, // Propagate the flag
        };
        if (isDragonflyAvailable()) {
            try {
                const ver = await dragonfly?.get(versionKey) || '0';
                // Sanitize: strip API keys before caching (defense-in-depth)
                const { openaiApiKey, geminiApiKey, openrouterApiKey, groqApiKey, ...safeSettings } = settings;
                await dragonfly?.set(cacheKey, JSON.stringify({ ...safeSettings, _policyVersion: ver }), "EX", 300);
            } catch { }
        }
        return settings;
    }

    // Security Check: No own keys AND global AI disabled → block access to shared keys
    if (workspaceId !== "global" && !allowGlobalAi) {
        throw new Error("AI_ACCESS_DENIED: AI access is blocked for this workspace. Your trial may have expired, or an admin has disabled AI access.");
    }

    const globalSettings = await db.query.aiSettings.findFirst({
        where: eq(aiSettings.workspaceId, "global"),
    });

    const settings: AISettings = globalSettings ? {
        coachProvider: globalSettings.coachProvider as ProviderName,
        coachModel: globalSettings.coachModel || "gpt-4o-mini",
        customerProvider: globalSettings.customerProvider as ProviderName,
        customerModel: globalSettings.customerModel || "llama-3.3-70b-versatile",
        openaiApiKey: globalSettings.openaiApiKey,
        openaiModel: globalSettings.openaiModel || "gpt-4o-mini",
        openaiEmbeddingModel: globalSettings.openaiEmbeddingModel || "text-embedding-3-small",
        geminiApiKey: globalSettings.geminiApiKey,
        geminiModel: globalSettings.geminiModel || "gemini-2.0-flash",
        geminiEmbeddingModel: globalSettings.geminiEmbeddingModel || "gemini-embedding-001",
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
        usageLimit: currentLimit,
        plan: currentPlan as any,
        allowGlobalAi: true, // If we reached here, it means it's either global or allowed
    } : {
        coachProvider: (process.env["OPENAI_API_KEY"] ? "openai" : "mock") as ProviderName,
        coachModel: "gpt-4o-mini",
        customerProvider: (process.env["GROQ_API_KEY"] ? "groq" : "mock") as ProviderName,
        customerModel: "llama-3.3-70b-versatile",
        openaiApiKey: process.env["OPENAI_API_KEY"] || null,
        openaiModel: "gpt-4o-mini",
        openaiEmbeddingModel: "text-embedding-3-small",
        geminiApiKey: process.env["GEMINI_API_KEY"] || null,
        geminiModel: "gemini-2.0-flash",
        geminiEmbeddingModel: "gemini-embedding-001",
        openrouterApiKey: process.env["OPENROUTER_API_KEY"] || null,
        openrouterModel: "meta-llama/llama-3.3-70b-instruct",
        groqApiKey: process.env["GROQ_API_KEY"] || null,
        groqModel: "llama-3.3-70b-versatile",
        temperature: 0.7,
        maxTokens: 1024,
        topP: 1.0,
        systemPromptTemplate: null,
        rateLimitPerMinute: 60,
        retryAttempts: 3,
        usageLimit: currentLimit,
        plan: currentPlan as any,
        allowGlobalAi: true,
    };

    try {
        const ver = await dragonfly?.get(versionKey) || '0';
        // SEC-4 FIX: Strip API keys before caching (defense-in-depth) — same as BYOK settings
        const { openaiApiKey, geminiApiKey, openrouterApiKey, groqApiKey, ...safeSettings } = settings;
        await dragonfly?.set(cacheKey, JSON.stringify({ ...safeSettings, _policyVersion: ver }), "EX", 300);
    } catch (err) { }

    return settings;
}

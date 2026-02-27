import { db } from '@ebizmate/db';
import { users, workspaces, interactions, items, aiUsageLog, auditLogs, customers, aiSettings } from '@ebizmate/db';
import { eq, desc, count, sql, gte, and } from 'drizzle-orm';
import { encrypt, decrypt, maskApiKey, dragonfly } from '@ebizmate/shared';
import OpenAI from 'openai';
import { loadSettings } from '../services/settings.js';

export async function logAudit(userId: string, action: string, targetType: string, targetId: string, details?: Record<string, any>) {
    try {
        await db.insert(auditLogs).values({
            userId,
            action,
            targetType,
            targetId,
            details: details || null,
        });
    } catch (err) {
        console.error('Failed to log audit:', err);
    }
}

export async function getAnalytics() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyUsage = await db
        .select({
            date: sql<string>`to_char(${aiUsageLog.createdAt}, 'YYYY-MM-DD')`,
            provider: aiUsageLog.provider,
            calls: sql<number>`count(*)::int`,
            tokens: sql<number>`coalesce(sum(${aiUsageLog.totalTokens}), 0)::int`,
            avgLatency: sql<number>`coalesce(avg(${aiUsageLog.latencyMs}), 0)::int`,
            errors: sql<number>`count(*) filter (where ${aiUsageLog.success} = false)::int`,
        })
        .from(aiUsageLog)
        .where(gte(aiUsageLog.createdAt, thirtyDaysAgo))
        .groupBy(sql`to_char(${aiUsageLog.createdAt}, 'YYYY-MM-DD')`, aiUsageLog.provider)
        .orderBy(sql`to_char(${aiUsageLog.createdAt}, 'YYYY-MM-DD')`);

    const providerBreakdown = await db
        .select({
            provider: aiUsageLog.provider,
            operation: aiUsageLog.operation,
            totalCalls: sql<number>`count(*)::int`,
            totalTokens: sql<number>`coalesce(sum(${aiUsageLog.totalTokens}), 0)::int`,
            avgLatency: sql<number>`coalesce(avg(${aiUsageLog.latencyMs}), 0)::int`,
            errorRate: sql<number>`round(100.0 * count(*) filter (where ${aiUsageLog.success} = false) / nullif(count(*), 0), 1)`,
        })
        .from(aiUsageLog)
        .groupBy(aiUsageLog.provider, aiUsageLog.operation);

    const topWorkspaces = await db
        .select({
            workspaceId: aiUsageLog.workspaceId,
            workspaceName: workspaces.name,
            totalCalls: sql<number>`count(*)::int`,
            totalTokens: sql<number>`coalesce(sum(${aiUsageLog.totalTokens}), 0)::int`,
        })
        .from(aiUsageLog)
        .leftJoin(workspaces, eq(aiUsageLog.workspaceId, workspaces.id))
        .groupBy(aiUsageLog.workspaceId, workspaces.name)
        .orderBy(sql`count(*) desc`)
        .limit(10);

    const [totals] = await db
        .select({
            totalCalls: sql<number>`count(*)::int`,
            totalTokens: sql<number>`coalesce(sum(${aiUsageLog.totalTokens}), 0)::int`,
            totalErrors: sql<number>`count(*) filter (where ${aiUsageLog.success} = false)::int`,
        })
        .from(aiUsageLog);

    return {
        dailyUsage,
        providerBreakdown,
        topWorkspaces,
        totals: totals || { totalCalls: 0, totalTokens: 0, totalErrors: 0 },
    };
}

export async function getUsers() {
    return await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            createdAt: users.createdAt,
            image: users.image,
        })
        .from(users)
        .orderBy(desc(users.createdAt));
}

export async function updateUserRole(adminId: string, userId: string, newRole: "admin" | "user") {
    if (userId === adminId) {
        throw new Error("Cannot change your own role");
    }
    if (!["admin", "user"].includes(newRole)) {
        throw new Error("Invalid role");
    }

    const [targetUser] = await db.select({ email: users.email, role: users.role }).from(users).where(eq(users.id, userId));
    if (!targetUser) throw new Error("User not found");

    await db.update(users).set({ role: newRole, updatedAt: new Date() }).where(eq(users.id, userId));

    await logAudit(adminId, "user.role_changed", "user", userId, {
        email: targetUser.email,
        from: targetUser.role,
        to: newRole,
    });

    return { success: true };
}

export async function getWorkspaces() {
    return await db
        .select({
            id: workspaces.id,
            name: workspaces.name,
            platform: workspaces.platform,
            platformHandle: workspaces.platformHandle,
            ownerName: users.name,
            ownerEmail: users.email,
            allowGlobalAi: workspaces.allowGlobalAi,
            aiBlocked: workspaces.aiBlocked,
            plan: workspaces.plan,
            status: workspaces.status,
            trialEndsAt: workspaces.trialEndsAt,
            customUsageLimit: workspaces.customUsageLimit,
            createdAt: workspaces.createdAt,
            itemCount: sql<number>`(select count(*) from items where items."workspaceId" = workspaces.id)::int`,
            interactionCount: sql<number>`(select count(*) from interactions where interactions."workspaceId" = workspaces.id)::int`,
            currentMonthUsage: sql<number>`(
                select coalesce(sum("totalTokens"), 0) 
                from ai_usage_log 
                where "workspaceId" = workspaces.id 
                and "createdAt" >= date_trunc('month', now())
            )::int`,
        })
        .from(workspaces)
        .leftJoin(users, eq(workspaces.userId, users.id))
        .orderBy(desc(workspaces.createdAt));
}

export async function toggleAiBlocked(adminId: string, workspaceId: string, blocked: boolean) {
    await db.update(workspaces)
        .set({ aiBlocked: blocked })
        .where(eq(workspaces.id, workspaceId));

    // Invalidate cache + increment policy version for versioned cache consistency
    try {
        const versionKey = `policy_version:${workspaceId}`;
        const cacheKey = `ai_settings:${workspaceId}`;
        await dragonfly?.incr(versionKey);
        await dragonfly?.del(cacheKey);
    } catch (err) {
        console.error(`Failed to invalidate cache for workspace ${workspaceId}:`, err);
    }

    await logAudit(adminId, "workspace.ai_blocked", "workspace", workspaceId, { blocked });
    return { success: true };
}

export async function toggleGlobalAiAccess(adminId: string, workspaceId: string, allowed: boolean) {
    await db.update(workspaces)
        .set({ allowGlobalAi: allowed })
        .where(eq(workspaces.id, workspaceId));

    try {
        const versionKey = `policy_version:${workspaceId}`;
        const cacheKey = `ai_settings:${workspaceId}`;
        await dragonfly?.incr(versionKey);
        await dragonfly?.del(cacheKey);
    } catch (err) {
        console.error(`Failed to invalidate cache for workspace ${workspaceId}:`, err);
    }

    await logAudit(adminId, "workspace.global_ai_toggled", "workspace", workspaceId, { allowed });
    return { success: true };
}

export async function updateWorkspacePlan(adminId: string, workspaceId: string, data: any) {
    await db.update(workspaces)
        .set({
            plan: data.plan,
            status: data.status,
            customUsageLimit: data.customUsageLimit,
            trialEndsAt: data.trialEndsAt ? new Date(data.trialEndsAt) : null,
            updatedAt: new Date()
        })
        .where(eq(workspaces.id, workspaceId));

    try {
        const versionKey = `policy_version:${workspaceId}`;
        const cacheKey = `ai_settings:${workspaceId}`;
        await dragonfly?.incr(versionKey);
        await dragonfly?.del(cacheKey);
        // Also invalidate usage cache to enforce new limits immediately
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        await dragonfly?.del(`usage:${workspaceId}:${startOfMonth.getTime()}`);
    } catch (err) {
        console.error(`Failed to invalidate cache for workspace ${workspaceId}:`, err);
    }

    await logAudit(adminId, "workspace.plan_updated", "workspace", workspaceId, data);
    return { success: true };
}

export async function getEscalations() {
    return await db
        .select({
            id: interactions.id,
            content: interactions.content,
            response: interactions.response,
            authorName: interactions.authorName,
            authorId: interactions.authorId,
            status: interactions.status,
            createdAt: interactions.createdAt,
            workspaceId: interactions.workspaceId,
            workspaceName: workspaces.name,
        })
        .from(interactions)
        .leftJoin(workspaces, eq(interactions.workspaceId, workspaces.id))
        .where(eq(interactions.status, "ACTION_REQUIRED"))
        .orderBy(desc(interactions.createdAt))
        .limit(100);
}

export async function resolveEscalation(adminId: string, interactionId: string) {
    await db.update(interactions)
        .set({ status: "RESOLVED" })
        .where(eq(interactions.id, interactionId));

    await logAudit(adminId, "escalation.resolved", "interaction", interactionId);
    return { success: true };
}

export async function getWebhooks() {
    return await db
        .select({
            id: workspaces.id,
            name: workspaces.name,
            platform: workspaces.platform,
            platformId: workspaces.platformId,
            platformHandle: workspaces.platformHandle,
            hasAccessToken: sql<boolean>`${workspaces.accessToken} is not null`,
            ownerEmail: users.email,
            createdAt: workspaces.createdAt,
        })
        .from(workspaces)
        .leftJoin(users, eq(workspaces.userId, users.id))
        .orderBy(desc(workspaces.createdAt));
}

export async function getWebhookSecrets() {
    const secret = process.env.WEBHOOK_SECRET || "";
    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || "";

    return {
        secret: secret ? `••••••${secret.slice(-4)}` : "",
        verifyToken: verifyToken ? `••••••${verifyToken.slice(-4)}` : "",
        configured: !!secret && !!verifyToken,
    };
}

export async function getAuditLogs() {
    return await db
        .select({
            id: auditLogs.id,
            action: auditLogs.action,
            targetType: auditLogs.targetType,
            targetId: auditLogs.targetId,
            details: auditLogs.details,
            createdAt: auditLogs.createdAt,
            userName: users.name,
            userEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(100);
}

export async function getAdminOverview() {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [workspaceCount] = await db.select({ count: count() }).from(workspaces);
    const [interactionCount] = await db.select({ count: count() }).from(interactions);
    const [itemCount] = await db.select({ count: count() }).from(items);
    const [escalationCount] = await db
        .select({ count: count() })
        .from(interactions)
        .where(eq(interactions.status, "ACTION_REQUIRED"));

    const [tokenStats] = await db
        .select({
            totalTokens: sql<number>`coalesce(sum(${aiUsageLog.totalTokens}), 0)::int`,
            totalCalls: sql<number>`count(*)::int`,
        })
        .from(aiUsageLog);

    const [coachStats] = await db
        .select({ count: count() })
        .from(aiUsageLog)
        .where(eq(aiUsageLog.operation, "coach_chat"));

    const [botStats] = await db
        .select({ count: count() })
        .from(aiUsageLog)
        .where(eq(aiUsageLog.operation, "chat"));

    let dbStatus = false;
    try {
        await db.execute(sql`SELECT 1`);
        dbStatus = true;
    } catch { dbStatus = false; }

    let dragonflyStatus = true; // Hardcoded or integrated via bullmq check

    let aiStatus = false;
    try {
        const settings = await loadSettings('global');
        const coachOk = (settings.coachProvider === "openai" && !!settings.openaiApiKey) ||
            (settings.coachProvider === "gemini" && !!settings.geminiApiKey) ||
            (settings.coachProvider === "openrouter" && !!settings.openrouterApiKey) ||
            (settings.coachProvider === "groq" && !!settings.groqApiKey);
        const customerOk = (settings.customerProvider === "openai" && !!settings.openaiApiKey) ||
            (settings.customerProvider === "gemini" && !!settings.geminiApiKey) ||
            (settings.customerProvider === "openrouter" && !!settings.openrouterApiKey) ||
            (settings.customerProvider === "groq" && !!settings.groqApiKey);
        aiStatus = coachOk && customerOk;
    } catch (err) {
        console.error("Failed to check AI status:", err);
        aiStatus = false;
    }

    return {
        users: userCount.count,
        workspaces: workspaceCount.count,
        interactions: interactionCount.count,
        items: itemCount.count,
        escalations: escalationCount.count,
        totalTokens: tokenStats?.totalTokens || 0,
        totalApiCalls: tokenStats?.totalCalls || 0,
        coachCalls: coachStats.count,
        botCalls: botStats.count,
        health: {
            db: dbStatus,
            dragonfly: dragonflyStatus,
            ai: aiStatus
        }
    };
}

export async function toggleAiPause(adminId: string, workspaceId: string, platformId: string) {
    const [customer] = await db
        .select()
        .from(customers)
        .where(
            and(
                eq(customers.workspaceId, workspaceId),
                eq(customers.platformId, platformId)
            )
        );

    if (!customer) {
        throw new Error("Customer not found");
    }

    const newStatus = !customer.aiPaused;

    await db.update(customers)
        .set({
            aiPaused: newStatus,
            aiPausedAt: newStatus ? new Date() : null,
            updatedAt: new Date()
        })
        .where(eq(customers.id, customer.id));

    await logAudit(adminId, "customer.ai_pause_toggled", "customer", customer.id, {
        paused: newStatus,
        platformId,
        workspaceId
    });

    return { success: true, paused: newStatus };
}

export async function getAISettings() {
    const settings = await db.query.aiSettings.findFirst({
        where: eq(aiSettings.workspaceId, "global"),
    });

    if (!settings) {
        return {
            coachProvider: "openai",
            coachModel: "gpt-4o-mini",
            customerProvider: "groq",
            customerModel: "llama-3.3-70b-versatile",
            openaiApiKeyMasked: process.env.OPENAI_API_KEY ? maskApiKey(process.env.OPENAI_API_KEY) : "",
            openaiApiKeySet: !!process.env.OPENAI_API_KEY,
            openaiModel: "gpt-4o-mini",
            openaiEmbeddingModel: "text-embedding-3-small",
            geminiApiKeySet: false,
            geminiModel: "gemini-2.0-flash",
            openrouterApiKeyMasked: process.env.OPENROUTER_API_KEY ? maskApiKey(process.env.OPENROUTER_API_KEY) : "",
            openrouterApiKeySet: !!process.env.OPENROUTER_API_KEY,
            openrouterModel: "meta-llama/llama-3.3-70b-instruct",
            groqApiKeyMasked: process.env.GROQ_API_KEY ? maskApiKey(process.env.GROQ_API_KEY) : "",
            groqApiKeySet: !!process.env.GROQ_API_KEY,
            groqModel: "llama-3.3-70b-versatile",
            temperature: "0.7",
            maxTokens: 1024,
            topP: "1.0",
            systemPromptTemplate: null,
            rateLimitPerMinute: 60,
            retryAttempts: 3,
        };
    }

    let openaiKeyMasked = "";
    let openaiKeySet = false;
    if (settings.openaiApiKey) {
        try {
            openaiKeyMasked = maskApiKey(decrypt(settings.openaiApiKey));
            openaiKeySet = true;
        } catch { openaiKeySet = true; openaiKeyMasked = "••••••••"; }
    }

    let geminiKeyMasked = "";
    let geminiKeySet = false;
    if (settings.geminiApiKey) {
        try {
            geminiKeyMasked = maskApiKey(decrypt(settings.geminiApiKey));
            geminiKeySet = true;
        } catch { geminiKeySet = true; geminiKeyMasked = "••••••••"; }
    }

    let openrouterKeyMasked = "";
    let openrouterKeySet = false;
    if (settings.openrouterApiKey) {
        try {
            openrouterKeyMasked = maskApiKey(decrypt(settings.openrouterApiKey));
            openrouterKeySet = true;
        } catch { openrouterKeySet = true; openrouterKeyMasked = "••••••••"; }
    }

    let groqKeyMasked = "";
    let groqKeySet = false;
    if (settings.groqApiKey) {
        try {
            groqKeyMasked = maskApiKey(decrypt(settings.groqApiKey));
            groqKeySet = true;
        } catch { groqKeySet = true; groqKeyMasked = "••••••••"; }
    }

    return {
        coachProvider: settings.coachProvider,
        coachModel: settings.coachModel || "gpt-4o-mini",
        customerProvider: settings.customerProvider,
        customerModel: settings.customerModel || "llama-3.3-70b-versatile",
        openaiApiKeyMasked: openaiKeyMasked,
        openaiApiKeySet: openaiKeySet,
        openaiModel: settings.openaiModel || "gpt-4o-mini",
        openaiEmbeddingModel: settings.openaiEmbeddingModel || "text-embedding-3-small",
        geminiApiKeySet: geminiKeySet,
        geminiModel: settings.geminiModel || "gemini-2.0-flash",
        openrouterApiKeyMasked: openrouterKeyMasked,
        openrouterApiKeySet: openrouterKeySet,
        openrouterModel: settings.openrouterModel || "meta-llama/llama-3.3-70b-instruct",
        groqApiKeyMasked: groqKeyMasked,
        groqApiKeySet: groqKeySet,
        groqModel: settings.groqModel || "llama-3.3-70b-versatile",
        temperature: settings.temperature || "0.7",
        maxTokens: settings.maxTokens ?? 1024,
        topP: settings.topP || "1.0",
        systemPromptTemplate: settings.systemPromptTemplate,
        rateLimitPerMinute: settings.rateLimitPerMinute ?? 60,
        retryAttempts: settings.retryAttempts ?? 3,
    };
}

export async function updateAISettings(adminId: string, data: any) {
    const existing = await db.query.aiSettings.findFirst({
        where: eq(aiSettings.workspaceId, "global"),
    });

    let openaiApiKey = existing?.openaiApiKey ?? null;
    if (data.openaiApiKey && !data.openaiApiKey.startsWith("••")) {
        openaiApiKey = encrypt(data.openaiApiKey);
    }

    let geminiApiKey = existing?.geminiApiKey ?? null;
    if (data.geminiApiKey && !data.geminiApiKey.startsWith("••")) {
        geminiApiKey = encrypt(data.geminiApiKey);
    }

    let openrouterApiKey = existing?.openrouterApiKey ?? null;
    if (data.openrouterApiKey && !data.openrouterApiKey.startsWith("••")) {
        openrouterApiKey = encrypt(data.openrouterApiKey);
    }

    let groqApiKey = existing?.groqApiKey ?? null;
    if (data.groqApiKey && !data.groqApiKey.startsWith("••")) {
        groqApiKey = encrypt(data.groqApiKey);
    }

    const values = {
        workspaceId: "global",
        coachProvider: data.coachProvider,
        coachModel: data.coachModel,
        customerProvider: data.customerProvider,
        customerModel: data.customerModel,
        openaiApiKey,
        openaiModel: data.openaiModel,
        openaiEmbeddingModel: data.openaiEmbeddingModel,
        geminiApiKey,
        geminiModel: data.geminiModel,
        openrouterApiKey,
        openrouterModel: data.openrouterModel,
        groqApiKey,
        groqModel: data.groqModel,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        topP: data.topP,
        systemPromptTemplate: data.systemPromptTemplate || null,
        rateLimitPerMinute: data.rateLimitPerMinute,
        retryAttempts: data.retryAttempts,
        updatedAt: new Date(),
    };

    if (existing) {
        await db.update(aiSettings)
            .set(values)
            .where(eq(aiSettings.id, existing.id));
    } else {
        await db.insert(aiSettings).values(values);
    }

    try {
        const versionKey = `policy_version:global`;
        await dragonfly?.incr(versionKey);
        await dragonfly?.del(`ai_settings:global`);
    } catch (err) {
        console.error(`Failed to invalidate global AI settings cache:`, err);
    }

    await logAudit(adminId, "ai.settings_updated", "aiSettings", "global", {
        coachProvider: data.coachProvider,
        customerProvider: data.customerProvider
    });

    return { success: true };
}

export async function getUsageStats() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const stats = await db
        .select({
            provider: aiUsageLog.provider,
            operation: aiUsageLog.operation,
            totalCalls: sql<number>`count(*)::int`,
            totalTokens: sql<number>`coalesce(sum(${aiUsageLog.totalTokens}), 0)::int`,
            avgLatency: sql<number>`coalesce(avg(${aiUsageLog.latencyMs}), 0)::int`,
            errorCount: sql<number>`count(*) filter (where ${aiUsageLog.success} = false)::int`,
        })
        .from(aiUsageLog)
        .where(gte(aiUsageLog.createdAt, sevenDaysAgo))
        .groupBy(aiUsageLog.provider, aiUsageLog.operation);

    const totals = await db
        .select({
            totalCalls: sql<number>`count(*)::int`,
            totalTokens: sql<number>`coalesce(sum(${aiUsageLog.totalTokens}), 0)::int`,
        })
        .from(aiUsageLog);

    return {
        last7Days: stats,
        allTime: totals[0] || { totalCalls: 0, totalTokens: 0 },
    };
}

export async function fetchAvailableModels(provider: string, apiKey: string) {
    let finalApiKey = apiKey;

    if (!apiKey || apiKey.startsWith("••") || apiKey === "existing") {
        const settings = await db.query.aiSettings.findFirst({
            where: eq(aiSettings.workspaceId, "global"),
        });

        if (settings) {
            let encryptedKey = null;
            if (provider === "openai") encryptedKey = settings.openaiApiKey;
            if (provider === "gemini") encryptedKey = settings.geminiApiKey;
            if (provider === "openrouter") encryptedKey = settings.openrouterApiKey;
            if (provider === "groq") encryptedKey = settings.groqApiKey;

            if (encryptedKey) {
                try { finalApiKey = decrypt(encryptedKey); }
                catch (e) { console.error("Failed to decrypt stored key for dynamic fetch"); }
            }
        }
    } else if (apiKey.includes(":")) {
        try {
            const decrypted = decrypt(apiKey);
            if (decrypted) finalApiKey = decrypted;
        } catch (e) {
        }
    }

    if (!finalApiKey || finalApiKey.startsWith("••") || finalApiKey === "existing") {
        return { error: "A valid API Key is required to fetch models." };
    }

    try {
        if (provider === "openai") {
            const client = new OpenAI({ apiKey: finalApiKey });
            const list = await client.models.list();
            const models = list.data
                .filter(m => m.id.startsWith("gpt-") && !m.id.includes("instruct") && !m.id.includes("realtime"))
                .map(m => m.id)
                .sort();
            return { success: true, models };
        }

        if (provider === "gemini") {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, {
                    headers: { "x-goog-api-key": finalApiKey },
                });

                if (!response.ok) {
                    const errorData: any = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `API Error: ${response.statusText}`);
                }

                const data: any = await response.json();
                const models = (data.models || [])
                    .filter((m: any) => m.name.startsWith("models/gemini") && m.supportedGenerationMethods?.includes("generateContent"))
                    .map((m: any) => m.name.replace("models/", ""))
                    .sort()
                    .reverse();

                if (models.length > 0) return { success: true, models };
            } catch (error: any) {
                if (error.message.includes("API key") || error.message.includes("400") || error.message.includes("403")) throw error;
            }

            return {
                success: true,
                models: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.0-pro"]
            };
        }

        if (provider === "openrouter") {
            try {
                const response = await fetch("https://openrouter.ai/api/v1/models", {
                    headers: {
                        "Authorization": `Bearer ${finalApiKey}`,
                        "HTTP-Referer": "https://ebizmate.com",
                        "X-Title": "EbizMate",
                    },
                });

                if (!response.ok) {
                    const errorData: any = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `API Error: ${response.statusText}`);
                }

                const data: any = await response.json();
                const models = (data.data || [])
                    .filter((m: any) => m.id && !m.id.includes("disabled"))
                    .map((m: any) => m.id)
                    .sort();

                if (models.length > 0) return { success: true, models };
            } catch (error: any) {
                if (error.message.includes("API") || error.message.includes("401") || error.message.includes("403")) throw error;
            }

            return {
                success: true,
                models: [
                    "meta-llama/llama-3.3-70b-instruct",
                    "meta-llama/llama-3.1-8b-instruct:free",
                    "deepseek/deepseek-chat-v3-0324:free",
                    "google/gemini-2.0-flash-001",
                    "openai/gpt-4o-mini",
                    "anthropic/claude-3.5-sonnet",
                    "mistralai/mistral-large-2411",
                ]
            };
        }

        if (provider === "groq") {
            try {
                const client = new OpenAI({ apiKey: finalApiKey, baseURL: "https://api.groq.com/openai/v1" });
                const list = await client.models.list();
                const models = list.data.map(m => m.id).sort();

                if (models.length > 0) return { success: true, models };
            } catch (error: any) {
                if (error.message.includes("API") || error.message.includes("401") || error.message.includes("403")) throw error;
            }

            return {
                success: true,
                models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it", "deepseek-r1-distill-llama-70b"]
            };
        }

        return { error: "Invalid provider" };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to connect. Check your API Key." };
    }
}

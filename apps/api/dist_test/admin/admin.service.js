"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@ebizmate/db");
const db_2 = require("@ebizmate/db");
const drizzle_orm_1 = require("drizzle-orm");
const shared_1 = require("@ebizmate/shared");
const openai_1 = __importDefault(require("openai"));
const ai_service_1 = require("../ai/ai.service");
const settings_1 = require("../ai/services/settings");
let AdminService = AdminService_1 = class AdminService {
    aiService;
    logger = new common_1.Logger(AdminService_1.name);
    constructor(aiService) {
        this.aiService = aiService;
    }
    async logAudit(userId, action, targetType, targetId, details) {
        try {
            await db_1.db.insert(db_2.auditLogs).values({
                userId,
                action,
                targetType,
                targetId,
                details: details || null,
            });
        }
        catch (err) {
            this.logger.error('Failed to log audit:', err);
        }
    }
    async getAnalytics() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dailyUsage = await db_1.db
            .select({
            date: (0, drizzle_orm_1.sql) `to_char(${db_2.aiUsageLog.createdAt}, 'YYYY-MM-DD')`,
            provider: db_2.aiUsageLog.provider,
            calls: (0, drizzle_orm_1.sql) `count(*)::int`,
            tokens: (0, drizzle_orm_1.sql) `coalesce(sum(${db_2.aiUsageLog.totalTokens}), 0)::int`,
            avgLatency: (0, drizzle_orm_1.sql) `coalesce(avg(${db_2.aiUsageLog.latencyMs}), 0)::int`,
            errors: (0, drizzle_orm_1.sql) `count(*) filter (where ${db_2.aiUsageLog.success} = false)::int`,
        })
            .from(db_2.aiUsageLog)
            .where((0, drizzle_orm_1.gte)(db_2.aiUsageLog.createdAt, thirtyDaysAgo))
            .groupBy((0, drizzle_orm_1.sql) `to_char(${db_2.aiUsageLog.createdAt}, 'YYYY-MM-DD')`, db_2.aiUsageLog.provider)
            .orderBy((0, drizzle_orm_1.sql) `to_char(${db_2.aiUsageLog.createdAt}, 'YYYY-MM-DD')`);
        const providerBreakdown = await db_1.db
            .select({
            provider: db_2.aiUsageLog.provider,
            operation: db_2.aiUsageLog.operation,
            totalCalls: (0, drizzle_orm_1.sql) `count(*)::int`,
            totalTokens: (0, drizzle_orm_1.sql) `coalesce(sum(${db_2.aiUsageLog.totalTokens}), 0)::int`,
            avgLatency: (0, drizzle_orm_1.sql) `coalesce(avg(${db_2.aiUsageLog.latencyMs}), 0)::int`,
            errorRate: (0, drizzle_orm_1.sql) `round(100.0 * count(*) filter (where ${db_2.aiUsageLog.success} = false) / nullif(count(*), 0), 1)`,
        })
            .from(db_2.aiUsageLog)
            .groupBy(db_2.aiUsageLog.provider, db_2.aiUsageLog.operation);
        const topWorkspaces = await db_1.db
            .select({
            workspaceId: db_2.aiUsageLog.workspaceId,
            workspaceName: db_2.workspaces.name,
            totalCalls: (0, drizzle_orm_1.sql) `count(*)::int`,
            totalTokens: (0, drizzle_orm_1.sql) `coalesce(sum(${db_2.aiUsageLog.totalTokens}), 0)::int`,
        })
            .from(db_2.aiUsageLog)
            .leftJoin(db_2.workspaces, (0, drizzle_orm_1.eq)(db_2.aiUsageLog.workspaceId, db_2.workspaces.id))
            .groupBy(db_2.aiUsageLog.workspaceId, db_2.workspaces.name)
            .orderBy((0, drizzle_orm_1.sql) `count(*) desc`)
            .limit(10);
        const [totals] = await db_1.db
            .select({
            totalCalls: (0, drizzle_orm_1.sql) `count(*)::int`,
            totalTokens: (0, drizzle_orm_1.sql) `coalesce(sum(${db_2.aiUsageLog.totalTokens}), 0)::int`,
            totalErrors: (0, drizzle_orm_1.sql) `count(*) filter (where ${db_2.aiUsageLog.success} = false)::int`,
        })
            .from(db_2.aiUsageLog);
        return {
            dailyUsage,
            providerBreakdown,
            topWorkspaces,
            totals: totals || { totalCalls: 0, totalTokens: 0, totalErrors: 0 },
        };
    }
    async getUsers() {
        return await db_1.db
            .select({
            id: db_2.users.id,
            name: db_2.users.name,
            email: db_2.users.email,
            role: db_2.users.role,
            createdAt: db_2.users.createdAt,
            image: db_2.users.image,
        })
            .from(db_2.users)
            .orderBy((0, drizzle_orm_1.desc)(db_2.users.createdAt));
    }
    async updateUserRole(adminId, userId, newRole) {
        if (userId === adminId) {
            throw new Error("Cannot change your own role");
        }
        if (!["admin", "user"].includes(newRole)) {
            throw new Error("Invalid role");
        }
        const [targetUser] = await db_1.db.select({ email: db_2.users.email, role: db_2.users.role }).from(db_2.users).where((0, drizzle_orm_1.eq)(db_2.users.id, userId));
        if (!targetUser)
            throw new Error("User not found");
        await db_1.db.update(db_2.users).set({ role: newRole, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(db_2.users.id, userId));
        await this.logAudit(adminId, "user.role_changed", "user", userId, {
            email: targetUser.email,
            from: targetUser.role,
            to: newRole,
        });
        return { success: true };
    }
    async getWorkspaces() {
        return await db_1.db
            .select({
            id: db_2.workspaces.id,
            name: db_2.workspaces.name,
            platform: db_2.workspaces.platform,
            platformHandle: db_2.workspaces.platformHandle,
            ownerName: db_2.users.name,
            ownerEmail: db_2.users.email,
            allowGlobalAi: db_2.workspaces.allowGlobalAi,
            plan: db_2.workspaces.plan,
            status: db_2.workspaces.status,
            trialEndsAt: db_2.workspaces.trialEndsAt,
            customUsageLimit: db_2.workspaces.customUsageLimit,
            createdAt: db_2.workspaces.createdAt,
            itemCount: (0, drizzle_orm_1.sql) `(select count(*) from items where items."workspaceId" = workspaces.id)::int`,
            interactionCount: (0, drizzle_orm_1.sql) `(select count(*) from interactions where interactions."workspaceId" = workspaces.id)::int`,
            currentMonthUsage: (0, drizzle_orm_1.sql) `(
                    select coalesce(sum("totalTokens"), 0) 
                    from ai_usage_log 
                    where "workspaceId" = workspaces.id 
                    and "createdAt" >= date_trunc('month', now())
                )::int`,
        })
            .from(db_2.workspaces)
            .leftJoin(db_2.users, (0, drizzle_orm_1.eq)(db_2.workspaces.userId, db_2.users.id))
            .orderBy((0, drizzle_orm_1.desc)(db_2.workspaces.createdAt));
    }
    async toggleGlobalAiAccess(adminId, workspaceId, allowed) {
        await db_1.db.update(db_2.workspaces)
            .set({ allowGlobalAi: allowed })
            .where((0, drizzle_orm_1.eq)(db_2.workspaces.id, workspaceId));
        await this.logAudit(adminId, "workspace.global_ai_toggled", "workspace", workspaceId, { allowed });
        return { success: true };
    }
    async updateWorkspacePlan(adminId, workspaceId, data) {
        await db_1.db.update(db_2.workspaces)
            .set({
            plan: data.plan,
            status: data.status,
            customUsageLimit: data.customUsageLimit,
            trialEndsAt: data.trialEndsAt,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(db_2.workspaces.id, workspaceId));
        await this.logAudit(adminId, "workspace.plan_updated", "workspace", workspaceId, data);
        return { success: true };
    }
    async getEscalations() {
        return await db_1.db
            .select({
            id: db_2.interactions.id,
            content: db_2.interactions.content,
            response: db_2.interactions.response,
            authorName: db_2.interactions.authorName,
            authorId: db_2.interactions.authorId,
            status: db_2.interactions.status,
            createdAt: db_2.interactions.createdAt,
            workspaceId: db_2.interactions.workspaceId,
            workspaceName: db_2.workspaces.name,
        })
            .from(db_2.interactions)
            .leftJoin(db_2.workspaces, (0, drizzle_orm_1.eq)(db_2.interactions.workspaceId, db_2.workspaces.id))
            .where((0, drizzle_orm_1.eq)(db_2.interactions.status, "ACTION_REQUIRED"))
            .orderBy((0, drizzle_orm_1.desc)(db_2.interactions.createdAt))
            .limit(100);
    }
    async resolveEscalation(adminId, interactionId) {
        await db_1.db.update(db_2.interactions)
            .set({ status: "RESOLVED" })
            .where((0, drizzle_orm_1.eq)(db_2.interactions.id, interactionId));
        await this.logAudit(adminId, "escalation.resolved", "interaction", interactionId);
        return { success: true };
    }
    async getWebhooks() {
        return await db_1.db
            .select({
            id: db_2.workspaces.id,
            name: db_2.workspaces.name,
            platform: db_2.workspaces.platform,
            platformId: db_2.workspaces.platformId,
            platformHandle: db_2.workspaces.platformHandle,
            hasAccessToken: (0, drizzle_orm_1.sql) `${db_2.workspaces.accessToken} is not null`,
            ownerEmail: db_2.users.email,
            createdAt: db_2.workspaces.createdAt,
        })
            .from(db_2.workspaces)
            .leftJoin(db_2.users, (0, drizzle_orm_1.eq)(db_2.workspaces.userId, db_2.users.id))
            .orderBy((0, drizzle_orm_1.desc)(db_2.workspaces.createdAt));
    }
    async getWebhookSecrets() {
        return {
            secret: process.env.WEBHOOK_SECRET || "",
            verifyToken: process.env.WEBHOOK_VERIFY_TOKEN || "",
        };
    }
    async getAuditLogs() {
        return await db_1.db
            .select({
            id: db_2.auditLogs.id,
            action: db_2.auditLogs.action,
            targetType: db_2.auditLogs.targetType,
            targetId: db_2.auditLogs.targetId,
            details: db_2.auditLogs.details,
            createdAt: db_2.auditLogs.createdAt,
            userName: db_2.users.name,
            userEmail: db_2.users.email,
        })
            .from(db_2.auditLogs)
            .leftJoin(db_2.users, (0, drizzle_orm_1.eq)(db_2.auditLogs.userId, db_2.users.id))
            .orderBy((0, drizzle_orm_1.desc)(db_2.auditLogs.createdAt))
            .limit(100);
    }
    async getAdminOverview() {
        const [userCount] = await db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(db_2.users);
        const [workspaceCount] = await db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(db_2.workspaces);
        const [interactionCount] = await db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(db_2.interactions);
        const [itemCount] = await db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(db_2.items);
        const [escalationCount] = await db_1.db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(db_2.interactions)
            .where((0, drizzle_orm_1.eq)(db_2.interactions.status, "ACTION_REQUIRED"));
        const [tokenStats] = await db_1.db
            .select({
            totalTokens: (0, drizzle_orm_1.sql) `coalesce(sum(${db_2.aiUsageLog.totalTokens}), 0)::int`,
            totalCalls: (0, drizzle_orm_1.sql) `count(*)::int`,
        })
            .from(db_2.aiUsageLog);
        const [coachStats] = await db_1.db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(db_2.aiUsageLog)
            .where((0, drizzle_orm_1.eq)(db_2.aiUsageLog.operation, "coach_chat"));
        const [botStats] = await db_1.db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(db_2.aiUsageLog)
            .where((0, drizzle_orm_1.eq)(db_2.aiUsageLog.operation, "chat"));
        let dbStatus = false;
        try {
            await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT 1`);
            dbStatus = true;
        }
        catch {
            dbStatus = false;
        }
        let redisStatus = true; // Hardcoded or integrated via bullmq check
        let aiStatus = false;
        try {
            const settings = await (0, settings_1.loadSettings)('global');
            const coachOk = (settings.coachProvider === "openai" && !!settings.openaiApiKey) ||
                (settings.coachProvider === "gemini" && !!settings.geminiApiKey) ||
                (settings.coachProvider === "openrouter" && !!settings.openrouterApiKey) ||
                (settings.coachProvider === "groq" && !!settings.groqApiKey);
            const customerOk = (settings.customerProvider === "openai" && !!settings.openaiApiKey) ||
                (settings.customerProvider === "gemini" && !!settings.geminiApiKey) ||
                (settings.customerProvider === "openrouter" && !!settings.openrouterApiKey) ||
                (settings.customerProvider === "groq" && !!settings.groqApiKey);
            aiStatus = coachOk && customerOk;
        }
        catch (err) {
            this.logger.error("Failed to check AI status:", err);
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
                redis: redisStatus,
                ai: aiStatus
            }
        };
    }
    async toggleAiPause(adminId, workspaceId, platformId) {
        const [customer] = await db_1.db
            .select()
            .from(db_2.customers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.customers.workspaceId, workspaceId), (0, drizzle_orm_1.eq)(db_2.customers.platformId, platformId)));
        if (!customer) {
            throw new Error("Customer not found");
        }
        const newStatus = !customer.aiPaused;
        await db_1.db.update(db_2.customers)
            .set({
            aiPaused: newStatus,
            aiPausedAt: newStatus ? new Date() : null,
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(db_2.customers.id, customer.id));
        await this.logAudit(adminId, "customer.ai_pause_toggled", "customer", customer.id, {
            paused: newStatus,
            platformId,
            workspaceId
        });
        return { success: true, paused: newStatus };
    }
    async getAISettings() {
        const settings = await db_1.db.query.aiSettings.findFirst({
            where: (0, drizzle_orm_1.eq)(db_2.aiSettings.workspaceId, "global"),
        });
        if (!settings) {
            return {
                coachProvider: "openai",
                coachModel: "gpt-4o-mini",
                customerProvider: "groq",
                customerModel: "llama-3.3-70b-versatile",
                openaiApiKeyMasked: process.env.OPENAI_API_KEY ? (0, shared_1.maskApiKey)(process.env.OPENAI_API_KEY) : "",
                openaiApiKeySet: !!process.env.OPENAI_API_KEY,
                openaiModel: "gpt-4o-mini",
                openaiEmbeddingModel: "text-embedding-3-small",
                geminiApiKeySet: false,
                geminiModel: "gemini-2.0-flash",
                openrouterApiKeyMasked: process.env.OPENROUTER_API_KEY ? (0, shared_1.maskApiKey)(process.env.OPENROUTER_API_KEY) : "",
                openrouterApiKeySet: !!process.env.OPENROUTER_API_KEY,
                openrouterModel: "meta-llama/llama-3.3-70b-instruct",
                groqApiKeyMasked: process.env.GROQ_API_KEY ? (0, shared_1.maskApiKey)(process.env.GROQ_API_KEY) : "",
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
                openaiKeyMasked = (0, shared_1.maskApiKey)((0, shared_1.decrypt)(settings.openaiApiKey));
                openaiKeySet = true;
            }
            catch {
                openaiKeySet = true;
                openaiKeyMasked = "••••••••";
            }
        }
        let geminiKeyMasked = "";
        let geminiKeySet = false;
        if (settings.geminiApiKey) {
            try {
                geminiKeyMasked = (0, shared_1.maskApiKey)((0, shared_1.decrypt)(settings.geminiApiKey));
                geminiKeySet = true;
            }
            catch {
                geminiKeySet = true;
                geminiKeyMasked = "••••••••";
            }
        }
        let openrouterKeyMasked = "";
        let openrouterKeySet = false;
        if (settings.openrouterApiKey) {
            try {
                openrouterKeyMasked = (0, shared_1.maskApiKey)((0, shared_1.decrypt)(settings.openrouterApiKey));
                openrouterKeySet = true;
            }
            catch {
                openrouterKeySet = true;
                openrouterKeyMasked = "••••••••";
            }
        }
        let groqKeyMasked = "";
        let groqKeySet = false;
        if (settings.groqApiKey) {
            try {
                groqKeyMasked = (0, shared_1.maskApiKey)((0, shared_1.decrypt)(settings.groqApiKey));
                groqKeySet = true;
            }
            catch {
                groqKeySet = true;
                groqKeyMasked = "••••••••";
            }
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
    async updateAISettings(adminId, data) {
        const existing = await db_1.db.query.aiSettings.findFirst({
            where: (0, drizzle_orm_1.eq)(db_2.aiSettings.workspaceId, "global"),
        });
        let openaiApiKey = existing?.openaiApiKey ?? null;
        if (data.openaiApiKey && !data.openaiApiKey.startsWith("••")) {
            openaiApiKey = (0, shared_1.encrypt)(data.openaiApiKey);
        }
        let geminiApiKey = existing?.geminiApiKey ?? null;
        if (data.geminiApiKey && !data.geminiApiKey.startsWith("••")) {
            geminiApiKey = (0, shared_1.encrypt)(data.geminiApiKey);
        }
        let openrouterApiKey = existing?.openrouterApiKey ?? null;
        if (data.openrouterApiKey && !data.openrouterApiKey.startsWith("••")) {
            openrouterApiKey = (0, shared_1.encrypt)(data.openrouterApiKey);
        }
        let groqApiKey = existing?.groqApiKey ?? null;
        if (data.groqApiKey && !data.groqApiKey.startsWith("••")) {
            groqApiKey = (0, shared_1.encrypt)(data.groqApiKey);
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
            await db_1.db.update(db_2.aiSettings)
                .set(values)
                .where((0, drizzle_orm_1.eq)(db_2.aiSettings.id, existing.id));
        }
        else {
            await db_1.db.insert(db_2.aiSettings).values(values);
        }
        await this.logAudit(adminId, "ai.settings_updated", "aiSettings", "global", {
            coachProvider: data.coachProvider,
            customerProvider: data.customerProvider
        });
        return { success: true };
    }
    async getUsageStats() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const stats = await db_1.db
            .select({
            provider: db_2.aiUsageLog.provider,
            operation: db_2.aiUsageLog.operation,
            totalCalls: (0, drizzle_orm_1.sql) `count(*)::int`,
            totalTokens: (0, drizzle_orm_1.sql) `coalesce(sum(${db_2.aiUsageLog.totalTokens}), 0)::int`,
            avgLatency: (0, drizzle_orm_1.sql) `coalesce(avg(${db_2.aiUsageLog.latencyMs}), 0)::int`,
            errorCount: (0, drizzle_orm_1.sql) `count(*) filter (where ${db_2.aiUsageLog.success} = false)::int`,
        })
            .from(db_2.aiUsageLog)
            .where((0, drizzle_orm_1.gte)(db_2.aiUsageLog.createdAt, sevenDaysAgo))
            .groupBy(db_2.aiUsageLog.provider, db_2.aiUsageLog.operation);
        const totals = await db_1.db
            .select({
            totalCalls: (0, drizzle_orm_1.sql) `count(*)::int`,
            totalTokens: (0, drizzle_orm_1.sql) `coalesce(sum(${db_2.aiUsageLog.totalTokens}), 0)::int`,
        })
            .from(db_2.aiUsageLog);
        return {
            last7Days: stats,
            allTime: totals[0] || { totalCalls: 0, totalTokens: 0 },
        };
    }
    async fetchAvailableModels(provider, apiKey) {
        let finalApiKey = apiKey;
        if (!apiKey || apiKey.startsWith("••") || apiKey === "existing") {
            const settings = await db_1.db.query.aiSettings.findFirst({
                where: (0, drizzle_orm_1.eq)(db_2.aiSettings.workspaceId, "global"),
            });
            if (settings) {
                let encryptedKey = null;
                if (provider === "openai")
                    encryptedKey = settings.openaiApiKey;
                if (provider === "gemini")
                    encryptedKey = settings.geminiApiKey;
                if (provider === "openrouter")
                    encryptedKey = settings.openrouterApiKey;
                if (provider === "groq")
                    encryptedKey = settings.groqApiKey;
                if (encryptedKey) {
                    try {
                        finalApiKey = (0, shared_1.decrypt)(encryptedKey);
                    }
                    catch (e) {
                        console.error("Failed to decrypt stored key for dynamic fetch");
                    }
                }
            }
        }
        else if (apiKey.includes(":")) {
            try {
                const decrypted = (0, shared_1.decrypt)(apiKey);
                if (decrypted)
                    finalApiKey = decrypted;
            }
            catch (e) {
            }
        }
        if (!finalApiKey || finalApiKey.startsWith("••") || finalApiKey === "existing") {
            return { error: "A valid API Key is required to fetch models." };
        }
        try {
            if (provider === "openai") {
                const client = new openai_1.default({ apiKey: finalApiKey });
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
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error?.message || `API Error: ${response.statusText}`);
                    }
                    const data = await response.json();
                    const models = (data.models || [])
                        .filter((m) => m.name.startsWith("models/gemini") && m.supportedGenerationMethods?.includes("generateContent"))
                        .map((m) => m.name.replace("models/", ""))
                        .sort()
                        .reverse();
                    if (models.length > 0)
                        return { success: true, models };
                }
                catch (error) {
                    if (error.message.includes("API key") || error.message.includes("400") || error.message.includes("403"))
                        throw error;
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
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error?.message || `API Error: ${response.statusText}`);
                    }
                    const data = await response.json();
                    const models = (data.data || [])
                        .filter((m) => m.id && !m.id.includes("disabled"))
                        .map((m) => m.id)
                        .sort();
                    if (models.length > 0)
                        return { success: true, models };
                }
                catch (error) {
                    if (error.message.includes("API") || error.message.includes("401") || error.message.includes("403"))
                        throw error;
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
                    const client = new openai_1.default({ apiKey: finalApiKey, baseURL: "https://api.groq.com/openai/v1" });
                    const list = await client.models.list();
                    const models = list.data.map(m => m.id).sort();
                    if (models.length > 0)
                        return { success: true, models };
                }
                catch (error) {
                    if (error.message.includes("API") || error.message.includes("401") || error.message.includes("403"))
                        throw error;
                }
                return {
                    success: true,
                    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it", "deepseek-r1-distill-llama-70b"]
                };
            }
            return { error: "Invalid provider" };
        }
        catch (error) {
            return { success: false, error: error.message || "Failed to connect. Check your API Key." };
        }
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], AdminService);
//# sourceMappingURL=admin.service.js.map
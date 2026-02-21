"use server";

import { auth } from "@/lib/auth";
import { db } from "@ebizmate/db";
import { users, workspaces, interactions, items, aiUsageLog, auditLogs, customers } from "@ebizmate/db";
import { eq, desc, count, sql, gte, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redis } from "@/lib/redis";
import { getAISettingsAction } from "@/lib/ai-settings-actions";

// --- Admin Guard ---

async function requireAdmin() {
    const session = await auth('admin');
    if (!session?.user?.id) throw new Error("Unauthorized");
    const role = (session.user as { role?: string }).role;
    if (role !== "admin") throw new Error("Forbidden: Admin access required");
    return session.user;
}

// --- Audit Log Helper ---

async function logAudit(userId: string, action: string, targetType: string, targetId: string, details?: Record<string, unknown>) {
    try {
        await db.insert(auditLogs).values({
            userId,
            action,
            targetType,
            targetId,
            details: details || null,
        });
    } catch (err) {
        console.error("Failed to log audit:", err);
    }
}

// ===== ANALYTICS =====

export async function getAnalyticsAction() {
    await requireAdmin();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Usage by day (last 30 days)
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

    // Breakdown by provider
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

    // Top workspaces by usage
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

    // Totals
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

// ===== USER MANAGEMENT =====

export async function getUsersAction() {
    await requireAdmin();

    const allUsers = await db
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

    return allUsers;
}

export async function updateUserRoleAction(userId: string, newRole: "admin" | "user") {
    const admin = await requireAdmin();

    if (userId === admin.id) {
        return { error: "Cannot change your own role" };
    }

    if (!["admin", "user"].includes(newRole)) {
        return { error: "Invalid role" };
    }

    const [targetUser] = await db.select({ email: users.email, role: users.role }).from(users).where(eq(users.id, userId));
    if (!targetUser) return { error: "User not found" };

    await db.update(users).set({ role: newRole, updatedAt: new Date() }).where(eq(users.id, userId));

    await logAudit(admin.id!, "user.role_changed", "user", userId, {
        email: targetUser.email,
        from: targetUser.role,
        to: newRole,
    });

    return { success: true };
}

// ===== WORKSPACE MANAGEMENT =====

export async function getWorkspacesAction() {
    await requireAdmin();

    const allWorkspaces = await db
        .select({
            id: workspaces.id,
            name: workspaces.name,
            platform: workspaces.platform,
            platformHandle: workspaces.platformHandle,
            ownerName: users.name,
            ownerEmail: users.email,
            allowGlobalAi: workspaces.allowGlobalAi,
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

    return allWorkspaces;
}

export async function toggleGlobalAiAccessAction(workspaceId: string, allowed: boolean) {
    const admin = await requireAdmin();

    await db.update(workspaces)
        .set({ allowGlobalAi: allowed })
        .where(eq(workspaces.id, workspaceId));

    await logAudit(admin.id!, "workspace.global_ai_toggled", "workspace", workspaceId, {
        allowed
    });

    revalidatePath("/admin/workspaces");
    return { success: true };
}

export async function updateWorkspacePlanAction(
    workspaceId: string,
    data: {
        plan: string,
        status: string,
        customUsageLimit: number | null,
        trialEndsAt: Date | null
    }
) {
    const admin = await requireAdmin();

    await db.update(workspaces)
        .set({
            plan: data.plan,
            status: data.status,
            customUsageLimit: data.customUsageLimit,
            trialEndsAt: data.trialEndsAt,
            updatedAt: new Date()
        })
        .where(eq(workspaces.id, workspaceId));

    await logAudit(admin.id!, "workspace.plan_updated", "workspace", workspaceId, data);

    revalidatePath("/admin/workspaces");
    return { success: true };
}

// ===== ESCALATION REVIEW =====

export async function getEscalationsAction() {
    await requireAdmin();

    const escalated = await db
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

    return escalated;
}

export async function resolveEscalationAction(interactionId: string) {
    const admin = await requireAdmin();

    await db.update(interactions)
        .set({ status: "RESOLVED" })
        .where(eq(interactions.id, interactionId));

    await logAudit(admin.id!, "escalation.resolved", "interaction", interactionId);

    return { success: true };
}

// ===== WEBHOOK/CONNECTION INFO =====

export async function getWebhooksAction() {
    await requireAdmin();

    const connections = await db
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

    return connections;
}

export async function getWebhookSecretsAction() {
    await requireAdmin();
    return {
        secret: process.env.WEBHOOK_SECRET || "",
        verifyToken: process.env.WEBHOOK_VERIFY_TOKEN || "",
    };
}

// ===== AUDIT LOGS =====

export async function getAuditLogsAction() {
    await requireAdmin();

    const logs = await db
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

    return logs;
}

// ===== PLATFORM-WIDE OVERVIEW STATS (for admin dashboard) =====

export async function getAdminOverviewAction() {
    await requireAdmin();

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

    // Check Connections
    let dbStatus = false;
    try {
        // Simple liveness check
        await db.execute(sql`SELECT 1`);
        dbStatus = true;
    } catch { dbStatus = false; }

    let redisStatus = false;
    try {
        if (redis) {
            const ping = await redis.ping();
            redisStatus = ping === "PONG";
        }
    } catch { redisStatus = false; }

    let aiStatus = false;
    try {
        const settings = await getAISettingsAction();
        const coachOk = (settings.coachProvider === "openai" && settings.openaiApiKeySet) ||
            (settings.coachProvider === "gemini" && settings.geminiApiKeySet) ||
            (settings.coachProvider === "openrouter" && settings.openrouterApiKeySet) ||
            (settings.coachProvider === "groq" && settings.groqApiKeySet);
        const customerOk = (settings.customerProvider === "openai" && settings.openaiApiKeySet) ||
            (settings.customerProvider === "gemini" && settings.geminiApiKeySet) ||
            (settings.customerProvider === "openrouter" && settings.openrouterApiKeySet) ||
            (settings.customerProvider === "groq" && settings.groqApiKeySet);
        aiStatus = coachOk && customerOk;
    } catch { aiStatus = false; }

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

// ===== HUMAN TAKEOVER =====

export async function toggleAiPauseAction(workspaceId: string, platformId: string) {
    const admin = await requireAdmin();

    // Find the customer
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
        return { error: "Customer not found" };
    }

    const newStatus = !customer.aiPaused;

    await db.update(customers)
        .set({
            aiPaused: newStatus,
            aiPausedAt: newStatus ? new Date() : null,
            updatedAt: new Date()
        })
        .where(eq(customers.id, customer.id));

    await logAudit(admin.id!, "customer.ai_pause_toggled", "customer", customer.id, {
        paused: newStatus,
        platformId,
        workspaceId
    });

    return { success: true, paused: newStatus };
}

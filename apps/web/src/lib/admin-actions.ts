"use server";

import { apiClient, requireAdmin } from "@/lib/api-client";
import { revalidatePath } from "next/cache";
import {
    updateUserRoleSchema,
    toggleGlobalAiAccessSchema,
    updateWorkspacePlanSchema,
    resolveEscalationSchema,
    toggleAiPauseSchema,
    workspacePlanSchema
} from "@/lib/validation";
import { z } from "zod";

type WorkspacePlanData = z.infer<typeof workspacePlanSchema>;

// --- Admin Actions ---

export async function getAnalyticsAction() {
    await requireAdmin();
    return await apiClient(`/admin/analytics`);
}

export async function getUsersAction() {
    await requireAdmin();
    return await apiClient(`/admin/users`, { cache: 'no-store' });
}

export async function updateUserRoleAction(userId: string, newRole: "admin" | "user") {
    const validated = updateUserRoleSchema.parse({ userId, role: newRole });
    await requireAdmin();

    try {
        await apiClient(`/admin/users/${validated.userId}/role`, {
            method: "PUT",
            body: JSON.stringify({ role: validated.role })
        });
    } catch (e: any) {
        return { error: e.message || "Failed to update user role" };
    }

    revalidatePath("/admin/users");
    return { success: true };
}

export async function getWorkspacesAction() {
    await requireAdmin();
    return await apiClient(`/admin/workspaces`, { cache: 'no-store' });
}

export async function toggleGlobalAiAccessAction(workspaceId: string, allowed: boolean) {
    const validated = toggleGlobalAiAccessSchema.parse({ workspaceId, allowed });
    await requireAdmin();
    try {
        await apiClient(`/admin/workspaces/${validated.workspaceId}/global-ai`, {
            method: "PUT",
            body: JSON.stringify({ allowed: validated.allowed })
        });
    } catch (e: any) {
        return { error: e.message || "Failed to toggle AI access" };
    }

    revalidatePath("/admin/workspaces");
    return { success: true };
}

export async function updateWorkspacePlanAction(workspaceId: string, data: WorkspacePlanData) {
    const validated = updateWorkspacePlanSchema.parse({ workspaceId, data });
    await requireAdmin();
    try {
        await apiClient(`/admin/workspaces/${validated.workspaceId}/plan`, {
            method: "PUT",
            body: JSON.stringify(validated.data)
        });
        revalidatePath("/admin/workspaces");
        return { success: true };
    } catch (err: any) {
        throw new Error(err.message || "Failed to update workspace plan");
    }
}

export async function getEscalationsAction() {
    await requireAdmin();
    return await apiClient(`/admin/escalations`, { cache: 'no-store' });
}

export async function resolveEscalationAction(interactionId: string) {
    const validated = resolveEscalationSchema.parse({ interactionId });
    await requireAdmin();
    await apiClient(`/admin/escalations/${validated.interactionId}/resolve`, {
        method: "POST"
    });

    revalidatePath("/admin/escalations");
    return { success: true };
}

export async function getWebhooksAction() {
    await requireAdmin();
    return await apiClient(`/admin/webhooks`, { cache: 'no-store' });
}

export async function getWebhookSecretsAction() {
    await requireAdmin();
    return await apiClient(`/admin/webhooks/secrets`, { cache: 'no-store' });
}

export async function getAuditLogsAction() {
    await requireAdmin();
    return await apiClient(`/admin/audit-logs`, { cache: 'no-store' });
}

export async function getAdminOverviewAction() {
    await requireAdmin();
    return await apiClient(`/admin/overview`, { cache: 'no-store' });
}

export async function toggleAiPauseAction(workspaceId: string, platformId: string) {
    const validated = toggleAiPauseSchema.parse({ workspaceId, platformId });
    await requireAdmin();
    try {
        const data = await apiClient(`/admin/customers/pause`, {
            method: "POST",
            body: JSON.stringify({
                workspaceId: validated.workspaceId,
                platformId: validated.platformId
            })
        });

        revalidatePath("/dashboard/customers");
        return { success: true, paused: data.paused };
    } catch {
        return { error: "Failed to toggle AI pause" };
    }
}

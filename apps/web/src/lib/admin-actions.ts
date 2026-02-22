"use server";

import { auth, getBackendToken } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// --- Admin Guard ---

async function requireAdmin() {
    const session = await auth('admin');
    if (!session?.user?.id) throw new Error("Unauthorized");
    const role = (session.user as { role?: string }).role;
    if (role !== "admin") throw new Error("Forbidden: Admin access required");
    return session.user;
}

// --- Admin Actions ---

export async function getAnalyticsAction() {
    await requireAdmin();
    const token = await getBackendToken();
    if (!token) throw new Error("No backend token");

    const res = await fetch(`${backendUrl}/admin/analytics`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch analytics");
    return await res.json();
}

export async function getUsersAction() {
    await requireAdmin();
    const token = await getBackendToken();
    if (!token) throw new Error("No backend token");

    const res = await fetch(`${backendUrl}/admin/users`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
    });
    if (!res.ok) throw new Error("Failed to fetch users");
    return await res.json();
}

export async function updateUserRoleAction(userId: string, newRole: "admin" | "user") {
    await requireAdmin();
    const token = await getBackendToken();
    if (!token) throw new Error("No backend token");

    const res = await fetch(`${backendUrl}/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ role: newRole })
    });
    if (!res.ok) {
        const err = await res.json();
        return { error: err.message || "Failed to update user role" };
    }

    revalidatePath("/admin/users");
    return { success: true };
}

export async function getWorkspacesAction() {
    await requireAdmin();
    const token = await getBackendToken();
    if (!token) throw new Error("No backend token");

    const res = await fetch(`${backendUrl}/admin/workspaces`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
    });
    if (!res.ok) throw new Error("Failed to fetch workspaces");
    return await res.json();
}

export async function toggleGlobalAiAccessAction(workspaceId: string, allowed: boolean) {
    await requireAdmin();
    const token = await getBackendToken();
    if (!token) throw new Error("No backend token");

    const res = await fetch(`${backendUrl}/admin/workspaces/${workspaceId}/global-ai`, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ allowed })
    });
    if (!res.ok) {
        const err = await res.json();
        return { error: err.message || "Failed to toggle AI access" };
    }

    revalidatePath("/admin/workspaces");
    return { success: true };
}

export async function updateWorkspacePlanAction(workspaceId: string, data: any) {
    await requireAdmin();
    const token = await getBackendToken();
    if (!token) throw new Error("No backend token");

    const res = await fetch(`${backendUrl}/admin/workspaces/${workspaceId}/plan`, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to update workspace plan");

    revalidatePath("/admin/workspaces");
    return { success: true };
}

export async function getEscalationsAction() {
    await requireAdmin();
    const token = await getBackendToken();
    if (!token) throw new Error("No backend token");

    const res = await fetch(`${backendUrl}/admin/escalations`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
    });
    if (!res.ok) throw new Error("Failed to fetch escalations");
    return await res.json();
}

export async function resolveEscalationAction(interactionId: string) {
    await requireAdmin();
    const token = await getBackendToken();
    if (!token) throw new Error("No backend token");

    const res = await fetch(`${backendUrl}/admin/escalations/${interactionId}/resolve`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to resolve escalation");

    revalidatePath("/admin/escalations");
    return { success: true };
}

export async function getWebhooksAction() {
    await requireAdmin();
    const token = await getBackendToken();
    if (!token) throw new Error("No backend token");

    const res = await fetch(`${backendUrl}/admin/webhooks`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
    });
    if (!res.ok) throw new Error("Failed to fetch webhooks");
    return await res.json();
}

export async function getWebhookSecretsAction() {
    await requireAdmin();
    const token = await getBackendToken();
    if (!token) throw new Error("No backend token");

    const res = await fetch(`${backendUrl}/admin/webhooks/secrets`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
    });
    if (!res.ok) throw new Error("Failed to fetch webhook secrets");
    return await res.json();
}

export async function getAuditLogsAction() {
    await requireAdmin();
    const token = await getBackendToken();
    if (!token) throw new Error("No backend token");

    const res = await fetch(`${backendUrl}/admin/audit-logs`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
    });
    if (!res.ok) throw new Error("Failed to fetch audit logs");
    return await res.json();
}

export async function getAdminOverviewAction() {
    await requireAdmin();
    const token = await getBackendToken();
    if (!token) throw new Error("No backend token");

    const res = await fetch(`${backendUrl}/admin/overview`, {
        headers: { "Authorization": `Bearer ${token}` },
        cache: 'no-store'
    });
    if (!res.ok) throw new Error("Failed to fetch admin overview");
    return await res.json();
}

export async function toggleAiPauseAction(workspaceId: string, platformId: string) {
    await requireAdmin();
    const token = await getBackendToken();
    if (!token) throw new Error("No backend token");

    const res = await fetch(`${backendUrl}/admin/customers/pause`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ workspaceId, platformId })
    });

    if (!res.ok) {
        return { error: "Failed to toggle AI pause" };
    }

    const data = await res.json();
    revalidatePath("/dashboard/customers");
    return { success: true, paused: data.paused };
}

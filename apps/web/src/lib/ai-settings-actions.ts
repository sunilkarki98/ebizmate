"use server";

import { auth } from "@/lib/auth";
import { apiClient, requireAdmin } from "@/lib/api-client";
import { revalidatePath } from "next/cache";
import { aiSettingsSchema, fetchModelsSchema } from "@/lib/validation";
import { z } from "zod";

type AISettingsData = z.infer<typeof aiSettingsSchema>;

// --- Get AI Settings (masked keys for frontend) ---

export async function getAISettingsAction() {
    await requireAdmin();

    try {
        return await apiClient(`/admin/ai-settings`);
    } catch {
        return null; // Return null to indicate failure, let frontend handle it
    }
}

// --- Update AI Settings (admin only) ---

export async function updateAISettingsAction(data: AISettingsData) {
    const validated = aiSettingsSchema.parse(data);
    await requireAdmin();

    try {
        await apiClient(`/admin/ai-settings`, {
            method: "PUT",
            body: JSON.stringify(validated)
        });

        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (e: any) {
        return { error: e.message || "Unknown error" };
    }
}

// --- Test Provider Connection (admin only) ---

export async function testProviderAction() {
    await requireAdmin();

    try {
        const data = await apiClient(`/ai/test-connection`, {
            method: "POST"
        });

        return {
            success: true,
            provider: data.provider,
            model: data.model,
            response: data.response,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

// --- Platform-wide Usage Statistics (admin only) ---

export async function getUsageStatsAction() {
    await requireAdmin();

    try {
        return await apiClient(`/admin/usage-stats`);
    } catch {
        return {
            last7Days: [],
            allTime: { totalCalls: 0, totalTokens: 0 },
        };
    }
}

// --- Helper: Check if current user is admin (for UI) ---

export async function isAdminAction(): Promise<boolean> {
    const session = await auth('admin');
    if (!session?.user?.id) return false;
    return (session.user as { role?: string }).role === "admin";
}

// --- Fetch Available Models (for UI Redesign) ---

export async function fetchAvailableModelsAction(provider: string, apiKey: string) {
    const validated = fetchModelsSchema.parse({ provider, apiKey });
    await requireAdmin();

    try {
        return await apiClient(`/admin/fetch-models`, {
            method: "POST",
            body: JSON.stringify(validated)
        });
    } catch (e: any) {
        return {
            success: false,
            error: e.message || "Failed to connect. Check your API Key."
        };
    }
}

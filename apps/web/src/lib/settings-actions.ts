"use server";

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { updateIdentitySchema, updateAiSettingsSchema } from "@ebizmate/contracts";
import { apiClient } from "@/lib/api-client";

export async function updateWorkspaceAISettingsAction(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const parsed = updateAiSettingsSchema.safeParse({
        coachProvider: formData.get("coachProvider") || undefined,
        customerProvider: formData.get("customerProvider") || undefined,
        openaiApiKey: formData.get("openaiApiKey") || undefined,
        geminiApiKey: formData.get("geminiApiKey") || undefined,
        openrouterApiKey: formData.get("openrouterApiKey") || undefined,
        groqApiKey: formData.get("groqApiKey") || undefined,
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid settings content" };
    }

    try {
        await apiClient(`/settings/ai`, {
            method: "PUT",
            body: JSON.stringify(parsed.data)
        });
    } catch (e: any) {
        return { error: e.message || "Failed to update AI settings" };
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
}

export async function updateIdentityAction(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const parsed = updateIdentitySchema.safeParse({
        workspaceName: formData.get("workspaceName"),
        platform: formData.get("platform"),
        platformHandle: formData.get("platformHandle"),
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid identity content" };
    }

    try {
        await apiClient(`/settings/identity`, {
            method: "PUT",
            body: JSON.stringify(parsed.data)
        });
    } catch (e: any) {
        return { error: e.message || "Failed to update identity" };
    }

    revalidatePath("/dashboard");
    return { success: true };
}

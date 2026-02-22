"use server";

import { auth, getBackendToken } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const identitySchema = z.object({
    workspaceName: z.string().min(2),
    platform: z.enum(["generic", "tiktok", "instagram", "facebook", "whatsapp"]),
    platformHandle: z.string().optional(),
});

const aiSchema = z.object({
    coachProvider: z.enum(["openai", "gemini", "openrouter", "groq"]).optional(),
    customerProvider: z.enum(["openai", "gemini", "openrouter", "groq"]).optional(),
    openaiApiKey: z.string().optional(),
    geminiApiKey: z.string().optional(),
    openrouterApiKey: z.string().optional(),
    groqApiKey: z.string().optional(),
});

export async function updateWorkspaceAISettingsAction(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const parsed = aiSchema.safeParse({
        coachProvider: formData.get("coachProvider"),
        customerProvider: formData.get("customerProvider"),
        openaiApiKey: formData.get("openaiApiKey"),
        geminiApiKey: formData.get("geminiApiKey"),
        openrouterApiKey: formData.get("openrouterApiKey"),
        groqApiKey: formData.get("groqApiKey"),
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0].message };
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const backendToken = await getBackendToken();

    try {
        const response = await fetch(`${backendUrl}/settings/ai`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${backendToken}`
            },
            body: JSON.stringify(parsed.data)
        });

        if (!response.ok) {
            const error = await response.json();
            return { error: error.message || "Failed to update AI settings" };
        }
    } catch (e: any) {
        return { error: e.message || "Failed to connect to API" };
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
}

export async function updateIdentityAction(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const parsed = identitySchema.safeParse({
        workspaceName: formData.get("workspaceName"),
        platform: formData.get("platform"),
        platformHandle: formData.get("platformHandle"),
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0].message };
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const backendToken = await getBackendToken();

    try {
        const response = await fetch(`${backendUrl}/settings/identity`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${backendToken}`
            },
            body: JSON.stringify(parsed.data)
        });

        if (!response.ok) {
            const error = await response.json();
            return { error: error.message || "Failed to update identity" };
        }
    } catch (e: any) {
        return { error: e.message || "Failed to connect to API" };
    }

    revalidatePath("/dashboard");
    return { success: true };
}

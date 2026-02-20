"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, aiSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
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

import { encrypt } from "@/lib/crypto";

export async function updateWorkspaceAISettingsAction(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, session.user.id),
        with: { aiSettings: true }
    });

    if (!workspace) return { error: "Workspace not found" };

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

    const updates: Record<string, any> = {};
    if (parsed.data.coachProvider) updates.coachProvider = parsed.data.coachProvider;
    if (parsed.data.customerProvider) updates.customerProvider = parsed.data.customerProvider;

    // Encrypt provided keys
    if (parsed.data.openaiApiKey) updates.openaiApiKey = encrypt(parsed.data.openaiApiKey);
    if (parsed.data.geminiApiKey) updates.geminiApiKey = encrypt(parsed.data.geminiApiKey); // We now encrypt all keys for user safety
    if (parsed.data.openrouterApiKey) updates.openrouterApiKey = encrypt(parsed.data.openrouterApiKey);
    if (parsed.data.groqApiKey) updates.groqApiKey = encrypt(parsed.data.groqApiKey);

    if (Object.keys(updates).length > 0) {
        if (workspace.aiSettings) {
            await db.update(aiSettings)
                .set({ ...updates, updatedAt: new Date() })
                .where(eq(aiSettings.workspaceId, workspace.id));
        } else {
            await db.insert(aiSettings)
                .values({
                    workspaceId: workspace.id,
                    ...updates
                });
        }
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
}

export async function updateIdentityAction(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, session.user.id),
    });

    if (!workspace) return { error: "Workspace not found" };

    const parsed = identitySchema.safeParse({
        workspaceName: formData.get("workspaceName"),
        platform: formData.get("platform"),
        platformHandle: formData.get("platformHandle"),
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0].message };
    }

    const { workspaceName, platform, platformHandle } = parsed.data;

    await db.update(workspaces)
        .set({
            name: workspaceName,
            platform,
            platformHandle: platformHandle || null,
            updatedAt: new Date(),
        })
        .where(eq(workspaces.id, workspace.id));

    revalidatePath("/dashboard");
    return { success: true };
}

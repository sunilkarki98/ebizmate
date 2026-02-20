"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiSettings, aiUsageLog } from "@/db/schema";
import { eq, gte, sql, and } from "drizzle-orm";
import { encrypt, decrypt, maskApiKey } from "@/lib/crypto";
import { aiSettingsSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { getAIService } from "@/lib/ai/services/factory";
import OpenAI from "openai";

// --- Helper: Require admin role ---

async function requireAdmin() {
    const session = await auth('admin');
    if (!session?.user?.id) throw new Error("Unauthorized");

    const role = (session.user as { role?: string }).role;
    if (role !== "admin") throw new Error("Forbidden: Admin access required");

    return session.user;
}

// --- Get AI Settings (masked keys for frontend) ---

export async function getAISettingsAction() {
    await requireAdmin();

    const settings = await db.query.aiSettings.findFirst({
        where: eq(aiSettings.workspaceId, "global"),
    });

    if (!settings) {
        return {
            coachProvider: "openai" as const,
            coachModel: "gpt-4o-mini",
            customerProvider: "groq" as const,
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
            systemPromptTemplate: null as string | null,
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

// --- Update AI Settings (admin only) ---

export async function updateAISettingsAction(data: {
    coachProvider: string;
    coachModel: string;
    customerProvider: string;
    customerModel: string;
    openaiApiKey?: string;
    openaiModel: string;
    openaiEmbeddingModel: string;
    geminiApiKey?: string;
    geminiModel: string;
    openrouterApiKey?: string;
    openrouterModel: string;
    groqApiKey?: string;
    groqModel: string;
    temperature: string;
    maxTokens: number;
    topP: string;
    systemPromptTemplate: string | null;
    rateLimitPerMinute: number;
    retryAttempts: number;
}) {
    await requireAdmin();

    const parsed = aiSettingsSchema.safeParse(data);
    if (!parsed.success) {
        return { error: parsed.error.issues.map(i => i.message).join(", ") };
    }

    // Get existing global settings
    const existing = await db.query.aiSettings.findFirst({
        where: eq(aiSettings.workspaceId, "global"),
    });

    // Encrypt API keys only if new ones are provided
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
        workspaceId: "global", // Enforce global
        coachProvider: parsed.data.coachProvider,
        coachModel: parsed.data.coachModel,
        customerProvider: parsed.data.customerProvider,
        customerModel: parsed.data.customerModel,
        openaiApiKey,
        openaiModel: parsed.data.openaiModel,
        openaiEmbeddingModel: parsed.data.openaiEmbeddingModel,
        geminiApiKey,
        geminiModel: parsed.data.geminiModel,
        openrouterApiKey,
        openrouterModel: parsed.data.openrouterModel,
        groqApiKey,
        groqModel: parsed.data.groqModel,
        temperature: parsed.data.temperature,
        maxTokens: parsed.data.maxTokens,
        topP: parsed.data.topP,
        systemPromptTemplate: parsed.data.systemPromptTemplate || null,
        rateLimitPerMinute: parsed.data.rateLimitPerMinute,
        retryAttempts: parsed.data.retryAttempts,
        updatedAt: new Date(),
    };

    if (existing) {
        await db.update(aiSettings)
            .set(values)
            .where(eq(aiSettings.id, existing.id));
    } else {
        await db.insert(aiSettings).values(values);
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
}

// --- Test Provider Connection (admin only) ---

export async function testProviderAction() {
    await requireAdmin();

    try {
        // Use "global" as workspace ID — factory loads global config
        const ai = await getAIService("global", "customer");
        const result = await ai.chat({
            systemPrompt: "You are a helpful assistant. Reply with exactly: CONNECTION_OK",
            userMessage: "Test connection. Reply with: CONNECTION_OK",
        });

        return {
            success: true,
            provider: ai.settings.customerProvider,
            model: result.model,
            response: result.content.slice(0, 200),
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

    // Total all-time stats across all workspaces
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

// --- Helper: Check if current user is admin (for UI) ---

export async function isAdminAction(): Promise<boolean> {
    const session = await auth('admin');
    if (!session?.user?.id) return false;
    return (session.user as { role?: string }).role === "admin";
}


// --- Fetch Available Models (for UI Redesign) ---


export async function fetchAvailableModelsAction(provider: string, apiKey: string) {
    await requireAdmin();

    let finalApiKey = apiKey;

    // If the frontend passed a masked key (e.g. from the vault), or empty, try grabbing from DB
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
                try {
                    finalApiKey = decrypt(encryptedKey);
                } catch (e) {
                    console.error("Failed to decrypt stored key for dynamic fetch");
                }
            }
        }
    } else if (apiKey.includes(":")) {
        // Handle explicit encrypted keys from frontend (fallback)
        try {
            const decrypted = decrypt(apiKey);
            if (decrypted) finalApiKey = decrypted;
        } catch (e) {
            // Treat as raw key
        }
    }

    if (!finalApiKey || finalApiKey.startsWith("••") || finalApiKey === "existing") {
        return { error: "A valid API Key is required to fetch models." };
    }

    try {
        if (provider === "openai") {
            const client = new OpenAI({ apiKey: finalApiKey });
            const list = await client.models.list();
            // Filter for chat models (gpt-*) and sort
            const models = list.data
                .filter(m => m.id.startsWith("gpt-") && !m.id.includes("instruct") && !m.id.includes("realtime"))
                .map(m => m.id)
                .sort();
            return { success: true, models };
        }

        if (provider === "gemini") {
            try {
                // SECURITY: Send API key via header, NOT URL query parameter
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, {
                    headers: {
                        "x-goog-api-key": finalApiKey,
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `API Error: ${response.statusText}`);
                }

                const data = await response.json();
                const models = (data.models || [])
                    .filter((m: any) =>
                        m.name.startsWith("models/gemini") &&
                        m.supportedGenerationMethods?.includes("generateContent")
                    )
                    .map((m: any) => m.name.replace("models/", ""))
                    .sort()
                    .reverse();

                if (models.length > 0) {
                    return { success: true, models };
                }
            } catch (error: any) {
                console.error("Gemini dynamic fetch failed:", error);
                if (error.message.includes("API key") || error.message.includes("400") || error.message.includes("403")) {
                    throw error;
                }
            }

            // Static Fallback (if fetch failed but wasn't auth error, or if we want to ensure *some* models appear)
            return {
                success: true,
                models: [
                    "gemini-2.0-flash",
                    "gemini-2.0-flash-lite",
                    "gemini-1.5-pro",
                    "gemini-1.5-flash",
                    "gemini-1.5-flash-8b",
                    "gemini-1.0-pro"
                ]
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
                    .filter((m: any) => m.id && !m.id.includes("disabled"))
                    .map((m: any) => m.id)
                    .sort();

                if (models.length > 0) {
                    return { success: true, models };
                }
            } catch (error: any) {
                console.error("OpenRouter dynamic fetch failed:", error);
                if (error.message.includes("API") || error.message.includes("401") || error.message.includes("403")) {
                    throw error;
                }
            }

            // Static fallback
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
                const client = new OpenAI({
                    apiKey: finalApiKey,
                    baseURL: "https://api.groq.com/openai/v1"
                });
                const list = await client.models.list();
                const models = list.data
                    .map(m => m.id)
                    .sort();

                if (models.length > 0) {
                    return { success: true, models };
                }
            } catch (error: any) {
                console.error("Groq dynamic fetch failed:", error);
                if (error.message.includes("API") || error.message.includes("401") || error.message.includes("403")) {
                    throw error;
                }
            }

            // Static fallback
            return {
                success: true,
                models: [
                    "llama-3.3-70b-versatile",
                    "llama-3.1-8b-instant",
                    "mixtral-8x7b-32768",
                    "gemma2-9b-it",
                    "deepseek-r1-distill-llama-70b"
                ]
            };
        }

        return { error: "Invalid provider" };
    } catch (error: any) {
        console.error("Model fetch failed:", error);
        return {
            success: false,
            error: error.message || "Failed to connect. Check your API Key."
        };
    }
}

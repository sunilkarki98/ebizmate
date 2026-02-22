"use server";

import { auth, getBackendToken } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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

    const backendToken = await getBackendToken();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
        const response = await fetch(`${backendUrl}/admin/ai-settings`, {
            headers: {
                "Authorization": `Bearer ${backendToken}`
            }
        });

        if (!response.ok) throw new Error("Failed to fetch settings");
        return await response.json();
    } catch {
        // Return defaults if backend is unreachable
        return {
            coachProvider: "openai",
            coachModel: "gpt-4o-mini",
            customerProvider: "groq",
            customerModel: "llama-3.3-70b-versatile",
            openaiApiKeyMasked: "",
            openaiApiKeySet: false,
            openaiModel: "gpt-4o-mini",
            openaiEmbeddingModel: "text-embedding-3-small",
            geminiApiKeySet: false,
            geminiModel: "gemini-2.0-flash",
            openrouterApiKeyMasked: "",
            openrouterApiKeySet: false,
            openrouterModel: "meta-llama/llama-3.3-70b-instruct",
            groqApiKeyMasked: "",
            groqApiKeySet: false,
            groqModel: "llama-3.3-70b-versatile",
            temperature: "0.7",
            maxTokens: 1024,
            topP: "1.0",
            systemPromptTemplate: null,
            rateLimitPerMinute: 60,
            retryAttempts: 3,
        };
    }
}

// --- Update AI Settings (admin only) ---

export async function updateAISettingsAction(data: any) {
    await requireAdmin();

    const backendToken = await getBackendToken();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
        const response = await fetch(`${backendUrl}/admin/ai-settings`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${backendToken}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const err = await response.json();
            return { error: err.message || "Failed to update settings" };
        }

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
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const backendToken = await getBackendToken();
        const response = await fetch(`${backendUrl}/ai/test-connection`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${backendToken}`
            }
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Failed to test connection");
        }

        const data = await response.json();

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

    const backendToken = await getBackendToken();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
        const response = await fetch(`${backendUrl}/admin/usage-stats`, {
            headers: {
                "Authorization": `Bearer ${backendToken}`
            }
        });

        if (!response.ok) throw new Error("Failed to fetch stats");
        return await response.json();
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
    await requireAdmin();

    const backendToken = await getBackendToken();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
        const response = await fetch(`${backendUrl}/admin/fetch-models`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${backendToken}`
            },
            body: JSON.stringify({ provider, apiKey })
        });

        if (!response.ok) {
            const err = await response.json();
            return { error: err.error || err.message || "Failed to fetch models" };
        }

        return await response.json();
    } catch (e: any) {
        return {
            success: false,
            error: e.message || "Failed to connect. Check your API Key."
        };
    }
}

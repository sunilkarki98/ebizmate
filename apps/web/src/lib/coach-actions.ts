"use server";

import { apiClient } from "@/lib/api-client";

type CoachResponse =
    | { success: true; reply: string }
    | { success: false; error: string };

function formatCoachError(error: any): string {
    const msg = error?.message || String(error);

    // Hard Quota Exhaustion (Gemini Free Tier, OpenAI Zero Balance)
    if (msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("exceeded")) {
        return "You have exceeded your AI provider's quota limit. Please check your billing dashboard.";
    }

    // Temporary Rate Limits (OpenRouter 429, High Traffic)
    if (msg.includes("429") || msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("too many requests")) {
        return "I'm currently receiving too many requests. Please wait a minute and try again. (Tip: You can change your AI provider in the Settings page!)";
    }

    // Check for specific Trial bounds
    if (msg.includes("AI_TRIAL_EXPIRED")) {
        return "Your AI trial has expired. Please add your own API key in the AI Settings to continue.";
    }

    // Generic fallback for giant JSON errors
    if (msg.includes("{") && msg.includes("}")) {
        return "The AI provider returned an unexpected error. Please check your API keys or try a different model in Settings.";
    }

    return msg;
}

// --- Fetch previous conversation history ---
export async function getCoachHistoryAction() {
    try {
        return await apiClient(`/ai/coach/history`);
    } catch {
        return [];
    }
}

export async function interactWithCoach(message: string, history: Array<{ role: "user" | "coach"; content: string }>): Promise<CoachResponse> {
    try {
        let reply = "";
        try {
            const data = await apiClient(`/ai/coach/chat`, {
                method: "POST",
                body: JSON.stringify({ message, history })
            });
            reply = data.reply;
        } catch (error: any) {
            console.error("AI Coach Backend Error:", error);
            throw error;
        }

        return { success: true, reply };
    } catch (error: any) {
        console.error("Coach Error:", error);
        const cleanMessage = formatCoachError(error);
        return { success: false, error: cleanMessage };
    }
}

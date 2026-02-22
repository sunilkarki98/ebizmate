"use server";

import { auth, getBackendToken } from "@/lib/auth";

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
    const backendToken = await getBackendToken();
    if (!backendToken) return [];

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
        const response = await fetch(`${backendUrl}/ai/coach/history`, {
            headers: {
                "Authorization": `Bearer ${backendToken}`
            }
        });
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        return [];
    }
}

export async function interactWithCoach(message: string, history: Array<{ role: "user" | "coach"; content: string }>): Promise<CoachResponse> {
    const backendToken = await getBackendToken();
    if (!backendToken) throw new Error("Failed to authenticate with backend API");

    try {
        // Removed frontend DB insert - logic moved to backend API

        // 2. Process with AI via NestJS
        let reply = "";
        try {
            const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const response = await fetch(`${backendUrl}/ai/coach/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${backendToken}`
                },
                body: JSON.stringify({ message, history })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to communicate with AI Coach");
            }

            const data = await response.json();
            reply = data.reply;
        } catch (error: any) {
            console.error("AI Coach Backend Error:", error);
            throw error; // Let the outer catch handle formatting
        }

        // Removed frontend DB insert - logic moved to backend API

        // NOTE: Do NOT call revalidatePath here.
        // The coach client manages its own message state.
        // Calling revalidatePath remounts the layout → client → useEffect loop.
        return { success: true, reply };
    } catch (error: any) {
        console.error("Coach Error:", error);

        // Use our clean formatter
        const cleanMessage = formatCoachError(error);
        return { success: false, error: cleanMessage };
    }
}

"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaces, coachConversations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { processCoachMessage } from "@/lib/ai/coach/agent";


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
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const userWorkspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, session.user.id)
    });

    if (!userWorkspace) return [];

    // Load last 50 messages to match agent memory depth
    const messages = await db.query.coachConversations.findMany({
        where: eq(coachConversations.workspaceId, userWorkspace.id),
        orderBy: [desc(coachConversations.createdAt)],
        limit: 50,
    });

    // DB returns newest first because of desc(), we want oldest first for UI
    return messages.reverse().map(m => ({
        id: m.id,
        role: m.role as "user" | "coach",
        content: m.content,
        createdAt: m.createdAt?.getTime() || Date.now()
    }));
}

export async function interactWithCoach(message: string, history: Array<{ role: "user" | "coach"; content: string }>): Promise<CoachResponse> {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const userWorkspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, session.user.id)
    });

    if (!userWorkspace) throw new Error("No workspace found");

    try {
        // 1. Save user message immediately
        try {
            await db.insert(coachConversations).values({
                workspaceId: userWorkspace.id,
                role: "user",
                content: message
            });
        } catch (dbError) {
            console.error("Failed to save user message to DB:", dbError);
            return { success: false, error: "Database error: Could not save your message. Please try again." };
        }

        // 2. Process with AI
        const reply = await processCoachMessage(userWorkspace.id, message, history);

        // 3. Save Coach reply
        try {
            await db.insert(coachConversations).values({
                workspaceId: userWorkspace.id,
                role: "coach",
                content: reply
            });
        } catch (dbError) {
            console.error("Failed to save coach reply to DB:", dbError);
            // We still return success: true because the AI generated a reply, 
            // but it won't be in the history next time.
        }

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

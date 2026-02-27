import { db, workspaces, interactions, coachConversations } from "@ebizmate/db";
import { eq, and, gt, desc } from "drizzle-orm";
import { getAIService } from "../services/factory.js";
import { isDragonflyAvailable, dragonfly } from "@ebizmate/shared";

export async function sendMorningBriefing(workspaceId: string) {
    console.log(`[Cron] Triggering Morning Briefing for workspace ${workspaceId}`);

    // 1. Gather Context
    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId)
    });
    if (!workspace || !workspace.settings?.ai_active) return;
    // L-3 FIX: Skip briefing if workspace has no business name configured
    if (!workspace.businessName && !workspace.name) return;

    // Get unresolved tickets from last 24h
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pendingTickets = await db.select()
        .from(interactions)
        .where(and(
            eq(interactions.workspaceId, workspaceId),
            eq(interactions.status, "ACTION_REQUIRED"),
            gt(interactions.createdAt, yesterday)
        ));

    const ai = await getAIService(workspaceId, "coach");

    // 2. Prompt the AI Contextually
    const systemPrompt = `You are a proactive, helpful AI Business Manager for "${workspace.businessName || 'this business'}".
It is morning. You are sending a daily briefing to the business owner to start their day.
Be warm, professional, but very concise.

CONTEXT:
Pending/Unresolved Customer Messages from last 24h: ${pendingTickets.length}

If there are pending tickets, kindly remind them to check the Inbox. If zero, tell them they are all caught up and wish them a great day selling!`;

    const result = await ai.chat({
        systemPrompt,
        userMessage: "Generate my morning briefing right now.",
        temperature: 0.4
    }, undefined, "coach_chat");

    const message = result.content.trim();

    // 3. Inject message directly into conversation state (Ghost Ingestion)
    await db.insert(coachConversations).values({
        workspaceId,
        role: "coach",
        content: message,
    });

    console.log(`[Cron] Morning Briefing created for ${workspaceId}.`);

    // M-2 FIX: Wrap Redis publish in try/catch — failure should not crash the cron
    try {
        if (isDragonflyAvailable() && dragonfly) {
            await dragonfly.publish('realtime_notifications', JSON.stringify({
                type: 'coach_message',
                workspaceId,
                userId: workspace.userId
            }));
        }
    } catch (publishErr) {
        console.error(`[Cron] Failed to publish morning briefing notification for ${workspaceId}:`, publishErr);
    }
}

export async function sendEveningSummary(workspaceId: string) {
    console.log(`[Cron] Triggering Evening Summary for workspace ${workspaceId}`);

    // 1. Gather Context
    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId)
    });
    if (!workspace || !workspace.settings?.ai_active) return;
    // L-3 FIX: Skip summary if workspace has no business name configured
    if (!workspace.businessName && !workspace.name) return;

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allInteractions = await db.select()
        .from(interactions)
        .where(and(
            eq(interactions.workspaceId, workspaceId),
            gt(interactions.createdAt, today)
        ));

    const handled = allInteractions.filter(i => i.status === "PROCESSED").length;
    const escalated = allInteractions.filter(i => i.status === "ACTION_REQUIRED").length;

    const ai = await getAIService(workspaceId, "coach");

    // 2. Prompt the AI Contextually
    const systemPrompt = `You are a proactive, helpful AI Business Manager for "${workspace.businessName || 'this business'}".
It is evening (end of the work day). You are sending a daily wrap-up to the business owner.
Be encouraging and concise.

CONTEXT TODAY:
- AI Automatically Handled: ${handled} conversations
- Required Human Help: ${escalated} conversations

Highlight how much time you saved them today by handling ${handled} chats. Tell them to have a good evening.`;

    const result = await ai.chat({
        systemPrompt,
        userMessage: "Generate my evening summary right now.",
        temperature: 0.4
    }, undefined, "coach_chat");

    const message = result.content.trim();

    // 3. Inject message directly into conversation state (Ghost Ingestion)
    await db.insert(coachConversations).values({
        workspaceId,
        role: "coach",
        content: message,
    });

    console.log(`[Cron] Evening Summary created for ${workspaceId}.`);

    // M-2 FIX: Wrap Redis publish in try/catch — failure should not crash the cron
    try {
        if (isDragonflyAvailable() && dragonfly) {
            await dragonfly.publish('realtime_notifications', JSON.stringify({
                type: 'coach_message',
                workspaceId,
                userId: workspace.userId
            }));
        }
    } catch (publishErr) {
        console.error(`[Cron] Failed to publish evening summary notification for ${workspaceId}:`, publishErr);
    }
}

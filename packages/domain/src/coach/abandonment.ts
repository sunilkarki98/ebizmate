import { db, customers, interactions, workspaces, coachConversations } from "@ebizmate/db";
import { eq, and, lt, lte, gt, not, inArray } from "drizzle-orm";
import { PlatformFactory, decrypt, checkOutboundRateLimit } from "@ebizmate/shared";
import { getAIService } from "../services/factory.js";
import { randomUUID } from "crypto";

// System-generated sourceIds that should NOT count as "customer replied"
const SYSTEM_SOURCE_IDS = ["abandonment_recovery", "smart_notification"];

/**
 * Executes the fast Browse Abandonment Recovery sequence.
 * This should be called via cron every 1 minute.
 */
export async function processAbandonmentRecovery() {
    console.log("[Abandonment] Running Fast Recovery Check...");

    const now = new Date();
    // 2 minutes ago
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60000);
    // 1 hour ago
    const oneHourAgo = new Date(now.getTime() - 60 * 60000);

    // ───────────────────────────────────────────────────────────────────────────
    // Phase 1: The Helpful Push (1-2 Min Follow-up)
    // Find customers who were sent a carousel > 2 mins ago but haven't replied
    // ───────────────────────────────────────────────────────────────────────────
    const pendingCustomers = await db.query.customers.findMany({
        where: and(
            eq(customers.abandonmentStatus, "PENDING"),
            lte(customers.lastCarouselSentAt, twoMinutesAgo)
        ),
        with: { workspace: true }
    });

    for (const customer of pendingCustomers) {
        if (!customer.workspace) continue;

        // FIX #14: Verify they haven't sent a REAL message since carousel was sent
        // Exclude system-generated interactions (follow-ups, notifications)
        const recentInteractions = await db.query.interactions.findFirst({
            where: and(
                eq(interactions.workspaceId, customer.workspace.id),
                eq(interactions.authorId, customer.platformId),
                gt(interactions.createdAt, customer.lastCarouselSentAt!),
                not(inArray(interactions.sourceId, SYSTEM_SOURCE_IDS))
            )
        });

        // If they replied, clear their status
        if (recentInteractions) {
            await db.update(customers)
                .set({ abandonmentStatus: "NONE" })
                .where(eq(customers.id, customer.id));
            continue;
        }

        // They haven't replied. Send the 2-minute helpful check-in.
        await executeFastFollowUp(customer);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Phase 2: Seller Insight Loop (1 Hour Drop-off)
    // Find customers who were pushed > 1 hour ago but STILL haven't replied
    // ───────────────────────────────────────────────────────────────────────────
    const followedUpCustomers = await db.query.customers.findMany({
        where: and(
            eq(customers.abandonmentStatus, "FOLLOWED_UP"),
            lte(customers.lastCarouselSentAt, oneHourAgo)
        ),
        with: { workspace: true }
    });

    for (const customer of followedUpCustomers) {
        if (!customer.workspace) continue;

        // FIX #14: Same exclusion applies here
        const recentInteractions = await db.query.interactions.findFirst({
            where: and(
                eq(interactions.workspaceId, customer.workspace.id),
                eq(interactions.authorId, customer.platformId),
                gt(interactions.createdAt, customer.lastCarouselSentAt!),
                not(inArray(interactions.sourceId, SYSTEM_SOURCE_IDS))
            )
        });

        if (recentInteractions) {
            await db.update(customers)
                .set({ abandonmentStatus: "NONE" })
                .where(eq(customers.id, customer.id));
            continue;
        }

        // Still no reply. Flag as dropped and alert the seller.
        await alertSellerOfDropOff(customer);
    }
}

async function executeFastFollowUp(customer: any) {
    console.log(`[Abandonment] Triggering helpful push for customer ${customer.id}`);

    try {
        const ai = await getAIService(customer.workspaceId, "customer");

        const systemPrompt = `You are a highly helpful, non-pushy digital shopping assistant.
The customer was just looking at a visual gallery of your products about 2 minutes ago but hasn't responded.
Write a ONE SENTENCE, extremely brief, friendly check-in asking if they want to explore more options or if they have something specific in mind.
DO NOT sound like a desperate salesperson. Sound like a helpful associate asking 'did you find what you need?'.
Match the language they were speaking.`;

        const response = await ai.chat({
            systemPrompt,
            history: [],
            userMessage: `Context: Preferences are ${customer.preferencesSummary || "unknown"}. Generate the check-in message.`,
            temperature: 0.6,
            maxTokens: 50,
        });

        const reply = response.content;

        // FIX #2: Decrypt per-workspace access token instead of hard-coding
        let accessToken: string | undefined;
        if (customer.workspace.accessToken) {
            try { accessToken = decrypt(customer.workspace.accessToken); }
            catch { console.warn(`[Abandonment] Failed to decrypt access token for workspace ${customer.workspaceId}`); }
        }

        const client = PlatformFactory.getClient(customer.workspace.platform || "generic", {
            accessToken,
        });

        const sendParams: any = {
            to: customer.platformId,
            text: reply,
            workspaceId: customer.workspaceId
        };

        // FIX #12: Pass conversationId for TikTok DMs if available
        if (customer.lastConversationId) {
            sendParams.conversationId = customer.lastConversationId;
        }

        // H-3 FIX: Check outbound rate limit before sending
        const rateLimitOk = await checkOutboundRateLimit(customer.workspaceId);
        if (!rateLimitOk) {
            console.warn(`[Abandonment] Rate limited for workspace ${customer.workspaceId}, skipping follow-up.`);
            return;
        }

        await client.send(sendParams);

        // Update status so we don't nag them again
        await db.update(customers)
            .set({ abandonmentStatus: "FOLLOWED_UP" })
            .where(eq(customers.id, customer.id));

        // FIX #4: Use UUID to prevent externalId collisions in loops
        await db.insert(interactions).values({
            workspaceId: customer.workspaceId,
            sourceId: "abandonment_recovery",
            externalId: `sys-followup-${customer.id}-${randomUUID().slice(0, 8)}`,
            authorId: customer.platformId,
            authorName: customer.name || customer.platformHandle,
            customerId: customer.id, // L-1 FIX: Include customerId for inbox meta sync
            content: "(System generated browse abandonment check-in)",
            response: reply,
            status: "PROCESSED"
        });

    } catch (err: any) {
        console.error(`[Abandonment] Failed to execute follow up for ${customer.id}:`, err);
    }
}

async function alertSellerOfDropOff(customer: any) {
    console.log(`[Abandonment] Flagging dropped customer ${customer.id} for seller review`);

    try {
        await db.update(customers)
            .set({ abandonmentStatus: "DROPPED" })
            .where(eq(customers.id, customer.id));

        const interest = customer.preferencesSummary ? `interested in: ${customer.preferencesSummary.substring(0, 50)}...` : "browsing products";

        const message = `📉 **Customer Drop-off Insight**
A customer (${customer.name || customer.platformHandle || "Anonymous"}) was viewing your product carousels but abandoned the chat.
They were ${interest}.
*You might want to review this interaction to see if your offerings, pricing, or the product pictures need improvement to convert better.*`;

        await db.insert(coachConversations).values({
            workspaceId: customer.workspaceId,
            role: "coach",
            content: message,
        });
    } catch (err: any) {
        console.error(`[Abandonment] Failed to alert seller for ${customer.id}:`, err);
    }
}

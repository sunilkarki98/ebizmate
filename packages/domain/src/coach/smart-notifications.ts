import { db, customers, interactions, items } from "@ebizmate/db";
import { eq, and, like, lt, or, isNull } from "drizzle-orm";
import { PlatformFactory, decrypt, checkOutboundRateLimit } from "@ebizmate/shared";
import { getAIService } from "../services/factory.js";
import { randomUUID } from "crypto";

const MAX_NOTIFY_BATCH = 50; // Cap outreach per product to prevent rate-limit bans

/**
 * Triggered when a seller adds a new product.
 * Scans the customer base for matching interests and sends a personalized DM.
 */
export async function processSmartNewProductNotification(workspaceId: string, itemId: string) {
    console.log(`[SmartNotify] Analyzing new product ${itemId} for targeted outreach...`);

    const item = await db.query.items.findFirst({
        where: eq(items.id, itemId)
    });

    if (!item) return;

    // We need some category to match against
    if (!item.category) {
        console.log(`[SmartNotify] Item has no category, skipping targeted outreach.`);
        return;
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // FIX #1: Escape LIKE wildcards in category to prevent logic injection
    const safeCategory = item.category.toLowerCase().replace(/[%_]/g, '\\$&');

    // ───────────────────────────────────────────────────────────────────────────
    // The Anti-Spam Query:
    // Find customers whose preferencesSummary includes the item's category
    // EXCLUDE anyone who made a purchase in the last 7 days
    // FIX #5: Cap at MAX_NOTIFY_BATCH to prevent unbounded fan-out
    // ───────────────────────────────────────────────────────────────────────────
    const targetCustomers = await db.query.customers.findMany({
        where: and(
            eq(customers.workspaceId, workspaceId),
            like(customers.preferencesSummary, `%${safeCategory}%`),
            // Include customers who NEVER purchased (NULL) OR whose last purchase was > 7 days ago
            or(isNull(customers.lastPurchaseAt), lt(customers.lastPurchaseAt, sevenDaysAgo))
        ),
        with: { workspace: true },
        limit: MAX_NOTIFY_BATCH
    });

    console.log(`[SmartNotify] Found ${targetCustomers.length} targeted, non-fatigued customers for ${item.category}.`);

    // FIX #5: Process with concurrency limit (5 at a time) instead of sequential
    const CONCURRENCY = 5;
    for (let i = 0; i < targetCustomers.length; i += CONCURRENCY) {
        const batch = targetCustomers.slice(i, i + CONCURRENCY);
        await Promise.allSettled(
            batch.map(customer => {
                if (!customer.workspace) return Promise.resolve();
                return dispatchPersonalizedAnnouncement(customer, item);
            })
        );
    }
}

async function dispatchPersonalizedAnnouncement(customer: any, item: any) {
    try {
        // H-2 FIX: Skip if workspace is suspended or AI-blocked
        if (customer.workspace.status === 'suspended' || customer.workspace.aiBlocked) return;

        // H-3 FIX: Check outbound rate limit before sending
        const rateLimitOk = await checkOutboundRateLimit(customer.workspaceId);
        if (!rateLimitOk) {
            console.warn(`[SmartNotify] Rate limited for workspace ${customer.workspaceId}, skipping.`);
            return;
        }

        const ai = await getAIService(customer.workspaceId, "customer");
        const images = Array.isArray(item.images) ? item.images : [];
        const imageUrl = images.length > 0 ? images[0] : undefined;

        const systemPrompt = `You are a friendly digital shopping assistant.
A new product matching the customer's interests has just arrived.
Write a VERY SHORT, exciting, personalized message introducing the product.
Do NOT be pushy. Act like you are doing them a favor by remembering what they like.`;

        const response = await ai.chat({
            systemPrompt,
            history: [],
            userMessage: `Customer name: ${customer.name || 'Friend'}. Product Name: ${item.name}. Product Description: ${item.content || 'Great item'}. Generate the announcement message.`,
            temperature: 0.7,
            maxTokens: 100,
        });

        const reply = response.content;

        // FIX #2: Decrypt per-workspace access token instead of hard-coding
        let accessToken: string | undefined;
        if (customer.workspace.accessToken) {
            try { accessToken = decrypt(customer.workspace.accessToken); }
            catch { console.warn(`[SmartNotify] Failed to decrypt access token for workspace ${customer.workspaceId}`); }
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

        // Attach image if we have one
        if (imageUrl) {
            sendParams.mediaType = "image";
            sendParams.mediaUrl = imageUrl;
        }

        await client.send(sendParams);

        // FIX #4: Use randomUUID + customerId to prevent externalId collisions
        await db.insert(interactions).values({
            workspaceId: customer.workspaceId,
            sourceId: "smart_notification",
            externalId: `sys-notify-${customer.id}-${randomUUID().slice(0, 8)}`,
            authorId: customer.platformId,
            authorName: customer.name || customer.platformHandle,
            content: `(System Notification: New Product - ${item.name})`,
            response: reply,
            status: "PROCESSED"
        });

    } catch (err: any) {
        console.error(`[SmartNotify] Failed to notify customer ${customer.id}:`, err);
    }
}

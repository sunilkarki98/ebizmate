import { db, customers, workspaces, interactions } from '@ebizmate/db';
import { gt, and, lt, eq } from 'drizzle-orm';
import { PlatformFactory, decrypt, checkOutboundRateLimit } from '@ebizmate/shared';
import { getAIService } from '@ebizmate/domain';

/**
 * Post-Purchase Thank-You Job
 * 
 * Runs on a cron schedule (e.g. daily). Finds customers who purchased 
 * 3 days ago and sends them a simple, heartfelt "thank you for buying 
 * with us" message. No upsells, no cross-sells — just gratitude.
 * 
 * If the customer later has an issue with their product, the Customer Bot 
 * will detect the complaint intent and escalate it to the AI Coach (Seller).
 */
export async function runPostPurchaseThankYou() {
    console.log('[PostPurchase] Scanning for customers to thank...');

    const now = new Date();
    // Window: purchased between 3 and 4 days ago (so we only thank once)
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
    const fourDaysAgo = new Date(now.getTime() - (4 * 24 * 60 * 60 * 1000));

    try {
        const eligibleCustomers = await db.query.customers.findMany({
            where: and(
                gt(customers.lastPurchaseAt, fourDaysAgo),
                lt(customers.lastPurchaseAt, threeDaysAgo),
                eq(customers.aiPaused, false)
            ),
        });

        if (eligibleCustomers.length === 0) {
            console.log('[PostPurchase] No customers to thank today.');
            return;
        }

        console.log(`[PostPurchase] Found ${eligibleCustomers.length} customers to thank.`);

        for (const customer of eligibleCustomers) {
            try {
                await sendThankYou(customer);
            } catch (err) {
                console.error(`[PostPurchase] Failed to thank customer ${customer.id}:`, err);
            }
        }
    } catch (err) {
        console.error('[PostPurchase] Job failed:', err);
    }
}

async function sendThankYou(customer: any) {
    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, customer.workspaceId)
    });

    if (!workspace || !customer.platformId) return;

    // H-2 FIX: Skip suspended or AI-blocked workspaces
    if (workspace.status === 'suspended' || workspace.aiBlocked) return;

    // Generate a natural, warm thank-you in the customer's language
    const ai = await getAIService(customer.workspaceId, "customer");

    const aiResponse = await ai.chat({
        systemPrompt: [
            `You are the friendly AI assistant for ${workspace.businessName || "this business"}.`,
            `Write a SHORT, warm "thank you for your purchase" message to ${customer.name || "our customer"}.`,
            `Rules:`,
            `- Just express gratitude. Nothing else.`,
            `- Do NOT suggest other products.`,
            `- Do NOT ask them to leave a review.`,
            `- Keep it to 1-2 sentences max.`,
            `- Say if they need any help, they can message anytime.`,
            `- Match the customer's language if you can detect it from their name.`,
        ].join('\n'),
        history: [],
        userMessage: "Generate the thank-you message now.",
        temperature: 0.5,
        maxTokens: 100,
    });

    const reply = aiResponse.content.trim();
    if (!reply) return;

    // Send via platform
    let accessToken: string | undefined;
    if (workspace.accessToken) {
        try { accessToken = decrypt(workspace.accessToken); }
        catch { /* ignore */ }
    }

    const client = PlatformFactory.getClient(workspace.platform || "generic", {
        accessToken,
        rateLimitFn: checkOutboundRateLimit,
    });

    // H-3 FIX: Check outbound rate limit before sending
    const rateLimitOk = await checkOutboundRateLimit(customer.workspaceId);
    if (!rateLimitOk) {
        console.warn(`[PostPurchase] Rate limited for workspace ${customer.workspaceId}, skipping thank-you.`);
        return;
    }

    await client.send({
        to: customer.platformId,
        text: reply,
        workspaceId: customer.workspaceId,
    });

    // Log it so the bot remembers the conversation
    await db.insert(interactions).values({
        workspaceId: customer.workspaceId,
        sourceId: "post_purchase_thankyou",
        externalId: `thankyou-${customer.id}-${Date.now()}`,
        authorId: customer.platformId,
        customerId: customer.id,
        authorName: customer.name || "Customer",
        content: "(System: Post-purchase thank you sent)",
        response: reply,
        status: "PROCESSED",
        meta: { isPostPurchaseThankYou: true },
    });

    console.log(`[PostPurchase] Thanked ${customer.name || customer.id}`);
}

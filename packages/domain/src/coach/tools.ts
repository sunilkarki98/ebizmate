/**
 * Coach Tool Registry — Scalable tool system for the AI Coach.
 *
 * To add a new tool:
 * 1. Define a CoachTool object with name, description, parameters, schema, and execute
 * 2. Add it to the TOOL_REGISTRY array at the bottom
 * That's it — everything else (definition export, KNOWN_TOOLS, execution) is automatic.
 */

import { z } from "zod";
import { db } from "@ebizmate/db";
import { workspaces, items, orders, interactions, coachConversations, customers } from "@ebizmate/db";
import { eq, and, ilike, cosineDistance, sql, gt, desc, like } from "drizzle-orm";
import { parseDuration } from "@ebizmate/shared";
import { PlatformFactory, decrypt, checkOutboundRateLimit } from "@ebizmate/shared";

// ── Types ───────────────────────────────────────────────────────────────────

export interface ToolContext {
    workspaceId: string;
    workspace: any;
    ai: { embed(input: string, interactionId?: string): Promise<{ embedding: number[] }> };
}

export interface CoachTool {
    /** Unique tool name — used by the LLM */
    name: string;
    /** Description shown to the LLM so it knows when to call this tool */
    description: string;
    /** JSON Schema parameters for the LLM */
    parameters: Record<string, unknown>;
    /** Zod schema for server-side validation */
    schema: z.ZodType<any>;
    /** Execute the tool and return a human-readable result string */
    execute: (args: any, ctx: ToolContext) => Promise<string>;
}

// ── Tool Definitions ────────────────────────────────────────────────────────

const createItemTool: CoachTool = {
    name: "create_item",
    description: "Save a new fact, FAQ, product, service, or policy to the Knowledge Base. Also updates existing items if a similar one exists.",
    parameters: {
        type: "object",
        properties: {
            name: { type: "string", description: "Short descriptive title" },
            content: { type: "string", description: "Structured fact or answer" },
            category: { type: "string", enum: ["product", "service", "faq", "policy", "general"], description: "Knowledge category" },
            expires_in: { type: "string", description: "Optional duration string e.g. '7d', '24h'" }
        },
        required: ["name", "content", "category"]
    },
    schema: z.object({
        name: z.string().min(1).max(200).transform(s => s.trim()),
        content: z.string().min(1).max(5000).transform(s => s.trim()),
        category: z.enum(["product", "service", "faq", "policy", "general"]).default("general"),
        expires_in: z.string().max(20).optional(),
    }),
    execute: async (args, ctx) => {
        const { workspaceId, ai } = ctx;

        // Generate embedding (with fallback)
        let embedding: number[] | null = null;
        try { embedding = (await ai.embed(`${args.name}: ${args.content}`)).embedding; }
        catch (e) { console.warn("[Coach] Embedding failed, will be generated async:", e); }

        // Duplicate detection — vector similarity
        let existingItem = null;
        if (embedding) {
            const similarity = sql<number>`1 - (${cosineDistance(items.embedding, embedding)})`;
            const similarItems = await db.select().from(items)
                .where(and(eq(items.workspaceId, workspaceId), gt(similarity, 0.85)))
                .orderBy(desc(similarity))
                .limit(1);
            if (similarItems.length) existingItem = similarItems[0];
        }

        // Fallback: exact name match
        if (!existingItem) {
            existingItem = await db.query.items.findFirst({
                where: and(eq(items.workspaceId, workspaceId), ilike(items.name, args.name))
            });
        }

        const expiresAt = parseDuration(args.expires_in);

        if (existingItem) {
            await db.update(items).set({
                name: args.name,
                content: args.content,
                category: args.category,
                expiresAt,
                embedding: embedding || existingItem.embedding,
                updatedAt: new Date()
            }).where(eq(items.id, existingItem.id));
            return `✅ Updated existing "${args.name}" in Knowledge Base.`;
        } else {
            await db.insert(items).values({
                workspaceId,
                name: args.name,
                content: args.content,
                category: args.category,
                sourceId: "coach_learning",
                embedding,
                expiresAt
            });
            let msg = `✅ Saved "${args.name}" to Knowledge Base (${args.category}).`;
            if (expiresAt) msg += ` ⏰ Expires on ${expiresAt.toLocaleDateString()}`;
            return msg;
        }
    }
};

const updateConfigTool: CoachTool = {
    name: "update_config",
    description: "Update workspace settings like business name, industry, tone of voice, etc. Pass ONLY the fields you want to change.",
    parameters: {
        type: "object",
        properties: {
            businessName: { type: "string", description: "Business name" },
            industry: { type: "string", description: "Business industry" },
            toneOfVoice: { type: "string", description: "AI response tone" },
            about: { type: "string", description: "About the business" },
            targetAudience: { type: "string", description: "Target audience description" },
            language: { type: "string", description: "Primary language" },
            ai_active: { type: "boolean", description: "Enable/disable AI" }
        }
    },
    schema: z.object({
        businessName: z.string().max(100).optional(),
        industry: z.string().max(100).optional(),
        toneOfVoice: z.string().max(100).optional(),
        about: z.string().max(2000).optional(),
        targetAudience: z.string().max(2000).optional(),
        language: z.string().max(50).optional(),
        ai_active: z.boolean().optional(),
    }),
    execute: async (args, ctx) => {
        const { workspaceId } = ctx;
        const updates: Record<string, unknown> = {};

        // Read fresh settings to avoid read-modify-write race
        const freshWorkspace = await db.query.workspaces.findFirst({
            where: eq(workspaces.id, workspaceId),
            columns: { settings: true },
        });
        const currentSettings = { ...(freshWorkspace?.settings || {}) } as Record<string, unknown>;
        let settingsUpdated = false;

        if (args.ai_active !== undefined) { currentSettings.ai_active = args.ai_active; settingsUpdated = true; }
        if (args.language !== undefined) { currentSettings.language = args.language; settingsUpdated = true; }
        if (settingsUpdated) updates.settings = currentSettings;

        if (args.businessName) updates.businessName = args.businessName;
        if (args.industry) updates.industry = args.industry;
        if (args.toneOfVoice) updates.toneOfVoice = args.toneOfVoice;
        if (args.about) updates.about = args.about;
        if (args.targetAudience) updates.targetAudience = args.targetAudience;

        if (Object.keys(updates).length) {
            await db.update(workspaces).set(updates).where(eq(workspaces.id, workspaceId));
            const changedFields = Object.keys(updates).filter(k => k !== "settings");
            if (settingsUpdated) changedFields.push(...Object.keys(args).filter((k: string) => ["ai_active", "language"].includes(k)));
            return `✅ Updated: ${changedFields.join(", ")}`;
        }

        return "ℹ️ No configuration changes were needed.";
    }
};

const listItemsTool: CoachTool = {
    name: "list_items",
    description: "List all items currently in the Knowledge Base. Use this before creating items to avoid duplicates, or to answer the user when they ask what you already know.",
    parameters: {
        type: "object",
        properties: {
            category: { type: "string", enum: ["product", "service", "faq", "policy", "general"], description: "Filter by category (optional)" },
            limit: { type: "number", description: "Max items to return (default 20)" }
        }
    },
    schema: z.object({
        category: z.enum(["product", "service", "faq", "policy", "general"]).optional(),
        limit: z.number().min(1).max(50).default(20),
    }),
    execute: async (args, ctx) => {
        const { workspaceId } = ctx;
        const conditions = [eq(items.workspaceId, workspaceId)];
        if (args.category) conditions.push(eq(items.category, args.category));

        const results = await db.select({
            name: items.name,
            category: items.category,
            content: items.content,
        }).from(items)
            .where(and(...conditions))
            .orderBy(desc(items.updatedAt))
            .limit(args.limit || 20);

        if (results.length === 0) return "📭 Knowledge Base is empty. Start teaching me about your business!";

        const summary = results.map((item, i) =>
            `${i + 1}. [${item.category}] **${item.name}**: ${(item.content || "").substring(0, 80)}...`
        ).join("\n");

        return `📚 Knowledge Base (${results.length} items):\n${summary}`;
    }
};

const deleteItemTool: CoachTool = {
    name: "delete_item",
    description: "Delete a Knowledge Base item by its exact name. Use this when the user asks to remove outdated or incorrect information.",
    parameters: {
        type: "object",
        properties: {
            name: { type: "string", description: "Exact name of the item to delete" }
        },
        required: ["name"]
    },
    schema: z.object({
        name: z.string().min(1).max(200).transform(s => s.trim()),
    }),
    execute: async (args, ctx) => {
        const { workspaceId } = ctx;

        const existing = await db.query.items.findFirst({
            where: and(eq(items.workspaceId, workspaceId), ilike(items.name, args.name))
        });

        if (!existing) return `❌ Item "${args.name}" not found in Knowledge Base.`;

        await db.delete(items).where(eq(items.id, existing.id));
        return `🗑️ Deleted "${existing.name}" from Knowledge Base.`;
    }
};

const searchItemsTool: CoachTool = {
    name: "search_items",
    description: "Search the Knowledge Base by keyword. Use this to find specific information before answering questions about the business.",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string", description: "Search keyword or phrase" }
        },
        required: ["query"]
    },
    schema: z.object({
        query: z.string().min(1).max(200).transform(s => s.trim()),
    }),
    execute: async (args, ctx) => {
        const { workspaceId, ai } = ctx;

        // Try vector search first
        let results: Array<{ name: string; content: string | null; category: string | null }> = [];
        try {
            const { embedding } = await ai.embed(args.query);
            const similarity = sql<number>`1 - (${cosineDistance(items.embedding, embedding)})`;
            results = await db.select({
                name: items.name,
                content: items.content,
                category: items.category,
            }).from(items)
                .where(and(eq(items.workspaceId, workspaceId), gt(similarity, 0.5)))
                .orderBy(desc(similarity))
                .limit(5);
        } catch {
            // Fallback: keyword search
            results = await db.select({
                name: items.name,
                content: items.content,
                category: items.category,
            }).from(items)
                .where(and(
                    eq(items.workspaceId, workspaceId),
                    like(items.name, `%${args.query}%`)
                ))
                .limit(5);
        }

        if (results.length === 0) return `🔍 No items matching "${args.query}" found.`;

        const summary = results.map((item, i) =>
            `${i + 1}. [${item.category}] **${item.name}**: ${(item.content || "").substring(0, 120)}`
        ).join("\n");

        return `🔍 Found ${results.length} result(s) for "${args.query}":\n${summary}`;
    }
};

const getConfigTool: CoachTool = {
    name: "get_config",
    description: "Get the current workspace configuration and business profile. Use this when the user asks about their current settings or when you need context.",
    parameters: {
        type: "object",
        properties: {}
    },
    schema: z.object({}),
    execute: async (_args, ctx) => {
        const { workspaceId } = ctx;

        const ws = await db.query.workspaces.findFirst({
            where: eq(workspaces.id, workspaceId),
        });

        if (!ws) return "❌ Workspace not found.";

        const settings = ws.settings || {};
        const lines = [
            `📋 **Current Business Profile:**`,
            `• Business Name: ${ws.businessName || "Not set"}`,
            `• Industry: ${ws.industry || "Not set"}`,
            `• Tone of Voice: ${ws.toneOfVoice || "Professional"}`,
            `• About: ${ws.about || "Not set"}`,
            `• Target Audience: ${ws.targetAudience || "Not set"}`,
            `• Language: ${(settings as any).language || "Not set"}`,
            `• AI Active: ${(settings as any).ai_active !== false ? "Yes" : "Paused"}`,
        ];

        return lines.join("\n");
    }
};

// ── Order Management Tools ──────────────────────────────────────────────────

const listOrdersTool: CoachTool = {
    name: "list_orders",
    description: "List pending or recent orders, bookings, and call requests from customers. Use this when the user asks about new orders or wants to see what needs attention.",
    parameters: {
        type: "object",
        properties: {
            status: { type: "string", enum: ["pending", "confirmed", "rejected", "completed", "cancelled"], description: "Filter by status (default: pending)" },
            limit: { type: "number", description: "Max orders to return (default 10)" }
        }
    },
    schema: z.object({
        status: z.enum(["pending", "confirmed", "rejected", "completed", "cancelled"]).default("pending"),
        limit: z.number().min(1).max(50).default(10),
    }),
    execute: async (args, ctx) => {
        const { workspaceId } = ctx;

        const results = await db.select({
            id: orders.id,
            customerName: orders.customerName,
            customerMessage: orders.customerMessage,
            status: orders.status,
            customerNote: orders.customerNote,
            createdAt: orders.createdAt,
            orderItems: orders.orderItems,
            totalAmount: orders.totalAmount,
        }).from(orders)
            .where(and(
                eq(orders.workspaceId, workspaceId),
                eq(orders.status, args.status)
            ))
            .orderBy(desc(orders.createdAt))
            .limit(args.limit || 10);

        if (results.length === 0) return `📭 No ${args.status} orders found.`;

        const summary = results.map((o, i) => {
            const typeEmoji = o.customerNote === "appointment" ? "📅" : o.customerNote === "call_request" ? "📞" : "🛒";
            const shortId = o.id.substring(0, 8);
            const time = o.createdAt ? new Date(o.createdAt).toLocaleString() : "";
            return `${i + 1}. ${typeEmoji} [${shortId}] **${o.customerName}**: "${(o.customerMessage || "").substring(0, 80)}" (${time})`;
        }).join("\n");

        return `📋 ${args.status.toUpperCase()} Orders (${results.length}):\n${summary}\n\nUse confirm_order or reject_order with the order ID to take action.`;
    }
};

const confirmOrderTool: CoachTool = {
    name: "confirm_order",
    description: "Confirm a pending order or booking. The customer will be notified automatically. Use the short order ID (first 8 characters).",
    parameters: {
        type: "object",
        properties: {
            order_id: { type: "string", description: "Order ID (first 8 characters are enough)" },
            note: { type: "string", description: "Optional note to include in confirmation" }
        },
        required: ["order_id"]
    },
    schema: z.object({
        order_id: z.string().min(1).max(100).transform(s => s.trim()),
        note: z.string().max(500).optional(),
    }),
    execute: async (args, ctx) => {
        const { workspaceId } = ctx;

        // Find the order (support short ID prefix match via SQL)
        const matchingOrders = await db.select().from(orders)
            .where(and(
                eq(orders.workspaceId, workspaceId),
                eq(orders.status, "pending"),
                like(orders.id, `${args.order_id}%`)
            ))
            .limit(1);

        const order = matchingOrders[0];

        if (!order) return `❌ No pending order found matching "${args.order_id}".`;

        // Confirm the order
        await db.update(orders).set({
            status: "confirmed",
            sellerNote: args.note || null,
            confirmedAt: new Date(),
            updatedAt: new Date(),
        }).where(eq(orders.id, order.id));

        // Notify customer via system event (Customer Bot handles the AI generation and platform sending)
        try {
            let typeStr = "order";
            if (order.serviceType) typeStr = `appointment for ${order.serviceType}`;
            else if (order.phoneNumber) typeStr = "call request";

            if (order.interactionId) {
                // To avoid circular dependency, dynamically import handleSystemNotification
                const { handleSystemNotification } = await import("../customer/processor.js");
                await handleSystemNotification(
                    order.interactionId,
                    `The seller has confirmed the customer's ${typeStr}.`,
                    args.note || null
                );
            }
        } catch (err) {
            console.warn("[Coach] Failed to trigger system notification for confirmation:", err);
        }
        return `✅ Order ${order.id.substring(0, 8)} confirmed!${args.note ? ` Note: ${args.note}` : ""}`;
    }
};

const rejectOrderTool: CoachTool = {
    name: "reject_order",
    description: "Reject a pending order with a reason. The customer will be notified automatically.",
    parameters: {
        type: "object",
        properties: {
            order_id: { type: "string", description: "Order ID (first 8 characters are enough)" },
            reason: { type: "string", description: "Reason for rejection (shown to customer)" }
        },
        required: ["order_id", "reason"]
    },
    schema: z.object({
        order_id: z.string().min(1).max(100).transform(s => s.trim()),
        reason: z.string().min(1).max(500).transform(s => s.trim()),
    }),
    execute: async (args, ctx) => {
        const { workspaceId } = ctx;

        const matchingOrders = await db.select().from(orders)
            .where(and(
                eq(orders.workspaceId, workspaceId),
                eq(orders.status, "pending"),
                like(orders.id, `${args.order_id}%`)
            ))
            .limit(1);

        const order = matchingOrders[0];

        if (!order) return `❌ No pending order found matching "${args.order_id}".`;

        await db.update(orders).set({
            status: "rejected",
            sellerNote: args.reason,
            updatedAt: new Date(),
        }).where(eq(orders.id, order.id));

        // Notify customer via system event (Customer Bot handles the AI generation and platform sending)
        try {
            let typeStr = "request";
            if (order.serviceType) typeStr = `appointment for ${order.serviceType}`;
            else if (order.phoneNumber) typeStr = "call request";

            if (order.interactionId) {
                // To avoid circular dependency, dynamically import handleSystemNotification
                const { handleSystemNotification } = await import("../customer/processor.js");
                await handleSystemNotification(
                    order.interactionId,
                    `The seller has rejected the customer's ${typeStr}.`,
                    args.reason || null
                );
            }
        } catch (err) {
            console.warn("[Coach] Failed to trigger system notification for rejection:", err);
        }

        return `🚫 Order ${order.id.substring(0, 8)} rejected. Reason: ${args.reason}`;
    }
};

const proposeChangeTool: CoachTool = {
    name: "propose_change",
    description: "Propose a change to a pending order/booking (e.g., offering a different time or product). The customer will be asked if they accept your proposal.",
    parameters: {
        type: "object",
        properties: {
            order_id: { type: "string", description: "Order ID (first 8 characters are enough)" },
            proposal: { type: "string", description: "The alternative you are proposing (e.g., '2 PM is full, how about 4 PM?')" }
        },
        required: ["order_id", "proposal"]
    },
    schema: z.object({
        order_id: z.string().min(1).max(100).transform(s => s.trim()),
        proposal: z.string().min(1).max(500).transform(s => s.trim()),
    }),
    execute: async (args, ctx) => {
        const { workspaceId } = ctx;

        const matchingOrders = await db.select().from(orders)
            .where(and(
                eq(orders.workspaceId, workspaceId),
                eq(orders.status, "pending"),
                like(orders.id, `${args.order_id}%`)
            ))
            .limit(1);

        const order = matchingOrders[0];

        if (!order) return `❌ No pending order found matching "${args.order_id}".`;

        await db.update(orders).set({
            status: "negotiating",
            sellerProposal: args.proposal,
            updatedAt: new Date(),
        }).where(eq(orders.id, order.id));

        // Update the customer's State Machine context so it awaits their reply
        if (order.customerId) {
            await db.update(customers).set({
                conversationState: "AWAITING_PROPOSAL_RESPONSE",
                conversationContext: {
                    orderId: order.id,
                    proposal: args.proposal,
                },
                updatedAt: new Date(),
            }).where(eq(customers.id, order.customerId));
        }

        // Notify customer (System Notification handles translation/generation)
        try {
            if (order.interactionId) {
                const { handleSystemNotification } = await import("../customer/processor.js");
                await handleSystemNotification(
                    order.interactionId,
                    `The seller cannot accept the exact request, but proposes this alternative: '${args.proposal}'. Ask the customer if this is acceptable.`,
                    null
                );
            }
        } catch (err) {
            console.warn("[Coach] Failed to trigger system notification for proposal:", err);
        }

        return `💬 Proposal sent to customer: "${args.proposal}". Waiting for their reply.`;
    }
};

// ── Analytics & Broadcast Tools ─────────────────────────────────────────────

const broadcastMessageTool: CoachTool = {
    name: "broadcast_message",
    description: "Broadcast a message to all customers who have mentioned a specific keyword in the past. Useful for back-in-stock notifications or targeted promotions.",
    parameters: {
        type: "object",
        properties: {
            keyword: { type: "string", description: "The keyword to search for in past customer messages (e.g., 'red dress')" },
            message: { type: "string", description: "The exact message to send to these customers" }
        },
        required: ["keyword", "message"]
    },
    schema: z.object({
        keyword: z.string().min(1).max(100).transform(s => s.trim()),
        message: z.string().min(1).max(2000).transform(s => s.trim()),
    }),
    execute: async (args, ctx) => {
        const { workspaceId, workspace } = ctx;

        // Find all unique customers who mentioned the keyword
        const matchingInteractions = await db.select({
            authorId: interactions.authorId,
            customerId: interactions.customerId
        }).from(interactions)
            .where(and(
                eq(interactions.workspaceId, workspaceId),
                ilike(interactions.content, `%${args.keyword}%`)
            ));

        // Get unique valid authorIds
        const uniqueAuthors = new Map<string, string | null>();
        for (const ix of matchingInteractions) {
            if (ix.authorId) uniqueAuthors.set(ix.authorId, ix.customerId);
        }

        if (uniqueAuthors.size === 0) {
            return `📭 No customers found who mentioned "${args.keyword}".`;
        }

        // Setup platform client
        let accessToken: string | undefined;
        if (workspace.accessToken) {
            try { accessToken = decrypt(workspace.accessToken); }
            catch { /* ignore */ }
        }

        const client = PlatformFactory.getClient(workspace.platform || "generic", {
            accessToken,
            rateLimitFn: checkOutboundRateLimit,
        });

        let successCount = 0;
        let failCount = 0;

        for (const [authorId, customerId] of uniqueAuthors.entries()) {
            try {
                await client.send({
                    to: authorId,
                    text: args.message,
                    replyToMessageId: undefined,
                    workspaceId
                });

                // Log the interaction
                await db.insert(interactions).values({
                    workspaceId,
                    sourceId: "coach_broadcast",
                    externalId: `broadcast-${Date.now()}-${authorId}`,
                    authorId,
                    customerId,
                    authorName: "Broadcast Target",
                    content: `(Matched keyword: ${args.keyword})`,
                    response: args.message,
                    status: "PROCESSED",
                    meta: { isBroadcast: true, keyword: args.keyword },
                });

                successCount++;
            } catch (err) {
                console.error(`[Coach] Broadcast failed for ${authorId}:`, err);
                failCount++;
            }
        }

        return `✅ Broadcast complete! Sent to ${successCount} customers. ${failCount > 0 ? `(${failCount} failed)` : ""}`;
    }
};

const viewAnalyticsTool: CoachTool = {
    name: "view_analytics",
    description: "View order statistics and popular customer intents over a specific timeframe.",
    parameters: {
        type: "object",
        properties: {
            timeframe: { type: "string", enum: ["today", "7d", "30d", "all"], description: "The time period to analyze" }
        }
    },
    schema: z.object({
        timeframe: z.enum(["today", "7d", "30d", "all"]).default("7d"),
    }),
    execute: async (args, ctx) => {
        const { workspaceId } = ctx;

        let startDate = new Date(0);
        const now = new Date();
        if (args.timeframe === "today") {
            startDate = new Date(now.setHours(0, 0, 0, 0));
        } else if (args.timeframe === "7d") {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (args.timeframe === "30d") {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const timeCondition = args.timeframe === "all" ? sql`true` : gt(orders.createdAt, startDate);
        const ixTimeCondition = args.timeframe === "all" ? sql`true` : gt(interactions.createdAt, startDate);

        // Order Stats
        const orderStatsRaw = await db.select({
            status: orders.status,
            count: sql<number>`count(*)::int`
        }).from(orders)
            .where(and(eq(orders.workspaceId, workspaceId), timeCondition))
            .groupBy(orders.status);

        let totalOrders = 0;
        const ordersByStatus: Record<string, number> = {};
        for (const row of orderStatsRaw) {
            totalOrders += row.count;
            ordersByStatus[row.status || "unknown"] = row.count;
        }

        // Popular Intents
        const intentStatsRaw = await db.select({
            intent: sql<string>`meta->>'intent'`,
            count: sql<number>`count(*)::int`
        }).from(interactions)
            .where(and(
                eq(interactions.workspaceId, workspaceId),
                ixTimeCondition,
                sql`meta->>'intent' IS NOT NULL`,
                sql`meta->>'intent' NOT IN ('greeting', 'gratitude', 'unknown')`
            ))
            .groupBy(sql`meta->>'intent'`)
            .orderBy(desc(sql`count(*)`))
            .limit(5);

        const lines = [
            `📊 **Analytics (${args.timeframe})**`,
            `🛒 Total Orders: ${totalOrders}`,
            `• Pending: ${ordersByStatus["pending"] || 0}`,
            `• Confirmed: ${ordersByStatus["confirmed"] || 0}`,
            `• Completed: ${ordersByStatus["completed"] || 0}`,
            `• Rejected/Cancelled: ${(ordersByStatus["rejected"] || 0) + (ordersByStatus["cancelled"] || 0)}`,
            ``,
            `🗣️ **Top Customer Topics:**`
        ];

        if (intentStatsRaw.length === 0) {
            lines.push(`• No specific intents detected yet.`);
        } else {
            for (const row of intentStatsRaw) {
                lines.push(`• ${row.intent}: ${row.count} interactions`);
            }
        }

        return lines.join("\n");
    }
};

const grantDiscountTool: CoachTool = {
    name: "grant_discount",
    description: "Grant a discount requested by a customer. This updates their pending order with the new price and notifies the Customer AI to deliver the good news.",
    parameters: {
        type: "object",
        properties: {
            order_id: { type: "string", description: "Order ID (first 8 characters are enough)" },
            new_total_amount: { type: "number", description: "The new total price after applying the discount" },
            note: { type: "string", description: "Optional note to the customer explaining the discount (e.g. 'Approved your 10% off!')" }
        },
        required: ["order_id", "new_total_amount"]
    },
    schema: z.object({
        order_id: z.string().min(1).max(100).transform(s => s.trim()),
        new_total_amount: z.number().min(0),
        note: z.string().max(500).optional(),
    }),
    execute: async (args, ctx) => {
        const { workspaceId } = ctx;

        const matchingOrders = await db.select().from(orders)
            .where(and(
                eq(orders.workspaceId, workspaceId),
                eq(orders.status, "negotiating"), // Customer must be in negotiation state
                like(orders.id, `${args.order_id}%`)
            ))
            .limit(1);

        const order = matchingOrders[0];
        if (!order) return `❌ No negotiating order found matching "${args.order_id}". Note: The order must be in 'negotiating' status.`;

        // Calculate old vs new for the notification
        const oldTotal = order.totalAmount || 0;

        await db.update(orders).set({
            totalAmount: args.new_total_amount,
            status: "pending", // Move back to pending so they can checkout
            sellerNote: args.note || `Discount applied. Price reduced from $${oldTotal} to $${args.new_total_amount}`,
            updatedAt: new Date(),
        }).where(eq(orders.id, order.id));

        // Update the customer's State Machine context if necessary
        if (order.customerId) {
            await db.update(customers).set({
                conversationState: "IDLE", // Resume normal shopping
                updatedAt: new Date(),
            }).where(eq(customers.id, order.customerId));
        }

        // Notify customer (System Notification to wake up the Customer Bot)
        try {
            if (order.interactionId) {
                const { handleSystemNotification } = await import("../customer/processor.js");
                await handleSystemNotification(
                    order.interactionId,
                    `The seller has GRANTED the requested discount! The new cart total is $${args.new_total_amount}. Tell the customer the good news and ask if they are ready to check out!`,
                    args.note || null
                );
            }
        } catch (err) {
            console.warn("[Coach] Failed to trigger system notification for discount:", err);
        }

        return `✅ Discount granted. Order ${order.id.substring(0, 8)} total is now $${args.new_total_amount}. Customer has been notified.`;
    }
};

/**
 * The master tool registry. To add a new tool, just add it to this array.
 * Everything else (LLM definitions, KNOWN_TOOLS set, execution) derives from here.
 */
export const TOOL_REGISTRY: CoachTool[] = [
    createItemTool,
    updateConfigTool,
    listItemsTool,
    deleteItemTool,
    searchItemsTool,
    getConfigTool,
    listOrdersTool,
    confirmOrderTool,
    rejectOrderTool,
    proposeChangeTool,
    grantDiscountTool,
    broadcastMessageTool,
    viewAnalyticsTool,
];

/** Tool definitions formatted for the LLM API */
export const coachToolDefinitions = TOOL_REGISTRY.map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
}));

/** Set of known tool names — derived automatically from registry */
export const KNOWN_TOOLS = new Set(TOOL_REGISTRY.map(t => t.name));

/** Lookup map for fast tool resolution */
const toolMap = new Map(TOOL_REGISTRY.map(t => [t.name, t]));

/**
 * Execute a tool call with validation and error handling.
 * This is the single entry point for all tool execution.
 */
export async function executeToolCall(
    toolCall: { name: string; arguments: Record<string, unknown> },
    ctx: ToolContext,
): Promise<string> {
    const tool = toolMap.get(toolCall.name);

    if (!tool) {
        console.warn(`[Coach] Unknown tool: ${toolCall.name}`);
        return `❌ Unknown tool: ${toolCall.name}`;
    }

    // Validate arguments with Zod
    const parsed = tool.schema.safeParse(toolCall.arguments);
    if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors;
        console.warn(`[Coach] ${toolCall.name} validation failed:`, errors);
        return `❌ Invalid arguments for ${toolCall.name}: ${Object.entries(errors).map(([k, v]) => `${k}: ${v?.join(", ")}`).join("; ")}`;
    }

    return tool.execute(parsed.data, ctx);
}

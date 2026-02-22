"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processInteraction = processInteraction;
const db_1 = require("@ebizmate/db");
const db_2 = require("@ebizmate/db");
const drizzle_orm_1 = require("drizzle-orm");
const factory_1 = require("../services/factory");
const shared_1 = require("@ebizmate/shared");
const prompts_1 = require("./prompts");
const rate_limit_1 = require("../../common/platform/rate-limit");
const ingestion_1 = require("../services/ingestion"); // Coach V4 ingestion
/**
 * Hybrid scoring for ranking KB items
 */
function computeHybridScore(similarity, keywordScore, recencyBoost) {
    return 0.6 * similarity + 0.3 * keywordScore + 0.1 * recencyBoost;
}
/**
 * Main entry point for processing a customer interaction
 */
async function processInteraction(interactionId) {
    const startTime = Date.now();
    // 1️⃣ Fetch interaction + workspace
    const interaction = await db_1.db.query.interactions.findFirst({
        where: (0, drizzle_orm_1.eq)(db_2.interactions.id, interactionId),
        with: { workspace: true, post: true },
    });
    if (!interaction || !interaction.workspace)
        throw new Error("Interaction not found");
    const workspaceId = interaction.workspaceId;
    // --- AI Pause Check ---
    if (interaction.workspace.settings?.ai_active === false) {
        await db_1.db.update(db_2.interactions)
            .set({ status: "IGNORED", response: "AI_PAUSED_BY_USER", updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(db_2.interactions.id, interactionId));
        return "AI_PAUSED_BY_USER";
    }
    // --- Human Takeover Check ---
    let customer = null;
    if (interaction.authorId) {
        customer = await db_1.db.query.customers.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.customers.workspaceId, workspaceId), (0, drizzle_orm_1.eq)(db_2.customers.platformId, interaction.authorId)),
        });
        if (customer?.aiPaused)
            return "HUMAN_TAKEOVER_ACTIVE";
    }
    // --- State Machine Check ---
    if (customer) {
        const stateResult = await (0, shared_1.processStateMachine)(customer.id, customer.conversationState || "IDLE", customer.conversationContext || {}, interaction.content);
        if (stateResult.reply) {
            const metaObj = interaction.meta || {};
            await db_1.db.update(db_2.interactions)
                .set({ response: stateResult.reply, status: "PROCESSED", meta: { ...metaObj, isStateFlow: true }, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(db_2.interactions.id, interactionId));
            return stateResult.reply;
        }
    }
    // 2️⃣ Get AI Service for customer response
    let ai;
    try {
        ai = await (0, factory_1.getAIService)(workspaceId, "customer");
    }
    catch (err) {
        throw new Error("AI_ACCESS_DENIED");
    }
    // --- Keywords extraction ---
    const keywords = interaction.content.split(" ").filter(w => w.length > 3).slice(0, 5);
    // 3️⃣ Fetch candidate KB items
    let workspaceItems = [];
    let vectorFallback = false;
    try {
        const embedding = (await ai.embed(interaction.content, interactionId)).embedding;
        const similarityExpr = (0, drizzle_orm_1.sql) `1 - (${(0, drizzle_orm_1.cosineDistance)(db_2.items.embedding, embedding)})`;
        workspaceItems = await db_1.db.select().from(db_2.items)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.items.workspaceId, workspaceId), (0, drizzle_orm_1.gt)(similarityExpr, 0.5), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(db_2.items.expiresAt), (0, drizzle_orm_1.gt)(db_2.items.expiresAt, new Date()))))
            .orderBy((0, drizzle_orm_1.desc)(similarityExpr))
            .limit(10);
    }
    catch (err) {
        console.warn("Vector search failed, falling back to keywords:", err);
        vectorFallback = true;
    }
    // Keyword fallback search
    if (workspaceItems.length === 0 && keywords.length > 0) {
        const conditions = keywords.map(kw => {
            const safeKw = (0, shared_1.sanitizeLikeInput)(kw);
            return (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(db_2.items.name, `%${safeKw}%`), (0, drizzle_orm_1.ilike)(db_2.items.content, `%${safeKw}%`));
        });
        workspaceItems = await db_1.db.select().from(db_2.items)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.items.workspaceId, workspaceId), (0, drizzle_orm_1.or)(...conditions)))
            .limit(8);
    }
    // 4️⃣ Expand context with related items
    let expandedItems = [];
    for (const item of workspaceItems) {
        expandedItems.push(item);
        if (Array.isArray(item.relatedItemIds) && item.relatedItemIds.length) {
            const related = await db_1.db.select().from(db_2.items)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.items.workspaceId, workspaceId), (0, drizzle_orm_1.inArray)(db_2.items.id, item.relatedItemIds)))
                .limit(5);
            expandedItems.push(...related);
        }
    }
    const uniqueItemsMap = new Map();
    expandedItems.forEach(i => uniqueItemsMap.set(i.id, i));
    const uniqueItems = Array.from(uniqueItemsMap.values());
    // --- Format items for system prompt ---
    const itemsContext = uniqueItems.map(item => {
        const meta = item.meta;
        let details = `- ${item.name}: ${item.content}`;
        if (item.category === 'product' && meta) {
            if (meta.price)
                details += `\n  - Price: ${meta.price}`;
            if (meta.discount)
                details += `\n  - Discount: ${meta.discount}`;
            if (meta.inStock !== undefined)
                details += `\n  - Stock: ${meta.inStock ? 'In Stock' : 'OUT OF STOCK'}`;
        }
        return details + ` (Source: ${item.sourceId || "Global"})`;
    }).join("\n") || "No relevant items found in knowledge base.";
    // --- Fetch conversation history ---
    let history = [];
    if (interaction.authorId) {
        const past = await db_1.db.select().from(db_2.interactions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.interactions.workspaceId, workspaceId), (0, drizzle_orm_1.eq)(db_2.interactions.authorId, interaction.authorId), (0, drizzle_orm_1.not)((0, drizzle_orm_1.eq)(db_2.interactions.id, interactionId))))
            .orderBy((0, drizzle_orm_1.desc)(db_2.interactions.createdAt))
            .limit(15);
        past.reverse().forEach(h => {
            history.push({ role: "user", content: h.content });
            let responsePrefix = h.authorId === "system_architect" ? "[System Alert] " : "";
            const hMeta = h.meta || {};
            if (hMeta.isStateFlow || h.response?.startsWith("[State Flow] ")) {
                responsePrefix = "[Automated Flow] ";
                if (h.response)
                    h.response = h.response.replace("[State Flow] ", "");
            }
            history.push({ role: "assistant", content: `${responsePrefix}${h.response || "..."}` });
        });
    }
    // --- Construct system prompt ---
    const contextHeader = interaction.post ? `User commenting on post: "${interaction.post.content}"` : "";
    const systemPrompt = (0, prompts_1.CUSTOMER_SYSTEM_PROMPT)(interaction.workspace, contextHeader, itemsContext, interaction.sourceId === "simulation");
    // --- AI Chat call ---
    let reply = "Sorry, I couldn't process that.";
    let confidence = 1.0;
    try {
        const chatResult = await ai.chat({
            systemPrompt,
            userMessage: interaction.content,
            history,
            temperature: 0.3,
            userId: interaction.authorId || undefined,
            returnConfidence: true
        }, interaction.id);
        // 🛡️ Filter out native XML <function> tags that Llama/Mixtral models sometimes leak into the chat text
        reply = chatResult.content.replace(/<function[^>]*>[\s\S]*?<\/function>/gi, "").trim();
        confidence = chatResult.confidence ?? 1.0;
    }
    catch (err) {
        console.error("AI chat failed:", err);
        reply = "Sorry, I'm temporarily unable to respond. Please try again shortly.";
    }
    // --- 5️⃣ Escalation & feedback queue ---
    let finalStatus = "PROCESSED";
    if (reply.includes("[ACTION_REQUIRED]") || confidence < 0.7) {
        finalStatus = "NEEDS_REVIEW";
        await db_1.db.insert(db_2.feedbackQueue).values({
            workspaceId,
            interactionId,
            content: interaction.content,
            itemsContext,
            createdAt: new Date(),
            status: "PENDING"
        });
        // Trigger Coach ingestion to enrich KB automatically
        try {
            await (0, ingestion_1.linkAndVerifyKB)(workspaceId);
        }
        catch (err) {
            console.warn("Coach ingestion failed:", err);
        }
        // Notify admin via system interaction
        const adminAlert = `🚨 Bot Stuck!\nCustomer asked: "${interaction.content}"\nConfidence: ${confidence}\nPlease provide the correct answer.`;
        await db_1.db.insert(db_2.interactions).values({
            workspaceId,
            sourceId: "simulation",
            externalId: `escalation-${interactionId}`,
            authorId: "system_architect",
            authorName: "The Architect",
            content: `Escalated: "${interaction.content.substring(0, 100)}"`,
            response: adminAlert,
            status: "PROCESSED",
            meta: { originalInteractionId: interactionId }
        });
    }
    // --- 6️⃣ Update interaction ---
    await db_1.db.update(db_2.interactions).set({
        response: reply,
        status: finalStatus,
        meta: { ...(interaction.meta || {}), confidence, vectorFallback },
        updatedAt: new Date(),
    }).where((0, drizzle_orm_1.eq)(db_2.interactions.id, interactionId));
    // --- 7️⃣ Dispatch outbound message ---
    if (interaction.authorId && reply.length > 0) {
        try {
            // Decrypt workspace access token for multi-tenant platform auth
            let accessToken;
            if (interaction.workspace.accessToken) {
                try {
                    accessToken = (0, shared_1.decrypt)(interaction.workspace.accessToken);
                }
                catch {
                    console.warn("Failed to decrypt workspace access token, falling back to env vars");
                }
            }
            const client = shared_1.PlatformFactory.getClient(interaction.workspace.platform || "generic", {
                accessToken,
                rateLimitFn: rate_limit_1.checkOutboundRateLimit,
            });
            await client.send({
                to: interaction.authorId,
                text: reply,
                replyToMessageId: interaction.externalId,
                workspaceId
            });
        }
        catch (err) {
            console.error("Dispatch failed:", err);
        }
    }
    // --- 8️⃣ Logging ---
    const latency = Date.now() - startTime;
    console.log(`[Interaction] ${interactionId} processed in ${latency}ms, finalStatus=${finalStatus}, confidence=${confidence}`);
    return reply;
}
//# sourceMappingURL=processor.js.map
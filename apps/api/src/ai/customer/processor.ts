import { db } from "@ebizmate/db";
import { items, interactions, customers, feedbackQueue, workspaces } from "@ebizmate/db";
import { eq, or, and, desc, sql, cosineDistance, gt, isNull, not, inArray, ilike } from "drizzle-orm";
import { sanitizeLikeInput } from "../../common/utils/validation";
import { getAIService } from "../services/factory";
import { processStateMachine } from "../../common/workflow/state-machine";
import { CUSTOMER_SYSTEM_PROMPT } from "./prompts";
import { PlatformFactory } from "../../common/platform/factory";
import { linkAndVerifyKB } from "../services/ingestion"; // Coach V4 ingestion

/**
 * Hybrid scoring for ranking KB items
 */
function computeHybridScore(similarity: number, keywordScore: number, recencyBoost: number) {
    return 0.6 * similarity + 0.3 * keywordScore + 0.1 * recencyBoost;
}

/**
 * Main entry point for processing a customer interaction
 */
export async function processInteraction(interactionId: string) {
    const startTime = Date.now();

    // 1️⃣ Fetch interaction + workspace
    const interaction = await db.query.interactions.findFirst({
        where: eq(interactions.id, interactionId),
        with: { workspace: true, post: true },
    });
    if (!interaction || !interaction.workspace) throw new Error("Interaction not found");

    const workspaceId = interaction.workspaceId;

    // --- AI Pause Check ---
    if ((interaction.workspace.settings as any)?.ai_active === false) {
        await db.update(interactions)
            .set({ status: "IGNORED", response: "AI_PAUSED_BY_USER" })
            .where(eq(interactions.id, interactionId));
        return "AI_PAUSED_BY_USER";
    }

    // --- Human Takeover Check ---
    let customer = null;
    if (interaction.authorId) {
        customer = await db.query.customers.findFirst({
            where: and(
                eq(customers.workspaceId, workspaceId),
                eq(customers.platformId, interaction.authorId)
            ),
        });
        if (customer?.aiPaused) return "HUMAN_TAKEOVER_ACTIVE";
    }

    // --- State Machine Check ---
    if (customer) {
        const stateResult = await processStateMachine(
            customer.id,
            (customer.conversationState as any) || "IDLE",
            (customer.conversationContext as any) || {},
            interaction.content
        );
        if (stateResult.reply) {
            const metaObj = (interaction.meta as Record<string, any>) || {};
            await db.update(interactions)
                .set({ response: stateResult.reply, status: "PROCESSED", meta: { ...metaObj, isStateFlow: true } })
                .where(eq(interactions.id, interactionId));
            return stateResult.reply;
        }
    }

    // 2️⃣ Get AI Service for customer response
    let ai;
    try { ai = await getAIService(workspaceId, "customer"); }
    catch (err) { throw new Error("AI_ACCESS_DENIED"); }

    // --- Keywords extraction ---
    const keywords = interaction.content.split(" ").filter(w => w.length > 3).slice(0, 5);

    // 3️⃣ Fetch candidate KB items
    let workspaceItems: typeof items.$inferSelect[] = [];
    let vectorFallback = false;

    try {
        const embedding = (await ai.embed(interaction.content, interactionId)).embedding;
        const similarityExpr = sql<number>`1 - (${cosineDistance(items.embedding, embedding)})`;

        workspaceItems = await db.select().from(items)
            .where(and(
                eq(items.workspaceId, workspaceId),
                gt(similarityExpr, 0.5),
                or(isNull(items.expiresAt), gt(items.expiresAt, new Date()))
            ))
            .orderBy(desc(similarityExpr))
            .limit(10);

    } catch (err) {
        console.warn("Vector search failed, falling back to keywords:", err);
        vectorFallback = true;
    }

    // Keyword fallback search
    if (workspaceItems.length === 0 && keywords.length > 0) {
        const conditions = keywords.map(kw => {
            const safeKw = sanitizeLikeInput(kw);
            return or(ilike(items.name, `%${safeKw}%`), ilike(items.content, `%${safeKw}%`));
        });

        workspaceItems = await db.select().from(items)
            .where(and(eq(items.workspaceId, workspaceId), or(...conditions)))
            .limit(8);
    }

    // 4️⃣ Expand context with related items
    let expandedItems: typeof items.$inferSelect[] = [];
    for (const item of workspaceItems) {
        expandedItems.push(item);
        if (Array.isArray(item.relatedItemIds) && item.relatedItemIds.length) {
            const related = await db.select().from(items)
                .where(and(eq(items.workspaceId, workspaceId), inArray(items.id, item.relatedItemIds)))
                .limit(5);
            expandedItems.push(...related);
        }
    }

    const uniqueItemsMap = new Map<string, typeof items.$inferSelect>();
    expandedItems.forEach(i => uniqueItemsMap.set(i.id, i));
    const uniqueItems = Array.from(uniqueItemsMap.values());

    // --- Format items for system prompt ---
    const itemsContext = uniqueItems.map(item => {
        const meta = item.meta as any;
        let details = `- ${item.name}: ${item.content}`;
        if (item.category === 'product' && meta) {
            if (meta.price) details += `\n  - Price: ${meta.price}`;
            if (meta.discount) details += `\n  - Discount: ${meta.discount}`;
            if (meta.inStock !== undefined) details += `\n  - Stock: ${meta.inStock ? 'In Stock' : 'OUT OF STOCK'}`;
        }
        return details + ` (Source: ${item.sourceId || "Global"})`;
    }).join("\n") || "No relevant items found in knowledge base.";

    // --- Fetch conversation history ---
    let history: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];
    if (interaction.authorId) {
        const past = await db.select().from(interactions)
            .where(and(
                eq(interactions.workspaceId, workspaceId),
                eq(interactions.authorId, interaction.authorId),
                not(eq(interactions.id, interactionId))
            ))
            .orderBy(desc(interactions.createdAt))
            .limit(15);

        past.reverse().forEach(h => {
            history.push({ role: "user", content: h.content });
            let responsePrefix = h.authorId === "system_architect" ? "[System Alert] " : "";
            const hMeta = h.meta as Record<string, any> || {};
            if (hMeta.isStateFlow || h.response?.startsWith("[State Flow] ")) {
                responsePrefix = "[Automated Flow] ";
                if (h.response) h.response = h.response.replace("[State Flow] ", "");
            }
            history.push({ role: "assistant", content: `${responsePrefix}${h.response || "..."}` });
        });
    }

    // --- Construct system prompt ---
    const contextHeader = interaction.post ? `User commenting on post: "${interaction.post.content}"` : "";
    const systemPrompt = CUSTOMER_SYSTEM_PROMPT(interaction.workspace, contextHeader, itemsContext, interaction.sourceId === "simulation");

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

    } catch (err) {
        console.error("AI chat failed:", err);
        reply = "Sorry, I'm temporarily unable to respond. Please try again shortly.";
    }

    // --- 5️⃣ Escalation & feedback queue ---
    let finalStatus = "PROCESSED";
    if (reply.includes("[ACTION_REQUIRED]") || confidence < 0.7) {
        finalStatus = "NEEDS_REVIEW";

        await db.insert(feedbackQueue).values({
            workspaceId,
            interactionId,
            content: interaction.content,
            itemsContext,
            createdAt: new Date(),
            status: "PENDING"
        });

        // Trigger Coach ingestion to enrich KB automatically
        try { await linkAndVerifyKB(workspaceId); }
        catch (err) { console.warn("Coach ingestion failed:", err); }

        // Notify admin via system interaction
        const adminAlert = `🚨 Bot Stuck!\nCustomer asked: "${interaction.content}"\nConfidence: ${confidence}\nPlease provide the correct answer.`;
        await db.insert(interactions).values({
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
    await db.update(interactions).set({
        response: reply,
        status: finalStatus,
        meta: { confidence, vectorFallback }
    }).where(eq(interactions.id, interactionId));

    // --- 7️⃣ Dispatch outbound message ---
    if (interaction.authorId && reply.length > 0) {
        try {
            const client = PlatformFactory.getClient(interaction.workspace.platform || "generic");
            await client.send({
                to: interaction.authorId,
                text: reply,
                replyToMessageId: interaction.externalId,
                workspaceId
            });
        } catch (err) { console.error("Dispatch failed:", err); }
    }

    // --- 8️⃣ Logging ---
    const latency = Date.now() - startTime;
    console.log(`[Interaction] ${interactionId} processed in ${latency}ms, finalStatus=${finalStatus}, confidence=${confidence}`);
    return reply;
}
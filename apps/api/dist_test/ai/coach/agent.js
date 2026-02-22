"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coachTools = void 0;
exports.processCoachMessage = processCoachMessage;
const zod_1 = require("zod");
const db_1 = require("@ebizmate/db");
const db_2 = require("@ebizmate/db");
const drizzle_orm_1 = require("drizzle-orm");
const factory_1 = require("../services/factory");
const prompts_1 = require("./prompts");
const dates_1 = require("../../common/utils/dates"); // re-use parseDuration from common utils
// --- Strict schemas for tool validation ---
const createItemSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200).transform(s => s.trim()),
    content: zod_1.z.string().min(1).max(5000).transform(s => s.trim()),
    category: zod_1.z.enum(["product", "service", "faq", "policy", "general"]).default("general"),
    expires_in: zod_1.z.string().max(20).optional(),
});
const updateConfigSchema = zod_1.z.object({
    businessName: zod_1.z.string().max(100).optional(),
    industry: zod_1.z.string().max(100).optional(),
    toneOfVoice: zod_1.z.string().max(100).optional(),
    about: zod_1.z.string().max(2000).optional(),
    language: zod_1.z.string().max(50).optional(),
    ai_active: zod_1.z.boolean().optional(),
});
const ALLOWED_WORKSPACE_FIELDS = ["businessName", "industry", "toneOfVoice", "about"];
// --- Native Tools ---
exports.coachTools = [
    {
        name: "create_item",
        description: "Save a new fact, FAQ, product, service, or policy to the Knowledge Base.",
        parameters: {
            type: "object",
            properties: {
                name: { type: "string" },
                content: { type: "string" },
                category: { type: "string", enum: ["product", "service", "faq", "policy", "general"] },
                expires_in: { type: "string" }
            },
            required: ["name", "content", "category"]
        }
    },
    {
        name: "update_config",
        description: "Update the workspace settings like tone, language, or AI active state.",
        parameters: {
            type: "object",
            properties: {
                businessName: { type: "string" },
                industry: { type: "string" },
                toneOfVoice: { type: "string" },
                about: { type: "string" },
                language: { type: "string" },
                ai_active: { type: "boolean" }
            }
        }
    }
];
const MAX_HISTORY_TURNS = 50;
/**
 * Main coach processor
 */
async function processCoachMessage(workspaceId, userMessage, history) {
    // 1️⃣ Fetch workspace
    const workspace = await db_1.db.query.workspaces.findFirst({ where: (0, drizzle_orm_1.eq)(db_2.workspaces.id, workspaceId) });
    if (!workspace)
        throw new Error("Workspace not found");
    // 2️⃣ Load AI service
    let ai;
    try {
        ai = await (0, factory_1.getAIService)(workspaceId, "coach");
    }
    catch (err) {
        console.error("Coach getAIService failed:", err);
        return `Error accessing AI: ${err.message || String(err)}`;
    }
    // 3️⃣ Build system prompt
    const settingsObj = workspace.settings || {};
    const systemPrompt = (0, prompts_1.COACH_SYSTEM_PROMPT)(workspace.businessName || workspace.name || "Unknown Business", workspace.industry || "Unknown", workspace.toneOfVoice || "Professional", settingsObj.language || "Unknown");
    // 4️⃣ Truncate history
    const truncatedHistory = history.slice(-MAX_HISTORY_TURNS);
    const mappedHistory = truncatedHistory.map(msg => ({
        role: (msg.role === "coach" ? "assistant" : "user"),
        content: msg.content
    }));
    // 5️⃣ AI Chat with tools
    const result = await ai.chat({
        systemPrompt,
        userMessage,
        history: mappedHistory,
        tools: exports.coachTools,
        temperature: 0.2
    }, undefined, "coach_chat");
    result.toolCalls = result.toolCalls || [];
    let reply = result.content.trim();
    // 6️⃣ Execute tool calls
    if (result.toolCalls && result.toolCalls.length) {
        for (const toolCall of result.toolCalls) {
            if (toolCall.name === "create_item") {
                const parsed = createItemSchema.safeParse(toolCall.arguments);
                if (!parsed.success)
                    continue;
                const itemData = parsed.data;
                let embedding = null;
                try {
                    embedding = (await ai.embed(`${itemData.name}: ${itemData.content}`)).embedding;
                }
                catch (e) {
                    console.warn("Embedding failed:", e);
                }
                let existingItem = null;
                if (embedding) {
                    const similarity = (0, drizzle_orm_1.sql) `1 - (${(0, drizzle_orm_1.cosineDistance)(db_2.items.embedding, embedding)})`;
                    const similarItems = await db_1.db.select().from(db_2.items)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.items.workspaceId, workspaceId), (0, drizzle_orm_1.gt)(similarity, 0.85)))
                        .orderBy(similarity)
                        .limit(1);
                    if (similarItems.length)
                        existingItem = similarItems[0];
                }
                if (!existingItem) {
                    existingItem = await db_1.db.query.items.findFirst({
                        where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.items.workspaceId, workspaceId), (0, drizzle_orm_1.ilike)(db_2.items.name, itemData.name))
                    });
                }
                const expiresAt = (0, dates_1.parseDuration)(itemData.expires_in);
                if (existingItem) {
                    await db_1.db.update(db_2.items).set({
                        name: itemData.name,
                        content: itemData.content,
                        category: itemData.category,
                        expiresAt,
                        embedding: embedding || existingItem.embedding,
                        updatedAt: new Date()
                    }).where((0, drizzle_orm_1.eq)(db_2.items.id, existingItem.id));
                    reply = reply || `✅ Updated "${itemData.name}" in KB.`;
                }
                else {
                    await db_1.db.insert(db_2.items).values({
                        workspaceId,
                        name: itemData.name,
                        content: itemData.content,
                        category: itemData.category,
                        sourceId: "coach_learning",
                        embedding,
                        expiresAt
                    });
                    reply = reply || `✅ Saved "${itemData.name}" to KB.`;
                    if (expiresAt)
                        reply += ` ⏰ Expires on ${expiresAt.toLocaleDateString()}`;
                }
            }
            else if (toolCall.name === "update_config") {
                const parsed = updateConfigSchema.safeParse(toolCall.arguments);
                if (!parsed.success)
                    continue;
                const configData = parsed.data;
                const updates = {};
                const currentSettings = workspace.settings || {};
                let settingsUpdated = false;
                if (configData.ai_active !== undefined) {
                    currentSettings.ai_active = configData.ai_active;
                    settingsUpdated = true;
                }
                if (configData.language !== undefined) {
                    currentSettings.language = configData.language;
                    settingsUpdated = true;
                }
                if (settingsUpdated)
                    updates.settings = currentSettings;
                if (configData.businessName)
                    updates.businessName = configData.businessName;
                if (configData.industry)
                    updates.industry = configData.industry;
                if (configData.toneOfVoice)
                    updates.toneOfVoice = configData.toneOfVoice;
                if (configData.about)
                    updates.about = configData.about;
                if (Object.keys(updates).length) {
                    await db_1.db.update(db_2.workspaces).set(updates).where((0, drizzle_orm_1.eq)(db_2.workspaces.id, workspaceId));
                    reply = reply || "✅ Configuration updated successfully.";
                }
            }
        }
    }
    const finalReply = reply || "Done!";
    // Save conversation to DB
    await db_1.db.insert(db_2.coachConversations).values([
        { workspaceId, role: "user", content: userMessage },
        { workspaceId, role: "coach", content: finalReply }
    ]);
    return finalReply;
}
//# sourceMappingURL=agent.js.map
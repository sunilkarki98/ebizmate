import { z } from "zod";
import { db } from "@ebizmate/db";
import { workspaces, items } from "@ebizmate/db";
import { eq, and, ilike, cosineDistance, sql, gt } from "drizzle-orm";
import { getAIService } from "../services/factory";
import { COACH_SYSTEM_PROMPT } from "./prompts";
import { parseDuration } from "../../common/utils/dates"; // re-use parseDuration from common utils

// --- Strict schemas for tool validation ---
const createItemSchema = z.object({
    name: z.string().min(1).max(200).transform(s => s.trim()),
    content: z.string().min(1).max(5000).transform(s => s.trim()),
    category: z.enum(["product", "service", "faq", "policy", "general"]).default("general"),
    expires_in: z.string().max(20).optional(),
});

const updateConfigSchema = z.object({
    businessName: z.string().max(100).optional(),
    industry: z.string().max(100).optional(),
    toneOfVoice: z.string().max(100).optional(),
    about: z.string().max(2000).optional(),
    language: z.string().max(50).optional(),
    ai_active: z.boolean().optional(),
});

const ALLOWED_WORKSPACE_FIELDS = ["businessName", "industry", "toneOfVoice", "about"] as const;

// --- Native Tools ---
export const coachTools = [
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
export async function processCoachMessage(
    workspaceId: string,
    userMessage: string,
    history: Array<{ role: "user" | "coach"; content: string }>
) {
    // 1️⃣ Fetch workspace
    const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) });
    if (!workspace) throw new Error("Workspace not found");

    // 2️⃣ Load AI service
    let ai;
    try { ai = await getAIService(workspaceId, "coach"); }
    catch (err: any) {
        console.error("Coach getAIService failed:", err);
        return `Error accessing AI: ${err.message || String(err)}`;
    }

    // 3️⃣ Build system prompt
    const settingsObj = (workspace.settings as Record<string, any>) || {};
    const systemPrompt = COACH_SYSTEM_PROMPT(
        workspace.businessName || workspace.name || "Unknown Business",
        workspace.industry || "Unknown",
        workspace.toneOfVoice || "Professional",
        settingsObj.language || "Unknown"
    );

    // 4️⃣ Truncate history
    const truncatedHistory = history.slice(-MAX_HISTORY_TURNS);
    const mappedHistory = truncatedHistory.map(msg => ({
        role: (msg.role === "coach" ? "assistant" : "user") as "system" | "user" | "assistant",
        content: msg.content
    }));

    // 5️⃣ AI Chat with tools
    const result = await ai.chat({
        systemPrompt,
        userMessage,
        history: mappedHistory,
        tools: coachTools,
        temperature: 0.2
    }, undefined, "coach_chat");

    // 🛡️ Filter and Extract inline XML <function> tags that Llama/Mixtral models sometimes leak into the chat text instead of using native tool arrays
    const xmlToolRegex = /<function\((.*?)\)>(.*?)<\/function>/g;
    let match;
    result.toolCalls = result.toolCalls || [];

    while ((match = xmlToolRegex.exec(result.content)) !== null) {
        const toolName = match[1];
        let toolArgs;
        try {
            toolArgs = JSON.parse(match[2].trim());
            result.toolCalls.push({ id: `inline-${Date.now()}`, name: toolName, arguments: toolArgs });
        } catch (e) {
            console.warn("Failed to parse inline XML tool JSON:", match[2]);
        }
    }

    // Clean the reply for the UI
    let reply = result.content.replace(/<function[^>]*>[\s\S]*?<\/function>/gi, "").trim();

    // 6️⃣ Execute tool calls
    if (result.toolCalls && result.toolCalls.length) {
        for (const toolCall of result.toolCalls) {
            if (toolCall.name === "create_item") {
                const parsed = createItemSchema.safeParse(toolCall.arguments);
                if (!parsed.success) continue;

                const itemData = parsed.data;

                let embedding: number[] | null = null;
                try { embedding = (await ai.embed(`${itemData.name}: ${itemData.content}`)).embedding; }
                catch (e) { console.warn("Embedding failed:", e); }

                let existingItem = null;
                if (embedding) {
                    const similarity = sql<number>`1 - (${cosineDistance(items.embedding, embedding)})`;
                    const similarItems = await db.select().from(items)
                        .where(and(
                            eq(items.workspaceId, workspaceId),
                            gt(similarity, 0.85)
                        ))
                        .orderBy(similarity)
                        .limit(1);
                    if (similarItems.length) existingItem = similarItems[0];
                }

                if (!existingItem) {
                    existingItem = await db.query.items.findFirst({
                        where: and(eq(items.workspaceId, workspaceId), ilike(items.name, itemData.name))
                    });
                }

                const expiresAt = parseDuration(itemData.expires_in);

                if (existingItem) {
                    await db.update(items).set({
                        name: itemData.name,
                        content: itemData.content,
                        category: itemData.category,
                        expiresAt,
                        embedding: embedding || existingItem.embedding,
                        updatedAt: new Date()
                    }).where(eq(items.id, existingItem.id));
                    reply = reply || `✅ Updated "${itemData.name}" in KB.`;
                } else {
                    await db.insert(items).values({
                        workspaceId,
                        name: itemData.name,
                        content: itemData.content,
                        category: itemData.category,
                        sourceId: "coach_learning",
                        embedding,
                        expiresAt
                    });
                    reply = reply || `✅ Saved "${itemData.name}" to KB.`;
                    if (expiresAt) reply += ` ⏰ Expires on ${expiresAt.toLocaleDateString()}`;
                }

            } else if (toolCall.name === "update_config") {
                const parsed = updateConfigSchema.safeParse(toolCall.arguments);
                if (!parsed.success) continue;

                const configData = parsed.data;
                const updates: Record<string, unknown> = {};
                const currentSettings = (workspace.settings as Record<string, unknown>) || {};
                let settingsUpdated = false;

                if (configData.ai_active !== undefined) { currentSettings.ai_active = configData.ai_active; settingsUpdated = true; }
                if (configData.language !== undefined) { currentSettings.language = configData.language; settingsUpdated = true; }
                if (settingsUpdated) updates.settings = currentSettings;

                if (configData.businessName) updates.businessName = configData.businessName;
                if (configData.industry) updates.industry = configData.industry;
                if (configData.toneOfVoice) updates.toneOfVoice = configData.toneOfVoice;
                if (configData.about) updates.about = configData.about;

                if (Object.keys(updates).length) {
                    await db.update(workspaces).set(updates).where(eq(workspaces.id, workspaceId));
                    reply = reply || "✅ Configuration updated successfully.";
                }
            }
        }
    }

    return reply || "Done!";
}
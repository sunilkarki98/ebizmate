import { db } from "@ebizmate/db";
import { workspaces, coachConversations } from "@ebizmate/db";
import { eq } from "drizzle-orm";
import { getAIService } from "../services/factory.js";
import { COACH_SYSTEM_PROMPT } from "./prompts.js";
import { coachToolDefinitions, KNOWN_TOOLS, executeToolCall, type ToolContext } from "./tools.js";
import { stripResidualFunctionTags } from "@ebizmate/shared";

// Re-export for backward compatibility
export { coachToolDefinitions as coachTools } from "./tools.js";

// OPT-5 FIX: Reduced from 50 turns × 2000 chars (~100KB) to 20 turns × 800 chars (~16KB).
// This dramatically cuts token consumption and LLM costs while maintaining adequate context.
const MAX_HISTORY_TURNS = 20;

// ── Robust Multi-Format Tool Call Extractor ─────────────────────────────────

interface ExtractedToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    source: "text_xml" | "text_json";
}

/**
 * Extract tool calls that were leaked into the text content by the LLM.
 * Returns the extracted calls AND the cleaned content with tags removed.
 *
 * Handles these observed formats:
 *  - `<function(name)>{args}</function>`  (ideal — with closing paren)
 *  - `<function(name>{args}</function>`   (common — NO closing paren, e.g. LLaMA/Groq)
 *  - `<function(name)args</function>`     (rare — no > separator)
 *  - `<function=name>{args}</function>`   (some OpenAI fine-tunes)
 */
function extractLeakedToolCalls(content: string): {
    toolCalls: ExtractedToolCall[];
    cleanedContent: string;
} {
    const toolCalls: ExtractedToolCall[] = [];
    let cleaned = content;

    // Layer 1: XML-style function tags (covers all observed LLaMA/Groq/OpenAI variants)
    const xmlRegex = /<function[=(]([^)>=]+)[)>= ]*>?([\s\S]*?)<\/function>/gi;
    let match;

    while ((match = xmlRegex.exec(content)) !== null) {
        const toolName = match[1].trim();
        let rawArgs = (match[2] || "").trim();

        if (!KNOWN_TOOLS.has(toolName)) {
            console.warn(`[Coach] Skipping unknown leaked tool: "${toolName}"`);
            cleaned = cleaned.replace(match[0], "").trim();
            continue;
        }

        // Fix truncated JSON
        if (rawArgs.startsWith("{") && !rawArgs.endsWith("}")) rawArgs += "}";

        try {
            const parsedArgs = JSON.parse(rawArgs);
            toolCalls.push({
                id: `text_${Math.random().toString(36).substring(2, 8)}`,
                name: toolName,
                arguments: parsedArgs,
                source: "text_xml",
            });
            console.log(`[Coach] ✅ Extracted leaked tool call: ${toolName}(${Object.keys(parsedArgs).join(", ")})`);
        } catch {
            console.warn(`[Coach] ⚠️ Found <function(${toolName})> but JSON parse failed:`, rawArgs.substring(0, 100));
        }

        cleaned = cleaned.replace(match[0], "").trim();
    }

    // Layer 2: Raw JSON tool call objects in text
    if (toolCalls.length === 0) {
        const knownToolPattern = Array.from(KNOWN_TOOLS).map(t => `"${t}"`).join("|");
        const jsonObjRegex = new RegExp(`\\{[^{}]*"(?:name|tool)"\\s*:\\s*(${knownToolPattern})[^{}]*"arguments"\\s*:\\s*(\\{[^{}]*\\})[^{}]*\\}`, "g");
        let jsonMatch;
        while ((jsonMatch = jsonObjRegex.exec(content)) !== null) {
            try {
                const toolName = jsonMatch[1].replace(/"/g, "");
                const parsedArgs = JSON.parse(jsonMatch[2]);
                toolCalls.push({
                    id: `json_${Math.random().toString(36).substring(2, 8)}`,
                    name: toolName,
                    arguments: parsedArgs,
                    source: "text_json",
                });
                console.log(`[Coach] ✅ Extracted JSON tool call: ${toolName}`);
                cleaned = cleaned.replace(jsonMatch[0], "").trim();
            } catch {
                // Not valid JSON, skip
            }
        }
    }

    return { toolCalls, cleanedContent: cleaned };
}

// ── Main Coach Processor ────────────────────────────────────────────────────

/**
 * Main coach processor — with tool feedback loop.
 *
 * Flow:
 * 1. LLM call with tools (native function calling API)
 * 2. Safety net: extract any tool calls leaked into text
 * 3. Execute all tool calls, collect results
 * 4. Feed tool results back to LLM for final response
 * 5. Clean output and save to DB
 */
export async function processCoachMessage(
    workspaceId: string,
    userMessage: string,
    history: Array<{ role: "user" | "coach"; content: string }>
) {
    // 1️⃣ Fetch workspace
    const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) });
    if (!workspace) throw new Error("Workspace not found");

    if (workspace.settings?.ai_active === false) {
        throw new Error("AI_ACCESS_DENIED: AI has been paused for this workspace.");
    }

    // 2️⃣ Load AI service
    let ai;
    try { ai = await getAIService(workspaceId, "coach"); }
    catch (err: any) {
        if (err.message?.includes("AI_ACCESS_DENIED") || err.message?.includes("AI_LIMIT_EXCEEDED")) {
            throw err;
        }
        console.error("[Coach] getAIService failed:", err);
        return `Error accessing AI: ${err.message || String(err)}`;
    }

    // 3️⃣ Build system prompt
    const settingsObj = workspace.settings || {};
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
        content: msg.content ? msg.content.substring(0, 800) : ""
    }));

    // 5️⃣ AI Chat with tools (native function calling)
    const result = await ai.chat({
        systemPrompt,
        userMessage: userMessage ? userMessage.substring(0, 2000) : "",
        history: mappedHistory,
        tools: coachToolDefinitions,
        temperature: 0.2
    }, undefined, "coach_chat");

    // ── Collect tool calls from ALL sources ──────────────────────────────
    const allToolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> = [];

    // Source 1: Native API tool calls (OpenAI, Gemini, Groq structured)
    if (result.toolCalls && result.toolCalls.length > 0) {
        console.log(`[Coach] 📡 ${result.toolCalls.length} native tool call(s) from provider API`);
        allToolCalls.push(...result.toolCalls);
    }

    // Source 2: Leaked tool calls in text (LLaMA/Groq text fallback)
    const hasLeakedTools = result.content && (
        result.content.includes("<function") ||
        Array.from(KNOWN_TOOLS).some(t => result.content.includes(`"${t}"`))
    );
    if (hasLeakedTools) {
        const { toolCalls: leaked, cleanedContent } = extractLeakedToolCalls(result.content);
        if (leaked.length > 0) {
            console.log(`[Coach] 🔍 ${leaked.length} leaked tool call(s) extracted from text`);
            allToolCalls.push(...leaked);
            result.content = cleanedContent;
        }
    }

    console.log(`[Coach] 🛠️ Total tool calls to execute: ${allToolCalls.length} for workspace ${workspaceId}`);

    // 6️⃣ Execute tool calls using the registry
    const toolResults: Array<{ name: string; result: string }> = [];
    const toolCtx: ToolContext = { workspaceId, workspace, ai };

    for (const toolCall of allToolCalls) {
        console.log(`[Coach] ▶ Executing: ${toolCall.name}(${JSON.stringify(toolCall.arguments).substring(0, 150)})`);
        try {
            const toolResult = await executeToolCall(toolCall, toolCtx);
            toolResults.push({ name: toolCall.name, result: toolResult });
            console.log(`[Coach] ✅ ${toolCall.name}: ${toolResult.substring(0, 100)}`);
        } catch (err: any) {
            const errMsg = `❌ Tool ${toolCall.name} crashed: ${err.message || String(err)}`;
            console.error(`[Coach] ${errMsg}`);
            toolResults.push({ name: toolCall.name, result: errMsg });
        }
    }

    // 7️⃣ If tools were called, feed results back to LLM for final response
    let finalReply: string;

    if (toolResults.length > 0) {
        const toolSummary = toolResults
            .map(tr => `Tool "${tr.name}" result: ${tr.result}`)
            .join("\n");

        try {
            const followUpResult = await ai.chat({
                systemPrompt: systemPrompt + "\n\nIMPORTANT: Do NOT call any tools in this response. Simply summarize the results for the user.",
                userMessage: `The user said: "${userMessage}"\n\nYou called tools. Here are the results:\n${toolSummary}\n\nNow respond to the user based on these results. Be concise and confirm what was done. Do NOT output any <function> tags or tool calls.`,
                history: mappedHistory,
                temperature: 0.2,
            }, undefined, "coach_chat");

            finalReply = followUpResult.content.trim() || toolResults.map(tr => tr.result).join("\n");
        } catch (err: any) {
            console.warn("[Coach] Follow-up LLM call failed, using raw tool results:", err.message);
            finalReply = toolResults.map(tr => tr.result).join("\n");
        }
    } else {
        finalReply = result.content.trim() || "Done!";
    }

    // 8️⃣ Final safety: strip any residual function tags from the reply
    finalReply = stripResidualFunctionTags(finalReply);

    // 9️⃣ Save conversation to DB
    await db.insert(coachConversations).values([
        { workspaceId, role: "user", content: userMessage },
        { workspaceId, role: "coach", content: finalReply }
    ]);

    return finalReply;
}
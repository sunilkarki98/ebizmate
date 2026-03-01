import { eq, and, desc } from "drizzle-orm";
// Drizzle db imports removed to enforce DAO pattern for better testability
import { findCustomerByPlatformId, updateCustomerPreferences, updateCustomerConversationState } from "./dao.js";
import { getInteractionWithRelations, updateInteractionStatus, saveSystemEventInteraction, countActiveChats } from "../interactions/dao.js";
import { createOrderTransaction } from "../orders/dao.js";
import { getAIService } from "../services/factory.js";
import { processStateMachine, setOrderCreator, setIntentDetector, PlatformFactory, decrypt } from "@ebizmate/shared";
import { checkOutboundRateLimit, isDragonflyAvailable, dragonfly } from "@ebizmate/shared";
import { linkAndVerifyKB } from "../services/ingestion.js";
import { orchestrate } from "../orchestrator/orchestrator.js";
import { createEscalation } from "../orchestrator/escalation-manager.js";
import { detectYesNoIntent } from "../orchestrator/intent-classifier.js";
import { updateCustomerInboxMeta } from "./service.js";
import { summarizeCustomerProfile } from "./profile.js";
import { executeCustomerTool } from "./tools.js";

import { fetchConversationHistory } from "../orchestrator/orchestrator.js";

// Lazy registration flags for callbacks
let _callbacksRegistered = false;

/**
 * Translates a hardcoded system message (e.g., from the state machine) into the 
 * user's natural language by looking at recent chat history.
 */
async function translateSystemMessage(
    workspaceId: string,
    authorId: string | null,
    interactionId: string,
    systemMessage: string
): Promise<string> {
    if (!authorId) return systemMessage;

    try {
        const history = await fetchConversationHistory(workspaceId, authorId, interactionId, 5);
        if (history.length === 0) return systemMessage; // No context to translate from

        const ai = await getAIService(workspaceId, "customer");
        const aiResponse = await ai.chat({
            systemPrompt: "You are a seamless language translator for a chatbot. Your ONLY job is to take the provided system message and translate it naturally into the EXACT language/dialect the customer is using in the recent chat history (e.g., Nepali, Romanized Nepali, Hindi, English). Do NOT add any extra information, do NOT answer the user's questions, do NOT hallucinate. Just translate the exact meaning of the system message so it sounds natural.",
            history,
            userMessage: `SYSTEM MESSAGE TO TRANSLATE: "${systemMessage}"`,
            temperature: 0.1,
            maxTokens: 150,
        });

        return aiResponse.content.trim() || systemMessage;
    } catch (err) {
        console.warn("[Processor] Failed to translate system message, falling back to English:", err);
        return systemMessage;
    }
}

/**
 * Main entry point for processing a customer interaction.
 *
 * This function handles:
 * - Pre-checks (AI pause, human takeover, state machine)
 * - Delegating AI logic to the orchestrator
 * - Message dispatch to platform
 * - Database transaction updates
 * - Async side effects
 *
 * The orchestrator handles all AI pipeline logic (intent, RAG, response, confidence, escalation).
 */
export async function processInteraction(interactionId: string) {
    // Lazy register callbacks for the state machine
    if (!_callbacksRegistered) {
        setOrderCreator(createOrderTransaction);
        setIntentDetector(async (workspaceId: string, message: string, iId?: string) => {
            const ai = await getAIService(workspaceId, "customer");
            return await detectYesNoIntent(ai, message, iId);
        });
        _callbacksRegistered = true;
    }

    const startTime = Date.now();

    // 1️⃣ Fetch interaction + workspace + customer
    const interaction = await getInteractionWithRelations(interactionId);
    if (!interaction || !interaction.workspace) throw new Error("Interaction not found");

    const workspaceId = interaction.workspaceId;
    const ws = interaction.workspace;

    // --- AI Pause Check Check (Manual Override) ---
    if (ws.settings?.ai_active === false) {
        await updateInteractionStatus(interactionId, { status: "IGNORED", response: "AI_PAUSED_BY_USER" });
        return "AI_PAUSED_BY_USER";
    }

    // --- Autopilot Mode Verification (Epic 13) ---
    const autopilotMode = ws.autopilotMode as "ALWAYS_ON" | "AFTER_HOURS" | "OVERFLOW" | "OFF";
    let aiShouldSleep = false;
    let sleepReason = "";

    if (autopilotMode === "OFF") {
        aiShouldSleep = true;
        sleepReason = "AI set to OFF in autopilot settings";
    } else if (autopilotMode === "AFTER_HOURS") {
        // AI is only active OUTSIDE of business hours
        const tz = ws.timezone || "UTC";
        try {
            // Get HH:mm in target timezone (e.g. "14:30")
            const nowHourMin = new Intl.DateTimeFormat("en-US", {
                timeZone: tz,
                hour: "2-digit", minute: "2-digit", hour12: false
            }).format(new Date());

            const start = ws.businessHoursStart || "09:00";
            const end = ws.businessHoursEnd || "17:00";

            // If it's currently INSIDE business hours, the AI sleeps. (Format: HH:mm)
            if (nowHourMin >= start && nowHourMin < end) {
                aiShouldSleep = true;
                sleepReason = `Currently inside business hours (${start}-${end} ${tz}). AI deferred to human.`;
            }
        } catch (err) {
            console.warn(`[Processor] Timezone error for ${tz}, defaulting to Always On`, err);
        }
    } else if (autopilotMode === "OVERFLOW") {
        // AI is only active if the human is overwhelmed
        const capacity = ws.maxHumanCapacity || 5;
        try {
            const activeCount = await countActiveChats(workspaceId);
            // If active chats are LESS than or equal to capacity, human can handle it. AI sleeps.
            if (activeCount <= capacity) {
                aiShouldSleep = true;
                sleepReason = `Under capacity (${activeCount}/${capacity} active). AI deferred to human.`;
            }
        } catch (err) {
            console.error("[Processor] Capacity check failed", err);
        }
    }

    if (aiShouldSleep) {
        console.log(`[Processor] Skipping interaction ${interactionId} due to Autopilot: ${sleepReason}`);
        await updateInteractionStatus(interactionId, {
            status: "PENDING", // Keep it pending so the human sees it in the inbox
            meta: { ...(interaction.meta as any), aiSkippedReason: sleepReason }
        });
        return sleepReason;
    }

    // --- Human Takeover Check ---
    let customer = null;
    if (interaction.authorId) {
        customer = await findCustomerByPlatformId(workspaceId, interaction.authorId);
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
            // Translate the hardcoded state machine reply into the customer's language
            const translatedReply = await translateSystemMessage(
                workspaceId,
                interaction.authorId,
                interactionId,
                stateResult.reply
            );

            const metaObj = (interaction.meta as Record<string, any>) || {};
            await updateInteractionStatus(interactionId, {
                response: translatedReply,
                status: "PROCESSED",
                meta: { ...metaObj, isStateFlow: true }
            });
            return translatedReply;
        }
    }

    // 2️⃣ Delegate to AI Orchestrator
    //    The orchestrator handles: intent classification → RAG → response generation → confidence evaluation → escalation
    //    It returns structured data only — NO side effects.
    let result;
    try {
        // M-3 FIX: Pass pre-loaded interaction to avoid redundant DB read
        result = await orchestrate(interaction);
    } catch (err) {
        console.error("[Processor] Orchestrator failed:", err);
        await updateInteractionStatus(interactionId, { status: "FAILED", response: "AI processing failed" });

        // --- Graceful Degradation Fallback (Phase 4) ---
        // If the orchestrator completely fails (e.g. all AI providers are down),
        // we must not fail silently. Tell the customer we are escalating to a human.
        try {
            if (interaction.authorId) {
                let accessToken: string | undefined;
                if (interaction.workspace.accessToken) {
                    try { accessToken = decrypt(interaction.workspace.accessToken); }
                    catch { /* ignore */ }
                }

                const client = PlatformFactory.getClient(interaction.workspace.platform || "generic", {
                    accessToken,
                    rateLimitFn: checkOutboundRateLimit,
                });

                // Use a generic, safe system fallback message.
                const fallbackMessage = "I'm having a little trouble connecting to my system right now. Let me pass this to our human team and they'll get back to you shortly!";

                await client.send({
                    to: interaction.authorId,
                    text: fallbackMessage,
                    replyToMessageId: interaction.externalId,
                    workspaceId
                });
                console.log(`[Processor] 🛑 Dispatched graceful degradation fallback for interaction ${interactionId}`);
            }
        } catch (dispatchErr) {
            console.error("[Processor] Graceful degradation dispatch also failed:", dispatchErr);
        }

        throw err;
    }

    let { reply, intent, confidence, shouldEscalate, usedKnowledgeIds, detectedCategories, suggestedActions, confidenceSignals, toolCalls } = result;

    // ── Update Customer Preferences ──
    if (customer && detectedCategories && detectedCategories.length > 0) {
        try {
            const currentPrefs = customer.preferencesSummary || "";
            const currentCategories = currentPrefs.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            // FIX #13: Normalize to lowercase before dedup and storage
            const newCategories = detectedCategories
                .map(c => c.toLowerCase())
                .filter(c => !currentCategories.includes(c));

            if (newCategories.length > 0) {
                // FIX #8: Cap at 10 most recent categories to prevent unbounded growth
                const allCategories = [...currentCategories, ...newCategories];
                const capped = allCategories.slice(-10);
                const updatedPrefs = capped.join(', ');
                await updateCustomerPreferences(customer.id, updatedPrefs);
            }
        } catch (err) {
            console.error("[Processor] Failed to update preferences summary:", err);
        }
    }

    // ── Execute Native Customer Tools ──
    let platformPayload: any = null;

    if (toolCalls && toolCalls.length > 0 && customer) {
        let toolLogs = [];
        for (const tc of toolCalls) {
            const tr = await executeCustomerTool(tc.name, tc.arguments, {
                workspaceId,
                customerId: customer.id,
                customerName: interaction.authorName || interaction.authorId || "Unknown",
                customerPlatformId: interaction.authorId || "",
                interactionId,
                customerMessage: interaction.content,
                createOrderAndNotify: createOrderTransaction
            });
            toolLogs.push(tr.message);

            // If the tool returns a platform payload (e.g., carousel items), capture it
            if ('platformPayload' in tr && tr.platformPayload) {
                platformPayload = tr.platformPayload;
            }
        }
        const toolReply = toolLogs.join("\n\n");
        reply = await translateSystemMessage(workspaceId, interaction.authorId, interactionId, toolReply);
    }

    // 3️⃣ Non-actionable intents (greeting, gratitude) — respond without escalation
    const NON_ACTIONABLE_INTENTS = ["greeting", "gratitude"];
    const isNonActionable = NON_ACTIONABLE_INTENTS.includes(intent);
    const actuallyEscalate = shouldEscalate && !isNonActionable;

    // Override the reply with a polite holding message if we are escalating
    if (actuallyEscalate) {
        reply = "I want to make sure I give you the perfect answer, let me double-check that with the team and get right back to you!";
    }

    // 4️⃣ Determine final status based on orchestrator output
    let finalStatus: "PROCESSED" | "NEEDS_REVIEW" | "FAILED" = "PROCESSED";
    if (actuallyEscalate) {
        finalStatus = "NEEDS_REVIEW";
    }

    // 5️⃣ Execute escalation side-effects (orchestrator only returned data — we own the writes)
    if (actuallyEscalate) {
        try {
            let customerId: string | null = null;
            if (interaction.authorId) {
                const cust = await findCustomerByPlatformId(workspaceId, interaction.authorId);
                customerId = cust?.id || null;
            }

            const ai = await getAIService(workspaceId, "customer");
            await createEscalation(ai, {
                workspaceId,
                interactionId,
                customerId,
                customerMessage: interaction.content,
                detectedIntent: intent,
                generatedQuestion: "",
            });
        } catch (err) {
            console.error("[Processor] Escalation creation failed:", err);
        }
    }

    // 6️⃣ Dispatch outbound message (only when NOT escalating, or for non-actionable, OR when we injected the holding message)
    let dispatchSuccess = false;
    if (interaction.authorId && reply.length > 0) {
        try {
            let accessToken: string | undefined;
            if (interaction.workspace.accessToken) {
                try { accessToken = decrypt(interaction.workspace.accessToken); }
                catch { console.warn("Failed to decrypt workspace access token, falling back to env vars"); }
            }

            const client = PlatformFactory.getClient(interaction.workspace.platform || "generic", {
                accessToken,
                rateLimitFn: checkOutboundRateLimit,
            });

            const sendParams: any = {
                to: interaction.authorId,
                text: reply,
                replyToMessageId: interaction.externalId,
                workspaceId
            };

            // TikTok DM routing: pass conversation_id if present in interaction meta
            const meta = (interaction.meta as Record<string, any>) || {};
            if (meta.conversation_id) {
                sendParams.conversationId = meta.conversation_id;
            }

            if (platformPayload?.carouselItems) {
                sendParams.mediaType = "carousel";
                sendParams.carouselItems = platformPayload.carouselItems;
            }

            await client.send(sendParams);
            dispatchSuccess = true;
        } catch (err) {
            console.error("Dispatch failed:", err);
            finalStatus = "FAILED";
        }
    } else {
        dispatchSuccess = true;
    }

    // 7️⃣ Database Update (merge into existing meta — don't overwrite)
    const existingMeta = (interaction.meta as Record<string, any>) || {};
    await updateInteractionStatus(interactionId, {
        response: reply,
        status: finalStatus,
        meta: {
            ...existingMeta,
            intent,
            confidence,
            shouldEscalate: actuallyEscalate,
            usedKnowledgeIds,
            suggestedActions,
            confidenceSignals,
            dispatchSuccess,
            orchestratorVersion: "v1",
        }
    });

    // 8️⃣ System-level action dispatch — CREATE NOTIFICATIONS

    // (Deprecated order collection logic removed in favor of Native Cart AI Tools)

    // Appointments → start multi-turn collection flow (state machine)
    if (suggestedActions.includes("appointment_request") && !actuallyEscalate && customer) {
        try {
            await updateCustomerConversationState(customer.id, "COLLECTING_SERVICE", {
                collectionType: "appointment",
                workspaceId,
                interactionId,
                customerName: interaction.authorName || interaction.authorId || "Unknown",
                customerPlatformId: interaction.authorId || "",
                customerId: customer.id,
                customerMessage: interaction.content,
            });
            const rawReply = "I'd love to help you book that! What service are you looking for?";
            reply = await translateSystemMessage(workspaceId, interaction.authorId, interactionId, rawReply);
            await updateInteractionStatus(interactionId, { response: reply });
        } catch (err) {
            console.error("[Processor] Failed to start appointment collection:", err);
        }
    }

    // Call requests → start multi-turn collection flow (state machine)
    if (suggestedActions.includes("call_request") && !actuallyEscalate && customer) {
        try {
            await updateCustomerConversationState(customer.id, "COLLECTING_PHONE", {
                collectionType: "call_request",
                workspaceId,
                interactionId,
                customerName: interaction.authorName || interaction.authorId || "Unknown",
                customerPlatformId: interaction.authorId || "",
                customerId: customer.id,
                customerMessage: interaction.content,
            });
            const rawReply = "Of course! What's the best phone number to reach you?";
            reply = await translateSystemMessage(workspaceId, interaction.authorId, interactionId, rawReply);
            await updateInteractionStatus(interactionId, { response: reply });
        } catch (err) {
            console.error("[Processor] Failed to start call collection:", err);
        }
    }

    // 9️⃣ ARCH-2 FIX: Async side effects — use Promise.allSettled instead of fire-and-forget
    // This ensures failures are logged and don't crash, but are also visible.
    const sideEffects: Array<{ name: string; promise: Promise<any> }> = [];

    if (actuallyEscalate) {
        sideEffects.push({ name: 'linkAndVerifyKB', promise: linkAndVerifyKB(workspaceId) });
    }
    if (customer?.id) {
        sideEffects.push({ name: 'updateInboxMeta', promise: updateCustomerInboxMeta(customer.id) });
        sideEffects.push({ name: 'summarizeProfile', promise: summarizeCustomerProfile(workspaceId, customer.id) });
    }

    if (sideEffects.length > 0) {
        const results = await Promise.allSettled(sideEffects.map(s => s.promise));
        results.forEach((result, i) => {
            if (result.status === 'rejected') {
                console.error(`[Processor] Side-effect '${sideEffects[i].name}' failed:`, result.reason);
            }
        });
    }

    // 8️⃣ Logging
    const latency = Date.now() - startTime;
    console.log(`[Interaction] ${interactionId} processed in ${latency}ms | intent=${intent} confidence=${confidence.toFixed(2)} escalated=${shouldEscalate}`);
    return reply;
}

// Code moved to packages/domain/src/orders/dao.ts

// ── System Event Handling ───────────────────────────────────────────────────

/**
 * Trigger the Customer Bot to generate a contextual response to a system event
 * (e.g., an order confirmation or rejection from the Coach/Seller).
 * This maintains the Customer Bot's persona, context, and conversation history.
 */
export async function handleSystemNotification(
    originalInteractionId: string,
    systemEventMsg: string,
    coachNote: string | null
): Promise<void> {
    // 1. Fetch the original interaction to get routing/context info
    const interaction = await getInteractionWithRelations(originalInteractionId);
    if (!interaction || !interaction.workspace || !interaction.authorId) {
        console.warn(`[SystemNotification] Could not route notification for interaction ${originalInteractionId}`);
        return;
    }

    const { workspaceId, authorId } = interaction;

    // 2. Fetch history using the orchestrator helper
    const historyData = await fetchConversationHistory(
        workspaceId,
        authorId,
        originalInteractionId,
        10
    );

    const history: { role: "user" | "assistant" | "system", content: string }[] = [];
    historyData.forEach((h: any) => {
        history.push({ role: h.role, content: h.content });
    });

    // 3. Construct the prompt
    let promptMsg = `[SYSTEM EVENT]: ${systemEventMsg}`;
    if (coachNote) {
        promptMsg += `\n[SELLER NOTE TO CUSTOMER]: "${coachNote}"`;
    }
    promptMsg += `\nPlease write a short, friendly reply to the customer informing them of this update. Do not reveal that this is a system event, just speak naturally as the AI assistant representing the business. Address the seller note if it exists. CRITICAL: Analyze the conversation history and reply in the EXACT language and dialect the customer is using (e.g., Nepali, Romanized Nepali, Hindi, English).`;

    history.push({ role: "system", content: promptMsg });

    // 4. Generate the reply via the Customer Bot AI
    try {
        const ai = await getAIService(workspaceId, "customer");
        const aiResponse = await ai.chat({
            systemPrompt: "You are the helpful AI assistant for this business. You are conveying an update to the customer based on a system event. Keep it friendly, short, and to the point. Address the seller note if it exists.",
            history: history as any, // Cast purely for the type boundary
            userMessage: "Acknowledge the system event and tell the customer.",
            temperature: 0.4,
            maxTokens: 150,
        });

        const reply = aiResponse.content;

        // 5. Build platform client and send the message
        let accessToken: string | undefined;
        if (interaction.workspace.accessToken) {
            try { accessToken = decrypt(interaction.workspace.accessToken as string); }
            catch { /* ignore */ }
        }

        const client = PlatformFactory.getClient(interaction.workspace.platform || "generic", {
            accessToken,
            rateLimitFn: checkOutboundRateLimit,
        });

        await client.send({
            to: authorId,
            text: reply,
            replyToMessageId: interaction.externalId as string,
            workspaceId
        });

        // 6. Record this as a new interaction so the bot remembers it!
        await saveSystemEventInteraction(
            workspaceId,
            originalInteractionId,
            authorId,
            interaction.authorName as string | null,
            systemEventMsg,
            reply,
            coachNote
        );

    } catch (err) {
        console.error(`[SystemNotification] Failed to generate/send customer notification:`, err);
    }
}
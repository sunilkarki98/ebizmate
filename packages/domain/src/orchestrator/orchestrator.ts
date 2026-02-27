/**
 * AI Orchestrator — Main Composition Layer
 *
 * This is the central coordinator that composes all AI pipeline components.
 * It is a PURE function — it returns structured data only.
 * The caller (processInteraction) handles all side effects:
 *   - Message dispatch
 *   - Database updates
 *   - Order creation
 *   - Notification triggers
 *
 * This design keeps the orchestrator testable and deterministic.
 */

import { db } from "@ebizmate/db";
import { interactions } from "@ebizmate/db";
import { eq, and, not, desc } from "drizzle-orm";
import { getAIService } from "../services/factory.js";
import { classifyIntent } from "./intent-classifier.js";
import { retrieveKnowledge } from "./knowledge-retriever.js";
import { generateResponse } from "./response-generator.js";
import { evaluateConfidence } from "./confidence-evaluator.js";
import type {
    OrchestratorResult,
    WorkspaceContext,
    ConversationTurn,
} from "./types.js";

/**
 * Orchestrate the full AI pipeline for a customer interaction.
 *
 * Pipeline:
 * 1. Classify intent (dedicated LLM call, temperature 0.0)
 * 2. Retrieve knowledge (hybrid RAG with intent boosting)
 * 3. Generate structured response (RAG-grounded, Zod validated)
 * 4. Evaluate confidence (multi-signal, deterministic algorithm)
 * 5. Decide: respond directly or escalate
 *
 * M-3 FIX: Accepts a pre-loaded interaction object to avoid redundant DB reads.
 * The caller (processInteraction) already fetches the interaction, so passing it
 * in eliminates ~2-4ms of wasted DB latency per message.
 *
 * @param interactionOrId - Pre-loaded interaction (with workspace, post, customer) OR fallback interactionId string
 * @returns OrchestratorResult — structured data, NO side effects
 */
export async function orchestrate(interactionOrId: string | { id: string; workspaceId: string; content: string; sourceId: string | null; authorId: string | null; workspace: any; post: any; customer: any }): Promise<OrchestratorResult> {
    // M-3 FIX: Use pre-loaded interaction if provided, otherwise fetch (backward compat)
    let interaction: any;
    if (typeof interactionOrId === 'string') {
        interaction = await db.query.interactions.findFirst({
            where: eq(interactions.id, interactionOrId),
            with: { workspace: true, post: true, customer: true },
        });
    } else {
        interaction = interactionOrId;
    }

    if (!interaction || !interaction.workspace) {
        const id = typeof interactionOrId === 'string' ? interactionOrId : interactionOrId.id;
        throw new Error(`Interaction ${id} not found`);
    }

    const workspace = interaction.workspace as unknown as WorkspaceContext;
    const workspaceId = interaction.workspaceId;
    const interactionId = typeof interactionOrId === 'string' ? interactionOrId : interactionOrId.id;

    // ── Get AI Service ──
    const ai = await getAIService(workspaceId, "customer");

    // ── Fetch Conversation History ──
    const history = await fetchConversationHistory(
        workspaceId,
        interaction.authorId,
        interactionId,
    );

    // ── 1. Intent Classification ──
    const intentResult = await classifyIntent(ai, interaction.content, history, interactionId);

    // ── 2. Knowledge Retrieval (intent-aware & context-aware) ──
    const knowledge = await retrieveKnowledge(
        ai,
        workspaceId,
        interaction.content,
        intentResult.intent,
        interactionId,
        history,
    );

    // ── 2.5. Ambiguity Detection ──
    let isAmbiguous = false;
    // Only detect ambiguity if the intent relates to specific items and we have multiple strong matches
    if (["product_inquiry", "order_intent", "price_check"].includes(intentResult.intent) && knowledge.length >= 2) {
        // If the top 2 results have very similar scores (tied), it is ambiguous
        if (knowledge[0].similarity - knowledge[1].similarity <= 0.05) {
            isAmbiguous = true;
        }
    }

    // ── 3. Response Generation ──
    const isSimulation = interaction.sourceId === "simulation";
    const preferencesSummary = (interaction.customer as any)?.preferencesSummary || null;

    const response = await generateResponse(
        ai,
        workspace,
        interaction.content,
        intentResult.intent,
        knowledge,
        history,
        interactionId,
        isSimulation,
        isAmbiguous,
        preferencesSummary,
    );

    // ── 4. Confidence Evaluation ──
    const confidenceResult = evaluateConfidence(intentResult, response, knowledge);

    // ── 5. Return Structured Result (NO side effects — caller handles escalation) ──
    return {
        reply: response.reply,
        intent: intentResult.intent,
        confidence: confidenceResult.finalConfidence,
        usedKnowledgeIds: response.usedKnowledgeIds,
        detectedCategories: response.detectedCategories || [],
        needsClarification: response.needsClarification,
        shouldEscalate: confidenceResult.shouldEscalate,
        suggestedActions: response.suggestedActions,
        confidenceSignals: confidenceResult.signals,
    };
}

// ── History Helper ──────────────────────────────────────────────────────────

export async function fetchConversationHistory(
    workspaceId: string,
    authorId: string | null,
    currentInteractionId: string,
    maxTurns: number = 3, // Reduced from 15 to 3: Prevents massive LLM token bloat. Older memory handled by summarizeCustomerProfile background job.
): Promise<ConversationTurn[]> {
    if (!authorId) return [];

    const past = await db.select().from(interactions)
        .where(and(
            eq(interactions.workspaceId, workspaceId),
            eq(interactions.authorId, authorId),
            not(eq(interactions.id, currentInteractionId)),
        ))
        .orderBy(desc(interactions.createdAt))
        .limit(maxTurns);

    const history: ConversationTurn[] = [];
    past.reverse().forEach((h: any) => {
        history.push({ role: "user", content: h.content ? h.content.substring(0, 2000) : "" });
        history.push({ role: "assistant", content: h.response ? h.response.substring(0, 2000) : "..." });
    });

    return history;
}

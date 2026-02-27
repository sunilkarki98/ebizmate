/**
 * AI Orchestrator — Shared Types
 *
 * All structured interfaces used across orchestrator components.
 * The LLM produces these structures; the system validates and acts on them.
 */

import { z } from "zod";

// ─── Intent Classification ──────────────────────────────────────────────────

export const INTENTS = [
    "product_inquiry",
    "price_check",
    "delivery_question",
    "negotiation",
    "order_intent",
    "appointment_request",
    "call_request",
    "complaint",
    "greeting",
    "gratitude",
    "unknown",
] as const;

export type Intent = typeof INTENTS[number];

export const IntentResultSchema = z.object({
    intent: z.enum(INTENTS),
    confidence: z.number().min(0).max(1),
    reasoning: z.string().optional(),
});

export type IntentResult = z.infer<typeof IntentResultSchema>;

// ─── Knowledge Retrieval ────────────────────────────────────────────────────

export interface RetrievedKnowledge {
    id: string;
    name: string;
    content: string | null;
    category: string | null;
    meta: Record<string, unknown> | null;
    similarity: number;
    sourceId: string | null;
}

// ─── Response Generation ────────────────────────────────────────────────────

export const SUGGESTED_ACTIONS = [
    "order_intent",
    "appointment_request",
    "call_request",
    "escalate_to_human",
    "no_action",
] as const;

export type SuggestedAction = typeof SUGGESTED_ACTIONS[number];

export const OrchestratorResponseSchema = z.object({
    reply: z.string(),
    intent: z.enum(INTENTS),
    confidence: z.number().min(0).max(1),
    usedKnowledgeIds: z.array(z.string()).default([]),
    detectedCategories: z.array(z.string()).default([]),
    needsClarification: z.boolean().default(false),
    suggestedActions: z.array(z.enum(SUGGESTED_ACTIONS)).default(["no_action"]),
    toolCalls: z.array(z.object({
        id: z.string(),
        name: z.string(),
        arguments: z.record(z.unknown())
    })).optional(),
});

export type OrchestratorResponse = z.infer<typeof OrchestratorResponseSchema>;

// ─── Confidence Evaluation ──────────────────────────────────────────────────

export interface ConfidenceSignals {
    intentConfidence: number;
    selfReportedConfidence: number;
    knowledgeCoverage: number;      // ratio of query concepts matched by KB
    knowledgeItemCount: number;     // how many KB items were used
}

export interface ConfidenceResult {
    finalConfidence: number;
    shouldEscalate: boolean;
    signals: ConfidenceSignals;
}

// ─── Escalation ─────────────────────────────────────────────────────────────

export interface ClarificationTicketInput {
    workspaceId: string;
    interactionId: string;
    customerId: string | null;
    customerMessage: string;
    detectedIntent: Intent;
    generatedQuestion: string;
    conversationContext?: Record<string, unknown>;
}

// ─── Knowledge Extraction ───────────────────────────────────────────────────

export const KNOWLEDGE_TYPES = [
    "pricing_rule",
    "delivery_rule",
    "product_variant",
    "faq",
    "negotiation_rule",
    "policy",
    "general",
] as const;

export type KnowledgeType = typeof KNOWLEDGE_TYPES[number];

export const ExtractedKnowledgeItemSchema = z.object({
    type: z.enum(KNOWLEDGE_TYPES),
    name: z.string().min(1),
    content: z.string().min(1),
    meta: z.record(z.unknown()).optional(),
    confidence: z.number().min(0).max(1),
});

export type ExtractedKnowledge = z.infer<typeof ExtractedKnowledgeItemSchema> & {
    needsSellerConfirmation: boolean;
};

export const KnowledgeExtractionResultSchema = z.object({
    knowledgeItems: z.array(ExtractedKnowledgeItemSchema),
});

// ─── Orchestrator Result (returned to processor) ────────────────────────────

export interface OrchestratorResult {
    /** The generated reply text */
    reply: string;
    /** Classified intent */
    intent: Intent;
    /** Final evaluated confidence */
    confidence: number;
    /** IDs of KB items used for attribution */
    usedKnowledgeIds: string[];
    /** Product categories AI believes customer wants */
    detectedCategories: string[];
    /** Whether the response needs seller clarification */
    needsClarification: boolean;
    /** Whether the orchestrator recommends escalation */
    shouldEscalate: boolean;
    /** Suggested system-level actions (the system decides whether to execute) */
    suggestedActions: SuggestedAction[];
    /** Confidence evaluation breakdown */
    confidenceSignals: ConfidenceSignals;
    /** Generated escalation question (if shouldEscalate) */
    escalationQuestion?: string;
    /** Output Native tool calls if the customer AI invoked them */
    toolCalls?: { id: string; name: string; arguments: Record<string, unknown> }[];
}

// ─── Workspace Context (passed into orchestrator) ───────────────────────────

export interface WorkspaceContext {
    id: string;
    name: string | null;
    businessName: string | null;
    industry: string | null;
    about: string | null;
    targetAudience: string | null;
    toneOfVoice: string | null;
    settings: Record<string, unknown> | null;
    platform: string | null;
}

// ─── Conversation Turn ─────────────────────────────────────────────────────

export interface ConversationTurn {
    role: "user" | "assistant" | "system";
    content: string;
}

// ─── Thresholds ─────────────────────────────────────────────────────────────

export const CONFIDENCE_THRESHOLD = 0.75;
export const VECTOR_SIMILARITY_THRESHOLD = 0.5;
export const HYBRID_SCORE_THRESHOLD = 0.4;
export const DEDUP_SIMILARITY_THRESHOLD = 0.85;

/**
 * Confidence Evaluator
 *
 * Multi-signal confidence assessment that combines:
 * 1. Intent classification confidence
 * 2. LLM self-reported response confidence
 * 3. Knowledge coverage ratio
 * 4. Knowledge item count
 *
 * This is a deterministic algorithm — no LLM call needed.
 */

import {
    CONFIDENCE_THRESHOLD,
    type ConfidenceResult,
    type ConfidenceSignals,
    type RetrievedKnowledge,
    type OrchestratorResponse,
    type IntentResult,
} from "./types.js";

/**
 * Evaluate the final confidence of an orchestrated response.
 *
 * @param intentResult - Result from intent classification
 * @param response - Generated response from ResponseGenerator
 * @param knowledge - Retrieved knowledge items
 * @returns ConfidenceResult with final score and escalation recommendation
 */
export function evaluateConfidence(
    intentResult: IntentResult,
    response: OrchestratorResponse,
    knowledge: RetrievedKnowledge[],
): ConfidenceResult {
    const signals: ConfidenceSignals = {
        intentConfidence: intentResult.confidence,
        selfReportedConfidence: response.confidence,
        knowledgeCoverage: computeKnowledgeCoverage(response.usedKnowledgeIds, knowledge),
        knowledgeItemCount: knowledge.length,
    };

    // Weighted combination of signals
    const weights = {
        intentConfidence: 0.15,
        selfReportedConfidence: 0.40,
        knowledgeCoverage: 0.35,
        knowledgeItemPenalty: 0.10,
    };

    // Base score from weighted signals
    let finalConfidence =
        weights.intentConfidence * signals.intentConfidence +
        weights.selfReportedConfidence * signals.selfReportedConfidence +
        weights.knowledgeCoverage * signals.knowledgeCoverage;

    // Penalty if no knowledge items were found at all
    if (signals.knowledgeItemCount === 0) {
        finalConfidence *= 0.5; // Halve confidence when KB is empty
    }

    // Boost if multiple knowledge items were used (cross-referencing)
    if (response.usedKnowledgeIds.length >= 2) {
        finalConfidence = Math.min(1.0, finalConfidence * 1.1);
    }

    // Hard override: if response explicitly says it needs clarification
    if (response.needsClarification) {
        finalConfidence = Math.min(finalConfidence, CONFIDENCE_THRESHOLD - 0.01);
    }

    // Clamp to [0, 1]
    finalConfidence = Math.max(0, Math.min(1, finalConfidence));

    const shouldEscalate =
        finalConfidence < CONFIDENCE_THRESHOLD ||
        response.needsClarification ||
        response.suggestedActions.includes("escalate_to_human");

    return {
        finalConfidence,
        shouldEscalate,
        signals,
    };
}

/**
 * Compute how much of the retrieved knowledge was actually used.
 * Higher coverage = higher confidence.
 */
function computeKnowledgeCoverage(usedIds: string[], knowledge: RetrievedKnowledge[]): number {
    if (knowledge.length === 0) return 0;
    const usedCount = usedIds.filter(id => knowledge.some(k => k.id === id)).length;
    // We don't penalize for not using ALL items — using 2+ out of 8 is fine
    // But using 0 out of 8 is suspicious
    if (usedCount === 0) return 0.2;
    if (usedCount === 1) return 0.6;
    return Math.min(1.0, 0.6 + usedCount * 0.1);
}

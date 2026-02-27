/**
 * AI Orchestrator — Public API
 */

// Core orchestrator
export { orchestrate } from "./orchestrator.js";

// Individual components (for testing and advanced usage)
export { classifyIntent } from "./intent-classifier.js";
export { retrieveKnowledge } from "./knowledge-retriever.js";
export { generateResponse } from "./response-generator.js";
export { evaluateConfidence } from "./confidence-evaluator.js";
export { createEscalation, resolveEscalation } from "./escalation-manager.js";
export { extractKnowledge } from "./knowledge-extractor.js";

// Types
export type {
    Intent,
    IntentResult,
    RetrievedKnowledge,
    OrchestratorResponse,
    OrchestratorResult,
    ConfidenceResult,
    ConfidenceSignals,
    ClarificationTicketInput,
    ExtractedKnowledge,
    KnowledgeType,
    SuggestedAction,
    WorkspaceContext,
    ConversationTurn,
} from "./types.js";

// Constants
export {
    INTENTS,
    KNOWLEDGE_TYPES,
    SUGGESTED_ACTIONS,
    CONFIDENCE_THRESHOLD,
} from "./types.js";

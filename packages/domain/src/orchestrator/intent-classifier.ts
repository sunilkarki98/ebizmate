/**
 * Intent Classifier
 *
 * Dedicated LLM call that classifies customer messages into structured intents.
 * Returns ONLY structured JSON — no natural language generation.
 * Uses temperature 0.0 for deterministic classification.
 */

import type { ChatParams } from "@ebizmate/contracts";
import { IntentResultSchema, type IntentResult, type ConversationTurn } from "./types.js";
import { INTENT_CLASSIFICATION_PROMPT, YES_NO_CLASSIFICATION_PROMPT } from "./prompts.js";
import { z } from "zod";

interface AIService {
    chat(params: ChatParams, interactionId?: string, usageType?: string): Promise<{ content: string; usage: any; model: string }>;
}

/**
 * Classify customer message intent using a dedicated LLM call.
 *
 * @param ai - AI service instance (from getAIService)
 * @param customerMessage - The raw customer message
 * @param history - Conversation history for context
 * @param interactionId - For usage tracking
 * @returns Validated IntentResult with intent and confidence
 */
export async function classifyIntent(
    ai: AIService,
    customerMessage: string,
    history: ConversationTurn[] = [],
    interactionId?: string,
): Promise<IntentResult> {
    // Build a compressed conversation summary from recent history
    const conversationSummary = history.length > 0
        ? history.slice(-6).map(h => `${h.role}: ${h.content.substring(0, 100)}`).join("\n")
        : "";

    const prompt = INTENT_CLASSIFICATION_PROMPT(customerMessage, conversationSummary);

    try {
        const result = await ai.chat({
            systemPrompt: "You are a strict JSON-only intent classifier. Return ONLY valid JSON, no markdown.",
            userMessage: prompt,
            temperature: 0.0,     // Deterministic — same input → same classification
            maxTokens: 200,       // Intent classification is small
        }, interactionId, "chat");

        // Strip any markdown fencing the model might add
        const raw = result.content.replace(/```json\s*|```\s*/g, "").trim();
        const parsed = JSON.parse(raw);
        const validated = IntentResultSchema.parse(parsed);

        return validated;

    } catch (err) {
        console.warn("[IntentClassifier] Classification failed, defaulting to unknown:", err);

        // Fail safely — unknown intent with low confidence triggers escalation
        return {
            intent: "unknown",
            confidence: 0.3,
            reasoning: "Classification failed — defaulting to unknown for safety",
        };
    }
}

const YesNoResultSchema = z.object({
    intent: z.enum(["yes", "no", "unknown"]),
});

export type YesNoIntent = "yes" | "no" | "unknown";

/**
 * Classify if a message means YES or NO regardless of language,
 * using a fast, deterministic AI call.
 */
export async function detectYesNoIntent(
    ai: AIService,
    customerMessage: string,
    interactionId?: string,
): Promise<YesNoIntent> {
    const prompt = YES_NO_CLASSIFICATION_PROMPT(customerMessage);

    try {
        const result = await ai.chat({
            systemPrompt: "You are a strict JSON-only Yes/No classifier. Return ONLY valid JSON, no markdown.",
            userMessage: prompt,
            temperature: 0.0,
            maxTokens: 50,
        }, interactionId, "chat_yes_no");

        const raw = result.content.replace(/```json\s*|```\s*/g, "").trim();
        const parsed = JSON.parse(raw);
        const validated = YesNoResultSchema.parse(parsed);

        return validated.intent;
    } catch (err) {
        console.warn("[YesNoClassifier] Classification failed, defaulting to unknown:", err);
        return "unknown";
    }
}

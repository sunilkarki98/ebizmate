/**
 * Knowledge Extractor
 *
 * Extracts structured, reusable knowledge from seller replies
 * and conversation transcripts. Each extracted item is validated,
 * deduplicated against existing KB, and stored with appropriate
 * confidence markers.
 */

import { db } from "@ebizmate/db";
import { items } from "@ebizmate/db";
import { eq, and, gt } from "drizzle-orm";
import { cosineDistance, sql } from "drizzle-orm";
import type { ChatParams } from "@ebizmate/contracts";
import {
    KnowledgeExtractionResultSchema,
    DEDUP_SIMILARITY_THRESHOLD,
    type ExtractedKnowledge,
} from "./types.js";
import { KNOWLEDGE_EXTRACTION_PROMPT } from "./prompts.js";

interface AIService {
    chat(params: ChatParams, interactionId?: string, usageType?: string): Promise<{ content: string; usage: any; model: string }>;
    embed(input: string, interactionId?: string): Promise<{ embedding: number[] }>;
}

/**
 * Extract structured knowledge from a text source (seller reply, conversation, etc.)
 *
 * @param ai - AI service for extraction and embedding
 * @param workspaceId - Target workspace for storing extracted knowledge
 * @param sourceText - The text to extract knowledge from
 * @param context - Optional context about the source (e.g., "reply to delivery question")
 * @param interactionId - For usage tracking
 * @returns Array of extracted and stored knowledge items
 */
export async function extractKnowledge(
    ai: AIService,
    workspaceId: string,
    sourceText: string,
    context: string = "",
    interactionId?: string,
): Promise<ExtractedKnowledge[]> {
    const prompt = KNOWLEDGE_EXTRACTION_PROMPT(sourceText, context);

    let rawItems: Array<{
        type: string;
        name: string;
        content: string;
        meta?: Record<string, unknown>;
        confidence: number;
    }> = [];

    try {
        const result = await ai.chat({
            systemPrompt: "Return ONLY valid JSON. No markdown fencing.",
            userMessage: prompt,
            temperature: 0.2,
            maxTokens: 2048,
        }, interactionId, "chat");

        const raw = result.content.replace(/```json\s*|```\s*/g, "").trim();
        const parsed = JSON.parse(raw);
        const validated = KnowledgeExtractionResultSchema.parse(parsed);
        rawItems = validated.knowledgeItems as typeof rawItems;

    } catch (err) {
        console.warn("[KnowledgeExtractor] Extraction failed:", err);
        return [];
    }

    // Process each extracted item: deduplicate and store
    const storedItems: ExtractedKnowledge[] = [];

    for (const item of rawItems) {
        const needsConfirmation = item.confidence < 0.75;

        try {
            // Generate embedding for deduplication
            let embedding: number[] | null = null;
            try {
                embedding = (await ai.embed(`${item.name}: ${item.content}`, interactionId)).embedding;
            } catch {
                console.warn(`[KnowledgeExtractor] Embedding failed for "${item.name}"`);
            }

            // Check for duplicates via semantic similarity
            let isDuplicate = false;
            if (embedding) {
                const similarityExpr = sql<number>`1 - (${cosineDistance(items.embedding, embedding)})`;
                const duplicates = await db.select({ id: items.id, similarity: similarityExpr })
                    .from(items)
                    .where(and(
                        eq(items.workspaceId, workspaceId),
                        gt(similarityExpr, DEDUP_SIMILARITY_THRESHOLD),
                    ))
                    .limit(1);

                if (duplicates.length > 0) {
                    isDuplicate = true;
                    console.log(`[KnowledgeExtractor] Skipping duplicate "${item.name}" (similarity: ${duplicates[0].similarity})`);
                }
            }

            if (!isDuplicate) {
                // Map extraction type to existing KB category
                const category = mapTypeToCategory(item.type);

                await db.insert(items).values({
                    workspaceId,
                    name: item.name,
                    content: item.content,
                    category,
                    meta: item.meta || null,
                    sourceId: "knowledge_extraction",
                    isVerified: !needsConfirmation,
                    embedding,
                });

                storedItems.push({
                    type: item.type as any,
                    name: item.name,
                    content: item.content,
                    meta: item.meta,
                    confidence: item.confidence,
                    needsSellerConfirmation: needsConfirmation,
                });
            }
        } catch (err) {
            console.error(`[KnowledgeExtractor] Failed to store "${item.name}":`, err);
        }
    }

    return storedItems;
}

/**
 * Map extraction types to existing KB categories.
 */
function mapTypeToCategory(type: string): string {
    const map: Record<string, string> = {
        pricing_rule: "product",
        delivery_rule: "policy",
        product_variant: "product",
        faq: "faq",
        negotiation_rule: "policy",
        policy: "policy",
        general: "general",
    };
    return map[type] || "general";
}

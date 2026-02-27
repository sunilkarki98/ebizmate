/**
 * Knowledge Retriever (RAG Pipeline)
 *
 * Extracted from the monolithic processInteraction().
 * Performs hybrid search (vector + keyword) with intent-aware boosting.
 * Returns ranked, deduplicated knowledge items with similarity scores.
 */

import { db } from "@ebizmate/db";
import { items } from "@ebizmate/db";
import { eq, or, and, desc, sql, gt, isNull, inArray, ilike } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm";
import { sanitizeLikeInput } from "@ebizmate/shared";
import type { ChatParams } from "@ebizmate/contracts";
import type { RetrievedKnowledge, Intent, ConversationTurn } from "./types.js";
import { VECTOR_SIMILARITY_THRESHOLD, HYBRID_SCORE_THRESHOLD } from "./types.js";

interface AIService {
    embed(input: string, interactionId?: string): Promise<{ embedding: number[] }>;
}

const STOP_WORDS = new Set(["the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "to", "in", "on", "at", "for", "with", "about", "of", "this", "that", "it", "they", "we", "you", "i", "how", "what", "where", "when", "why", "who", "does", "do", "did", "can", "could", "would", "should", "will", "much", "many", "some", "any"]);

// ─── Hybrid Scoring ─────────────────────────────────────────────────────────

function computeHybridScore(
    similarity: number,
    keywordScore: number,
    recencyBoost: number,
    intentBoost: number = 0,
): number {
    return 0.5 * similarity + 0.25 * keywordScore + 0.1 * recencyBoost + 0.15 * intentBoost;
}

/**
 * Intent-aware category boosting.
 * Certain intents should prioritize certain KB item categories.
 */
function getIntentCategoryBoost(intent: Intent, category: string | null): number {
    if (!category) return 0;

    const boostMap: Record<string, string[]> = {
        price_check: ["product", "service"],
        delivery_question: ["policy"],
        product_inquiry: ["product", "service"],
        order_intent: ["product", "service"],
        complaint: ["policy", "faq"],
        negotiation: ["product", "service"],
        appointment_request: ["service"],
    };

    const boostedCategories = boostMap[intent];
    if (boostedCategories?.includes(category)) return 1.0;

    return 0;
}

// ─── Main Retrieval Function ────────────────────────────────────────────────

/**
 * Retrieve relevant knowledge items using hybrid search.
 *
 * @param ai - AI service for generating embeddings
 * @param workspaceId - Workspace to search within
 * @param customerMessage - The query text
 * @param intent - Classified intent for category boosting
 * @param interactionId - For usage tracking
 * @param maxResults - Maximum items to return
 * @returns Ranked array of RetrievedKnowledge with similarity scores
 */
export async function retrieveKnowledge(
    ai: AIService,
    workspaceId: string,
    customerMessage: string,
    intent: Intent,
    interactionId?: string,
    history: ConversationTurn[] = [],
    maxResults: number = 8,
): Promise<RetrievedKnowledge[]> {
    // ── 1. Stop-word Filtering for Keywords ──
    const keywords = customerMessage
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .split(" ")
        .filter(w => w.length > 2 && !STOP_WORDS.has(w))
        .slice(0, 5);

    // ── 2. Context-Aware Query for Embedding ──
    // If the user says "how much is it?", we need the prior context to know what "it" is.
    let searchContext = customerMessage;
    if (history.length > 0 && customerMessage.split(" ").length < 6) {
        // If the query is short, inject the last assistant reply for context
        const lastAssistantTurn = history.slice().reverse().find(t => t.role === "assistant");
        if (lastAssistantTurn) {
            searchContext = `Context: ${lastAssistantTurn.content.slice(0, 100)}... Query: ${customerMessage}`;
        }
    }

    try {
        const [vectorResults, keywordResults] = await Promise.all([
            // ── Vector Search ──
            (async () => {
                const embedding = (await ai.embed(searchContext, interactionId)).embedding;
                const similarityExpr = sql<number>`1 - (${cosineDistance(items.embedding, embedding)})`;

                return db.select({
                    item: items,
                    similarity: similarityExpr,
                }).from(items)
                    .where(and(
                        eq(items.workspaceId, workspaceId),
                        gt(similarityExpr, VECTOR_SIMILARITY_THRESHOLD),
                        or(isNull(items.expiresAt), gt(items.expiresAt, new Date())),
                    ))
                    .orderBy(desc(similarityExpr))
                    .limit(maxResults + 2); // Fetch slightly more for re-ranking
            })(),

            // ── Keyword Search (Parallel) ──
            (async () => {
                if (keywords.length === 0) return [];
                const conditions = keywords.map(kw => {
                    const safeKw = sanitizeLikeInput(kw);
                    return or(ilike(items.name, `%${safeKw}%`), ilike(items.content, `%${safeKw}%`));
                });
                return db.select().from(items)
                    .where(and(
                        eq(items.workspaceId, workspaceId),
                        or(...conditions),
                        or(isNull(items.expiresAt), gt(items.expiresAt, new Date())),
                    ))
                    .limit(maxResults);
            })(),
        ]);

        // ── Hybrid Scoring & Re-ranking ──
        const itemsMap = new Map<string, {
            item: typeof items.$inferSelect;
            similarity: number;
            keywordScore: number;
        }>();

        vectorResults.forEach(r => {
            itemsMap.set(r.item.id, { item: r.item, similarity: r.similarity, keywordScore: 0 });
        });

        keywordResults.forEach(ki => {
            const entry = itemsMap.get(ki.id);
            if (entry) {
                entry.keywordScore = 1.0; // Found in both vector + keyword
            } else {
                itemsMap.set(ki.id, { item: ki, similarity: 0, keywordScore: 1.0 });
            }
        });

        // Score, filter, sort, and truncate
        const now = Date.now();
        const rankedItems = Array.from(itemsMap.values())
            .map(entry => {
                const intentBoost = getIntentCategoryBoost(intent, entry.item.category);

                // Recency Boost: Max 1.0 for items updated today, decaying over 90 days
                let recencyBoost = 0;
                if (entry.item.updatedAt) {
                    const daysOld = (now - entry.item.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
                    recencyBoost = Math.max(0, 1 - (daysOld / 90));
                }

                const hybridScore = computeHybridScore(
                    entry.similarity,
                    entry.keywordScore,
                    recencyBoost,
                    intentBoost,
                );
                return { ...entry, hybridScore };
            })
            .filter(e => e.hybridScore > HYBRID_SCORE_THRESHOLD)
            .sort((a, b) => b.hybridScore - a.hybridScore)
            .slice(0, maxResults);

        // ── Expand Related Items ──
        const relatedIds = new Set<string>();
        rankedItems.forEach(entry => {
            if (Array.isArray(entry.item.relatedItemIds)) {
                (entry.item.relatedItemIds as string[]).forEach(id => relatedIds.add(id));
            }
        });

        // Remove already-fetched items from related set
        rankedItems.forEach(entry => relatedIds.delete(entry.item.id));

        let allItems = rankedItems.map(e => ({
            id: e.item.id,
            name: e.item.name,
            content: e.item.content,
            category: e.item.category,
            meta: e.item.meta as Record<string, unknown> | null,
            similarity: e.hybridScore,
            sourceId: e.item.sourceId,
        }));

        if (relatedIds.size > 0) {
            const relatedItems = await db.select().from(items)
                .where(and(
                    eq(items.workspaceId, workspaceId),
                    inArray(items.id, Array.from(relatedIds)),
                ))
                .limit(5);

            relatedItems.forEach(ri => {
                allItems.push({
                    id: ri.id,
                    name: ri.name,
                    content: ri.content,
                    category: ri.category,
                    meta: ri.meta as Record<string, unknown> | null,
                    similarity: 0.3, // Lower score for related items
                    sourceId: ri.sourceId,
                });
            });
        }

        return allItems;

    } catch (err) {
        console.warn("[KnowledgeRetriever] Hybrid search failed:", err);
        return [];
    }
}

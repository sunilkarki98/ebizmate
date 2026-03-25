/**
 * Knowledge Retriever (RAG Pipeline)
 *
 * Extracted from the monolithic processInteraction().
 * Performs hybrid search (vector + keyword) with intent-aware boosting.
 * Returns ranked, deduplicated knowledge items with similarity scores.
 */

import { db } from "@ebizmate/db";
import { items, itemRelations } from "@ebizmate/db";
import { eq, or, and, desc, sql, gt, isNull, inArray } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm";
import type { RetrievedKnowledge, Intent, ConversationTurn } from "./types.js";
import { VECTOR_SIMILARITY_THRESHOLD, HYBRID_SCORE_THRESHOLD } from "./types.js";

interface AIService {
    embed(input: string, interactionId?: string): Promise<{ embedding: number[] }>;
}

const STOP_WORDS = new Set(["the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "to", "in", "on", "at", "for", "with", "about", "of", "this", "that", "it", "they", "we", "you", "i", "how", "what", "where", "when", "why", "who", "does", "do", "did", "can", "could", "would", "should", "will", "much", "many", "some", "any"]);

// ─── Hybrid Scoring ─────────────────────────────────────────────────────────

function computeHybridScore(
    vectorRank: number,
    keywordRank: number,
    recencyBoost: number,
    intentBoost: number = 0,
): number {
    const k = 60;
    const rrfVector = vectorRank > 0 ? 1 / (k + vectorRank) : 0;
    const rrfKeyword = keywordRank > 0 ? 1 / (k + keywordRank) : 0;

    // Normalize RRF to roughly 0-1 scale so existing HYBRID_SCORE_THRESHOLD works.
    // Max RRF base score is ~0.98.
    const baseScore = (rrfVector + rrfKeyword) * 30;

    return baseScore + 0.1 * recencyBoost + 0.15 * intentBoost;
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
    precomputedEmbedding?: number[],
): Promise<RetrievedKnowledge[]> {
    // ── 1. Stop-word Filtering for Keywords ──
    const keywords = customerMessage
        .toLowerCase()
        // Preserve word characters, spaces, hyphens, and underscores for exact ID/SKU matching
        .replace(/[^\w\s\-_]/gi, '')
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
                // BUG 2 FIX: Use pre-computed embedding if available to avoid duplicate ai.embed() call
                const embedding = precomputedEmbedding ?? (await ai.embed(searchContext, interactionId)).embedding;
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
                const keywordString = keywords.join(" ");

                // Use pg_trgm similarity for True Full-Text Search
                const similarityScore = sql<number>`greatest(
                    similarity(${items.name}, ${keywordString}),
                    similarity(${items.content}, ${keywordString})
                )`;

                return db.select({
                    item: items,
                    score: similarityScore
                }).from(items)
                    .where(and(
                        eq(items.workspaceId, workspaceId),
                        gt(similarityScore, 0.1),
                        or(isNull(items.expiresAt), gt(items.expiresAt, new Date())),
                    ))
                    .orderBy(desc(similarityScore))
                    .limit(maxResults);
            })(),
        ]);

        // ── Hybrid Scoring & Re-ranking (RRF) ──
        const itemsMap = new Map<string, {
            item: typeof items.$inferSelect;
            vectorRank: number;
            keywordRank: number;
        }>();

        vectorResults.forEach((r, index) => {
            const rank = index + 1;
            itemsMap.set(r.item.id, { item: r.item, vectorRank: rank, keywordRank: 0 });
        });

        keywordResults.forEach((r, index) => {
            const rank = index + 1;
            const entry = itemsMap.get(r.item.id);
            if (entry) {
                entry.keywordRank = rank;
            } else {
                itemsMap.set(r.item.id, { item: r.item, vectorRank: 0, keywordRank: rank });
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
                    entry.vectorRank,
                    entry.keywordRank,
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
        const rankedItemIds = rankedItems.map(e => e.item.id);

        if (rankedItemIds.length > 0) {
            // FIX 5: Query both forward AND reverse relations (relations are uni-directional)
            const [forwardRelations, reverseRelations] = await Promise.all([
                db.select({ relatedItemId: itemRelations.relatedItemId })
                    .from(itemRelations)
                    .where(inArray(itemRelations.itemId, rankedItemIds)),
                db.select({ relatedItemId: itemRelations.itemId })
                    .from(itemRelations)
                    .where(inArray(itemRelations.relatedItemId, rankedItemIds)),
            ]);

            forwardRelations.forEach(r => relatedIds.add(r.relatedItemId));
            reverseRelations.forEach(r => relatedIds.add(r.relatedItemId));
        }

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

/**
 * Semantic Cache — AI Response Deduplication Layer
 *
 * Uses Dragonfly (Redis) to cache AI responses keyed by a composite hash
 * of (workspaceId + intent + truncated embedding).
 *
 * If a new inbound query semantically matches a cached query (same workspace,
 * same intent, very similar vector embedding), we return the cached response
 * instantly — cost drops to $0, latency drops from ~2s to ~5ms.
 *
 * Cache entries expire after 2 hours to prevent stale answers if the
 * seller updates their knowledge base.
 *
 * PRINCIPAL AUDIT FIX: Eliminates redundant LLM inference for repeated FAQs.
 */

import { dragonfly, isDragonflyAvailable } from "@ebizmate/shared";
import type { OrchestratorResult } from "./types.js";

const CACHE_TTL_SECONDS = 7200; // 2 hours
const CACHE_KEY_PREFIX = "sem_cache";

/**
 * Generate a deterministic cache key from workspace + intent + embedding.
 *
 * We quantize the embedding vector to 4 significant digits and take the
 * first 32 dimensions. This gives us a "fuzzy fingerprint" —
 * semantically identical queries will produce the same key even if
 * the exact floating point values differ slightly across calls.
 */
function buildCacheKey(
    workspaceId: string,
    intent: string,
    embedding: number[],
): string {
    // Quantize first 32 dims to 4 decimal places for stable hashing
    const quantized = embedding
        .slice(0, 32)
        .map(v => Math.round(v * 10000))
        .join(",");

    return `${CACHE_KEY_PREFIX}:${workspaceId}:${intent}:${quantized}`;
}

/**
 * Try to retrieve a cached orchestrator result.
 * Returns null if no cache hit or Dragonfly is unavailable.
 */
export async function getSemanticCache(
    workspaceId: string,
    intent: string,
    embedding: number[],
): Promise<OrchestratorResult | null> {
    try {
        if (!isDragonflyAvailable()) return null;

        const key = buildCacheKey(workspaceId, intent, embedding);
        const cached = await dragonfly!.get(key);

        if (!cached) return null;

        const parsed = JSON.parse(cached) as OrchestratorResult;
        console.log(`[SemanticCache] HIT for ${workspaceId} intent=${intent}`);
        return parsed;
    } catch {
        // Non-critical — cache miss is fine, orchestrator will run normally
        return null;
    }
}

/**
 * Store an orchestrator result in the semantic cache.
 * Only caches high-confidence, non-escalated responses.
 */
export async function setSemanticCache(
    workspaceId: string,
    intent: string,
    embedding: number[],
    result: OrchestratorResult,
): Promise<void> {
    try {
        if (!isDragonflyAvailable()) return;

        // Don't cache low-confidence, escalated, or clarification responses
        if (result.shouldEscalate) return;
        if (result.needsClarification) return;
        if (result.confidence < 0.8) return;

        const key = buildCacheKey(workspaceId, intent, embedding);
        await dragonfly!.setex(key, CACHE_TTL_SECONDS, JSON.stringify(result));
    } catch {
        // Non-critical — failing to cache doesn't affect correctness
    }
}

/**
 * Invalidate all semantic cache entries for a workspace.
 * Call this when the seller updates their knowledge base.
 */
export async function invalidateWorkspaceCache(workspaceId: string): Promise<void> {
    try {
        if (!isDragonflyAvailable()) return;

        // Use SCAN to find and delete matching keys (safe for production, non-blocking)
        let cursor = "0";
        const pattern = `${CACHE_KEY_PREFIX}:${workspaceId}:*`;

        do {
            const [newCursor, keys] = await dragonfly!.scan(
                parseInt(cursor),
                "MATCH",
                pattern,
                "COUNT",
                100,
            );
            cursor = newCursor;

            if (keys.length > 0) {
                await dragonfly!.del(...keys);
            }
        } while (cursor !== "0");

        console.log(`[SemanticCache] Invalidated cache for workspace ${workspaceId}`);
    } catch (err) {
        console.warn("[SemanticCache] Cache invalidation failed:", err);
    }
}

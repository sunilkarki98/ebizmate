"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkAndVerifyKB = linkAndVerifyKB;
exports.ingestPost = ingestPost;
const db_1 = require("@ebizmate/db");
const db_2 = require("@ebizmate/db");
const drizzle_orm_1 = require("drizzle-orm");
const factory_1 = require("./factory");
/**
 * CoachHelper V4 - Enhanced KB Verification & Linking
 *
 * Features:
 * 1. Marks unverified items as verified
 * 2. Links related items using AI + semantic similarity
 * 3. Computes vector embeddings for better matching
 * 4. Handles batch processing with concurrency
 * 5. Logs progress & errors robustly
 */
async function linkAndVerifyKB(workspaceId, batchSize = 10) {
    console.log(`[Coach] Starting KB verification for workspace ${workspaceId}`);
    // 1️⃣ Fetch all unverified items
    const unverifiedItems = await db_1.db.query.items.findMany({
        where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.items.workspaceId, workspaceId), (0, drizzle_orm_1.eq)(db_2.items.isVerified, false)),
    });
    if (!unverifiedItems.length) {
        console.log(`[Coach] No unverified items found.`);
        return;
    }
    // 2️⃣ Get AI service
    let ai;
    try {
        ai = await (0, factory_1.getAIService)(workspaceId, "coach");
    }
    catch (err) {
        console.error(`[Coach] Failed to get AI service:`, err);
        return;
    }
    // 3️⃣ Process items in batches (to prevent rate limit / large prompts)
    for (let i = 0; i < unverifiedItems.length; i += batchSize) {
        const batch = unverifiedItems.slice(i, i + batchSize);
        await Promise.all(batch.map(async (item) => {
            try {
                // 3a️⃣ Fetch candidate items (excluding current item)
                const candidateItems = await db_1.db.query.items.findMany({
                    where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.items.workspaceId, workspaceId), (0, drizzle_orm_1.ne)(db_2.items.id, item.id)),
                });
                // 3b️⃣ Compute embeddings for semantic similarity
                let embedding = null;
                try {
                    const embedRes = await ai.embed(`${item.name}: ${item.content}`, item.id);
                    embedding = embedRes.embedding;
                }
                catch (embedErr) {
                    console.warn(`[Coach] Embedding generation failed for "${item.name}":`, embedErr);
                }
                // 3c️⃣ Compute similarity scores
                let scoredCandidates = [];
                if (embedding) {
                    scoredCandidates = candidateItems.map(ci => ({
                        id: ci.id,
                        score: 1 - (ci.embedding ? (0, drizzle_orm_1.sql) `(${(0, drizzle_orm_1.cosineDistance)(ci.embedding, `[${embedding.join(",")}]`)})` : 0)
                    }));
                    scoredCandidates = scoredCandidates
                        .filter(c => c.score > 0.7) // threshold for semantic similarity
                        .sort((a, b) => b.score - a.score);
                }
                // 3d️⃣ AI-driven related items identification
                const prompt = `
You are a Knowledge Graph Assistant.
Identify which of the following KB items are related to this item:

Current item:
Name: "${item.name}"
Category: "${item.category}"
Content: "${item.content}"

Candidate items:
${candidateItems.map(ci => `- ${ci.name} (${ci.category}): ${ci.content}`).join("\n")}

Output: JSON array of candidate IDs that are related.
`;
                let aiRelatedIds = [];
                try {
                    const result = await ai.chat({
                        systemPrompt: "Output valid JSON only (array of IDs).",
                        userMessage: prompt,
                        temperature: 0.2,
                    });
                    const rawJson = result.content.replace(/```json|```/g, "").trim();
                    const parsed = JSON.parse(rawJson);
                    if (Array.isArray(parsed))
                        aiRelatedIds = parsed;
                }
                catch (e) {
                    console.warn(`[Coach V4] AI parsing failed for "${item.name}":`, e);
                }
                // 3e️⃣ Merge AI + semantic links, deduplicate
                const mergedRelatedIds = Array.from(new Set([
                    ...aiRelatedIds,
                    ...scoredCandidates.map(c => c.id)
                ]));
                // 4️⃣ Update DB item
                await db_1.db.update(db_2.items)
                    .set({ relatedItemIds: mergedRelatedIds, isVerified: true, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(db_2.items.id, item.id));
                console.log(`[Coach] Linked "${item.name}" → ${mergedRelatedIds.length} related items`);
            }
            catch (err) {
                console.error(`[Coach] Failed to process "${item.name}":`, err);
            }
        }));
    }
    console.log(`[Coach] KB verification and linking completed for workspace ${workspaceId}`);
}
async function ingestPost(postId) {
    console.log(`[Ingest] Ingesting post ${postId}`);
}
//# sourceMappingURL=ingestion.js.map
import { db } from "@ebizmate/db";
import { items, posts, workspaces, itemRelations } from "@ebizmate/db";
import { cosineDistance, and, eq, ne, sql, not, inArray, gt, desc } from "drizzle-orm";
import { getAIService } from "./factory.js";
import { PlatformFactory, decrypt } from "@ebizmate/shared";
import { invalidateWorkspaceCache } from "../orchestrator/semantic-cache.js";
import type { Queue } from "bullmq";

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

export async function linkAndVerifyKB(workspaceId: string, maxItems = 10) {
    console.log(`[Coach] Starting KB verification for workspace ${workspaceId} (maxItems=${maxItems})`);

    // COST 3 FIX: Limit total items fetched, not just batch concurrency.
    // Previously batchSize only controlled parallelism but still processed ALL items.
    const unverifiedItems = await db.query.items.findMany({
        where: and(eq(items.workspaceId, workspaceId), eq(items.isVerified, false)),
        limit: maxItems,
        orderBy: desc(items.createdAt), // Process newest first
    });

    if (!unverifiedItems.length) {
        console.log(`[Coach] No unverified items found.`);
        return;
    }

    // 2️⃣ Get AI service
    let ai;
    try {
        ai = await getAIService(workspaceId, "coach");
    } catch (err) {
        console.error(`[Coach] Failed to get AI service:`, err);
        return;
    }

    // 3️⃣ Process items in batches (to prevent rate limit / large prompts)
    const BATCH_CONCURRENCY = 5;
    for (let i = 0; i < unverifiedItems.length; i += BATCH_CONCURRENCY) {
        const batch = unverifiedItems.slice(i, i + BATCH_CONCURRENCY);

        // Fetch candidate items for the entire batch (excluding the batch itself)
        const batchIds = batch.map(b => b.id);
        const candidateItems = await db.query.items.findMany({
            where: and(
                eq(items.workspaceId, workspaceId),
                not(inArray(items.id, batchIds))
            ),
        });

        await Promise.all(batch.map(async item => {
            try {

                // 3b️⃣ Compute embeddings for semantic similarity
                let embedding: number[] | null = null;
                try {
                    const embedRes = await ai.embed(`${item.name}: ${item.content}`, item.id);
                    embedding = embedRes.embedding;
                } catch (embedErr) {
                    console.warn(`[Coach] Embedding generation failed for "${item.name}":`, embedErr);
                }

                // 3c️⃣ Find semantically similar items via SQL (proper vector search)
                let scoredCandidates: { id: string; score: number }[] = [];
                if (embedding) {
                    const similarityExpr = sql<number>`1 - (${cosineDistance(items.embedding, embedding)})`;
                    const similarItems = await db.select({
                        id: items.id,
                        similarity: similarityExpr,
                    }).from(items)
                        .where(and(
                            eq(items.workspaceId, workspaceId),
                            not(inArray(items.id, batchIds)),
                            gt(similarityExpr, 0.7)
                        ))
                        .orderBy(desc(similarityExpr))
                        .limit(10);

                    scoredCandidates = similarItems.map(si => ({
                        id: si.id,
                        score: si.similarity,
                    }));
                }

                // 3d️⃣ AI-driven related items identification
                // M-5 FIX: Cap candidates to 20 and truncate content to prevent unbounded prompt size
                const topCandidates = candidateItems.slice(0, 20);
                const prompt = `
You are a Knowledge Graph Assistant.
Identify which of the following KB items are related to this item:

Current item:
Name: "${item.name}"
Category: "${item.category}"
Content: "${(item.content || '').substring(0, 200)}"

Candidate items:
${topCandidates.map(ci => `- ${ci.name} (${ci.category}): ${(ci.content || '').substring(0, 100)}`).join("\n")}

Output: JSON array of candidate IDs that are related.
`;

                let aiRelatedIds: string[] = [];
                try {
                    const result = await ai.chat({
                        systemPrompt: "Output valid JSON only (array of IDs).",
                        userMessage: prompt,
                        temperature: 0.2,
                    });

                    const rawJson = result.content.replace(/```json|```/g, "").trim();
                    const parsed = JSON.parse(rawJson);
                    if (Array.isArray(parsed)) aiRelatedIds = parsed;
                } catch (e) {
                    console.warn(`[Coach V4] AI parsing failed for "${item.name}":`, e);
                }

                // 3e️⃣ Merge AI + semantic links, deduplicate
                const mergedRelatedIds = Array.from(new Set([
                    ...aiRelatedIds,
                    ...scoredCandidates.map(c => c.id)
                ]));

                // 4️⃣ Update DB item
                await db.update(items)
                    .set({ isVerified: true, updatedAt: new Date() })
                    .where(eq(items.id, item.id));

                // 5️⃣ Insert into junction table
                if (mergedRelatedIds.length > 0) {
                    await db.insert(itemRelations)
                        .values(mergedRelatedIds.map(rId => ({ itemId: item.id, relatedItemId: rId })))
                        .onConflictDoNothing();
                }

                console.log(`[Coach] Linked "${item.name}" → ${mergedRelatedIds.length} related items`);

            } catch (err) {
                console.error(`[Coach] Failed to process "${item.name}":`, err);
            }
        }));
    }

    // PRINCIPAL AUDIT FIX: Invalidate semantic cache when KB is updated
    await invalidateWorkspaceCache(workspaceId);

    console.log(`[Coach] KB verification and linking completed for workspace ${workspaceId}`);
}

export async function syncHistoricalPosts(workspaceId: string, aiQueue: Queue) {
    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId)
    });

    if (!workspace || !workspace.platform) return;

    let accessToken: string | undefined;
    if (workspace.accessToken) {
        try { accessToken = decrypt(workspace.accessToken); }
        catch { /* ignore */ }
    }

    const client = PlatformFactory.getClient(workspace.platform, { accessToken });
    if (!client.fetchRecentPosts) return;

    const recentPosts = await client.fetchRecentPosts();
    for (const p of recentPosts) {
        // Save post
        const [savedPost] = await db.insert(posts).values({
            workspaceId,
            platformId: p.id,
            content: p.caption,
            meta: { mediaUrl: p.mediaUrl, createdAt: p.createdAt }
        }).onConflictDoUpdate({
            target: posts.platformId,
            set: { content: p.caption, updatedAt: new Date() }
        }).returning({ id: posts.id });

        if (savedPost) {
            // enqueue ingest
            await aiQueue.add('ingest', { postId: savedPost.id }, {
                jobId: `ingest_${savedPost.id}`,
                removeOnComplete: true,
                attempts: 3
            });
        }
    }
}

export async function ingestPost(postId: string) {
    console.log(`[Ingest] Ingesting post ${postId}`);
    const post = await db.query.posts.findFirst({
        where: eq(posts.id, postId)
    });
    if (!post || !post.content) return;

    let ai;
    try {
        ai = await getAIService(post.workspaceId, "coach");
    } catch (err) {
        console.warn(`[Ingest] Could not initialize AI for ingestion:`, err);
        return;
    }

    const prompt = `
You are a product extractor.
Extract product details from the following post caption:
"${post.content}"
Output a JSON array of objects, each with:
- 'name' (string)
- 'category' (string: 'product', 'service', or 'general')
- 'content' (string: short description including details and price)
If no products or useful information are found, output an empty array [].
`;

    let extracted: any[] = [];
    try {
        const result = await ai.chat({
            systemPrompt: "Output valid JSON array only.",
            userMessage: prompt,
            temperature: 0.1,
        });

        const rawJson = result.content.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed)) extracted = parsed;
    } catch (e) {
        console.warn(`[Ingest] AI extraction failed for post ${postId}:`, e);
        return;
    }

    // Save extracted knowledge 
    for (const item of extracted) {
        if (!item.name || !item.content) continue;

        let embedding: number[] | null = null;
        try {
            const embedRes = await ai.embed(`${item.name}: ${item.content}`, "item_extraction");
            embedding = embedRes.embedding;
        } catch (embedErr) {
            console.warn(`[Ingest] Embedding generation failed for "${item.name}":`, embedErr);
        }

        // FIX 4: Dedup check — skip if a semantically near-identical item already exists
        if (embedding) {
            try {
                const similarityExpr = sql<number>`1 - (${cosineDistance(items.embedding, embedding)})`;
                const duplicates = await db.select({ id: items.id, similarity: similarityExpr })
                    .from(items)
                    .where(and(
                        eq(items.workspaceId, post.workspaceId),
                        gt(similarityExpr, 0.92),
                    ))
                    .limit(1);

                if (duplicates.length > 0) {
                    console.log(`[Ingest] Skipping duplicate "${item.name}" (similarity: ${duplicates[0].similarity.toFixed(3)})`);
                    continue;
                }
            } catch (dedupErr) {
                // Non-critical — insert anyway if dedup check fails
                console.warn(`[Ingest] Dedup check failed for "${item.name}":`, dedupErr);
            }
        }

        const insertData: any = {
            workspaceId: post.workspaceId,
            sourceId: post.platformId,
            name: item.name.substring(0, 100),
            content: item.content,
            category: item.category || "product",
            isVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        if (embedding) {
            insertData.embedding = embedding;
        }

        await db.insert(items).values(insertData);
    }
    // PRINCIPAL AUDIT FIX: Invalidate semantic cache when new items are ingested
    if (extracted.length > 0) {
        await invalidateWorkspaceCache(post.workspaceId);
    }

    console.log(`[Ingest] Finished extracting ${extracted.length} items from post ${postId}`);
}
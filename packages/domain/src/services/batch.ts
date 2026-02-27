import { db, items } from "@ebizmate/db";
import type { Queue } from 'bullmq';

export async function processBatchIngestion(
    workspaceId: string,
    sourceId: string,
    itemsList: unknown[],
    aiQueue: Queue,
) {
    if (!itemsList || itemsList.length === 0) return;

    console.log(`[Queue] Inserting ${itemsList.length} items to DB...`);

    // 1. Bulk Insert WITHOUT Embeddings (Fast) - Chunked to prevent Postgres bind parameter limits
    const CHUNK_SIZE = 500;
    const itemsToInsert = itemsList.map(item => {
        const entry = item as Record<string, unknown>;
        return {
            workspaceId,
            sourceId,
            name: entry.name as string,
            content: entry.content as string,
            category: (entry.category as string) || "general",
            meta: (entry.meta as Record<string, unknown>) || {},
            embedding: null as unknown as number[], // Defer embedding generation
        };
    });

    const insertedItems: { id: string }[] = [];
    for (let i = 0; i < itemsToInsert.length; i += CHUNK_SIZE) {
        const chunk = itemsToInsert.slice(i, i + CHUNK_SIZE);
        const result = await db.insert(items).values(chunk).returning({ id: items.id });
        insertedItems.push(...result);
    }

    console.log(`[Queue] Inserted ${insertedItems.length} items. Enqueuing embedding jobs...`);

    // 2. Fan-out to BullMQ (Async processing)
    const jobs = insertedItems.map(item => ({
        name: 'refresh_item_embedding',
        data: { itemId: item.id },
        opts: {
            jobId: `refresh-embedding-${item.id}`,
            removeOnComplete: true,
            attempts: 3,
            backoff: { type: 'exponential' as const, delay: 5000 }
        }
    }));

    await aiQueue.addBulk(jobs);
    console.log(`[Queue] Enqueued ${jobs.length} embedding jobs.`);
}


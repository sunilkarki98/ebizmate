import { db } from '@ebizmate/db';
import { items, workspaces, posts, users } from '@ebizmate/db';
import { eq, and, desc } from 'drizzle-orm';
import { getAIService } from '../services/factory.js';
import { CreateItemDto, UpdateItemDto, createItemSchema, updateItemSchema } from '@ebizmate/contracts';
import { Queue } from 'bullmq';
import { getDragonflyConfig } from '@ebizmate/shared';

// FIX #3: Lazy singleton Redis connection for enqueuing jobs
let _aiQueue: Queue | null = null;
function getAIQueue(): Queue {
    if (!_aiQueue) {
        _aiQueue = new Queue('ai', { connection: getDragonflyConfig() });
    }
    return _aiQueue;
}



export async function getRecentPosts(workspaceId: string, limit = 12) {
    return await db
        .select()
        .from(posts)
        .where(eq(posts.workspaceId, workspaceId))
        .orderBy(desc(posts.createdAt))
        .limit(limit);
}

export async function getWorkspaceItems(workspaceId: string) {
    return await db
        .select({
            id: items.id,
            name: items.name,
            content: items.content,
            category: items.category,
            sourceId: items.sourceId,
            meta: items.meta,
            createdAt: items.createdAt,
            updatedAt: items.updatedAt,
        })
        .from(items)
        .where(eq(items.workspaceId, workspaceId))
        .orderBy(desc(items.createdAt));
}

export async function createItem(workspaceId: string, inputDto: CreateItemDto) {
    const dto = createItemSchema.parse(inputDto);
    const [newItem] = await db.insert(items).values({
        workspaceId,
        name: dto.name,
        content: dto.content,
        sourceId: dto.sourceId ?? null,
        category: dto.category,
        meta: dto.meta || null,
        embedding: null, // Generated asynchronously
    }).returning();

    // FIX #3: Use lazy singleton Queue to prevent Redis connection leak per call
    try {
        const queue = getAIQueue();
        await queue.add('smart_notification', {
            workspaceId,
            itemId: newItem.id
        }, {
            removeOnComplete: true,
            removeOnFail: 100
        });
    } catch (err) {
        // Don't fail item creation if notification enqueue fails
        console.error('[createItem] Failed to enqueue smart notification:', err);
    }

    return newItem;
}

export async function updateItem(workspaceId: string, id: string, inputDto: UpdateItemDto) {
    const dto = updateItemSchema.parse(inputDto);
    const [existingItem] = await db.select().from(items).where(and(eq(items.id, id), eq(items.workspaceId, workspaceId)));
    if (!existingItem) throw new Error('Item not found');

    const [updated] = await db.update(items)
        .set({
            name: dto.name,
            content: dto.content,
            category: dto.category,
            sourceId: dto.sourceId,
            meta: dto.meta !== undefined ? dto.meta : undefined,
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(items.id, id),
                eq(items.workspaceId, workspaceId)
            )
        )
        .returning();

    return updated;
}

/**
 * Generates and saves embedding for an existing item.
 * Designed to be called from a background worker.
 */
export async function refreshItemEmbedding(itemId: string) {
    const [item] = await db.select().from(items).where(eq(items.id, itemId));
    if (!item) return;

    try {
        const ai = await getAIService(item.workspaceId, 'coach');
        const textToEmbed = `${item.name}: ${item.content}`;
        const result = await ai.embed(textToEmbed);

        await db.update(items)
            .set({
                embedding: result.embedding,
                updatedAt: new Date()
            })
            .where(eq(items.id, itemId));
    } catch (error) {
        console.error(`Failed to refresh embedding for item ${itemId}:`, error);
        throw error; // Let BullMQ retry
    }
}

export async function deleteItem(workspaceId: string, id: string) {
    const [deleted] = await db.delete(items)
        .where(
            and(
                eq(items.id, id),
                eq(items.workspaceId, workspaceId)
            )
        )
        .returning();

    if (!deleted) throw new Error('Item not found');
    return { success: true };
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db } from '@ebizmate/db';
import { items, workspaces, posts, users } from '@ebizmate/db';
import { eq, and, desc } from 'drizzle-orm';
import { AiService } from '../ai/ai.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
    private readonly logger = new Logger(ItemsService.name);

    constructor(private readonly aiService: AiService) { }

    // Ensure workspace exists (Lazy Sync handling)
    async getWorkspace(userId: string, userEmail?: string, userName?: string) {
        const userWorkspaces = await db
            .select()
            .from(workspaces)
            .where(eq(workspaces.userId, userId))
            .limit(1);

        if (userWorkspaces.length > 0) {
            return userWorkspaces[0];
        }

        const [newWorkspace] = await db.transaction(async (tx) => {
            const [userExists] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
            if (!userExists && userEmail) {
                await tx.insert(users).values({
                    id: userId,
                    name: userName || 'User',
                    email: userEmail,
                    role: 'user',
                });
            }

            return await tx.insert(workspaces)
                .values({
                    userId: userId,
                    name: "My Workspace",
                    platform: "generic",
                })
                .returning();
        });

        return newWorkspace;
    }

    async getRecentPosts(workspaceId: string, limit = 12) {
        return await db
            .select()
            .from(posts)
            .where(eq(posts.workspaceId, workspaceId))
            .orderBy(desc(posts.createdAt))
            .limit(limit);
    }

    async getWorkspaceItems(workspaceId: string) {
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

    async createItem(workspaceId: string, dto: CreateItemDto) {
        let embedding: number[] | null = null;
        try {
            // Internally call AiService to generate embedding
            const result = await this.aiService.generateEmbedding(workspaceId, { input: `${dto.name}: ${dto.content}`, botType: 'coach' });
            embedding = result.embedding;
        } catch (error) {
            this.logger.error("Failed to generate embedding for new item:", error);
        }

        const [newItem] = await db.insert(items).values({
            workspaceId,
            name: dto.name,
            content: dto.content,
            sourceId: dto.sourceId ?? null,
            category: dto.category,
            meta: dto.meta || null,
            embedding,
        }).returning();

        return newItem;
    }

    async updateItem(workspaceId: string, id: string, dto: UpdateItemDto) {
        // Check if item exists
        const [existingItem] = await db.select().from(items).where(and(eq(items.id, id), eq(items.workspaceId, workspaceId)));
        if (!existingItem) throw new NotFoundException('Item not found');

        let embedding: number[] | null = existingItem.embedding;

        // If content or name changed, re-generate embedding
        if (dto.name || dto.content) {
            const textToEmbed = `${dto.name || existingItem.name}: ${dto.content || existingItem.content}`;
            try {
                const result = await this.aiService.generateEmbedding(workspaceId, { input: textToEmbed, botType: 'coach' });
                embedding = result.embedding;
            } catch (error) {
                this.logger.error("Failed to re-generate embedding for updated item:", error);
            }
        }

        const [updated] = await db.update(items)
            .set({
                name: dto.name,
                content: dto.content,
                category: dto.category,
                sourceId: dto.sourceId,
                meta: dto.meta !== undefined ? dto.meta : undefined,
                embedding,
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

    async deleteItem(workspaceId: string, id: string) {
        const [deleted] = await db.delete(items)
            .where(
                and(
                    eq(items.id, id),
                    eq(items.workspaceId, workspaceId)
                )
            )
            .returning();

        if (!deleted) throw new NotFoundException('Item not found');
        return { success: true };
    }
}

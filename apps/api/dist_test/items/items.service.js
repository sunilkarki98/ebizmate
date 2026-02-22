"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ItemsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemsService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@ebizmate/db");
const db_2 = require("@ebizmate/db");
const drizzle_orm_1 = require("drizzle-orm");
const ai_service_1 = require("../ai/ai.service");
let ItemsService = ItemsService_1 = class ItemsService {
    aiService;
    logger = new common_1.Logger(ItemsService_1.name);
    constructor(aiService) {
        this.aiService = aiService;
    }
    // Ensure workspace exists (Lazy Sync handling)
    async getWorkspace(userId, userEmail, userName) {
        const userWorkspaces = await db_1.db
            .select()
            .from(db_2.workspaces)
            .where((0, drizzle_orm_1.eq)(db_2.workspaces.userId, userId))
            .limit(1);
        if (userWorkspaces.length > 0) {
            return userWorkspaces[0];
        }
        const [newWorkspace] = await db_1.db.transaction(async (tx) => {
            const [userExists] = await tx.select().from(db_2.users).where((0, drizzle_orm_1.eq)(db_2.users.id, userId)).limit(1);
            if (!userExists && userEmail) {
                await tx.insert(db_2.users).values({
                    id: userId,
                    name: userName || 'User',
                    email: userEmail,
                    role: 'user',
                });
            }
            return await tx.insert(db_2.workspaces)
                .values({
                userId: userId,
                name: "My Workspace",
                platform: "generic",
            })
                .returning();
        });
        return newWorkspace;
    }
    async getRecentPosts(workspaceId, limit = 12) {
        return await db_1.db
            .select()
            .from(db_2.posts)
            .where((0, drizzle_orm_1.eq)(db_2.posts.workspaceId, workspaceId))
            .orderBy((0, drizzle_orm_1.desc)(db_2.posts.createdAt))
            .limit(limit);
    }
    async getWorkspaceItems(workspaceId) {
        return await db_1.db
            .select({
            id: db_2.items.id,
            name: db_2.items.name,
            content: db_2.items.content,
            category: db_2.items.category,
            sourceId: db_2.items.sourceId,
            meta: db_2.items.meta,
            createdAt: db_2.items.createdAt,
            updatedAt: db_2.items.updatedAt,
        })
            .from(db_2.items)
            .where((0, drizzle_orm_1.eq)(db_2.items.workspaceId, workspaceId))
            .orderBy((0, drizzle_orm_1.desc)(db_2.items.createdAt));
    }
    async createItem(workspaceId, dto) {
        let embedding = null;
        try {
            // Internally call AiService to generate embedding
            const result = await this.aiService.generateEmbedding(workspaceId, { input: `${dto.name}: ${dto.content}`, botType: 'coach' });
            embedding = result.embedding;
        }
        catch (error) {
            this.logger.error("Failed to generate embedding for new item:", error);
        }
        const [newItem] = await db_1.db.insert(db_2.items).values({
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
    async updateItem(workspaceId, id, dto) {
        // Check if item exists
        const [existingItem] = await db_1.db.select().from(db_2.items).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.items.id, id), (0, drizzle_orm_1.eq)(db_2.items.workspaceId, workspaceId)));
        if (!existingItem)
            throw new common_1.NotFoundException('Item not found');
        let embedding = existingItem.embedding;
        // If content or name changed, re-generate embedding
        if (dto.name || dto.content) {
            const textToEmbed = `${dto.name || existingItem.name}: ${dto.content || existingItem.content}`;
            try {
                const result = await this.aiService.generateEmbedding(workspaceId, { input: textToEmbed, botType: 'coach' });
                embedding = result.embedding;
            }
            catch (error) {
                this.logger.error("Failed to re-generate embedding for updated item:", error);
            }
        }
        const [updated] = await db_1.db.update(db_2.items)
            .set({
            name: dto.name,
            content: dto.content,
            category: dto.category,
            sourceId: dto.sourceId,
            meta: dto.meta !== undefined ? dto.meta : undefined,
            embedding,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.items.id, id), (0, drizzle_orm_1.eq)(db_2.items.workspaceId, workspaceId)))
            .returning();
        return updated;
    }
    async deleteItem(workspaceId, id) {
        const [deleted] = await db_1.db.delete(db_2.items)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_2.items.id, id), (0, drizzle_orm_1.eq)(db_2.items.workspaceId, workspaceId)))
            .returning();
        if (!deleted)
            throw new common_1.NotFoundException('Item not found');
        return { success: true };
    }
};
exports.ItemsService = ItemsService;
exports.ItemsService = ItemsService = ItemsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], ItemsService);
//# sourceMappingURL=items.service.js.map
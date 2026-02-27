import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as DomainItemsService from '@ebizmate/domain';
import { CreateItemDto, UpdateItemDto } from '@ebizmate/contracts';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ItemsService {
    private readonly logger = new Logger(ItemsService.name);

    constructor(@InjectQueue('ai') private readonly aiQueue: Queue) { }

    async getWorkspace(userId: string, userEmail?: string, userName?: string) {
        return DomainItemsService.getWorkspace(userId, userEmail, userName);
    }

    async getRecentPosts(workspaceId: string, limit = 12) {
        return DomainItemsService.getRecentPosts(workspaceId, limit);
    }

    async getWorkspaceItems(workspaceId: string) {
        return DomainItemsService.getWorkspaceItems(workspaceId);
    }

    async createItem(workspaceId: string, dto: CreateItemDto) {
        const item = await DomainItemsService.createItem(workspaceId, dto);
        await this.aiQueue.add('refresh_item_embedding', { itemId: item.id });
        return item;
    }

    async updateItem(workspaceId: string, id: string, dto: UpdateItemDto) {
        try {
            const item = await DomainItemsService.updateItem(workspaceId, id, dto);
            if (dto.name || dto.content) {
                await this.aiQueue.add('refresh_item_embedding', { itemId: item.id });
            }
            return item;
        } catch (error: any) {
            if (error.message === 'Item not found') throw new NotFoundException(error.message);
            throw error;
        }
    }

    async deleteItem(workspaceId: string, id: string) {
        try {
            return await DomainItemsService.deleteItem(workspaceId, id);
        } catch (error: any) {
            if (error.message === 'Item not found') throw new NotFoundException(error.message);
            throw error;
        }
    }
}

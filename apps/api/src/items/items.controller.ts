import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, UnauthorizedException, Query } from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto, UpdateItemDto } from '@ebizmate/contracts';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('items')
@UseGuards(JwtAuthGuard)
export class ItemsController {
    constructor(private readonly itemsService: ItemsService) { }

    // Utility: Ensure we get a workspace for the authenticated user
    private async resolveWorkspaceId(req: AuthenticatedRequest) {
        const userId = req.user.userId;
        const workspace = await this.itemsService.getWorkspace(userId, req.user.email ?? undefined, undefined);
        if (!workspace) throw new UnauthorizedException('No workspace found');
        return workspace.id;
    }

    @Get('workspace')
    async getWorkspaceInfo(@Req() req: AuthenticatedRequest) {
        const userId = req.user.userId;
        return this.itemsService.getWorkspace(userId, req.user.email ?? undefined, undefined);
    }

    @Get('all')
    async getAllItems(@Req() req: AuthenticatedRequest) {
        const workspaceId = await this.resolveWorkspaceId(req);
        return this.itemsService.getWorkspaceItems(workspaceId);
    }

    @Get('posts')
    async getRecentPosts(@Req() req: AuthenticatedRequest, @Query('limit') limit?: string) {
        const workspaceId = await this.resolveWorkspaceId(req);
        const parsed = limit ? parseInt(limit, 10) : 12;
        const bounded = isNaN(parsed) ? 12 : Math.min(Math.max(parsed, 1), 100);
        return this.itemsService.getRecentPosts(workspaceId, bounded);
    }

    @Post()
    async createItem(@Req() req: AuthenticatedRequest, @Body() dto: CreateItemDto) {
        const workspaceId = await this.resolveWorkspaceId(req);
        return this.itemsService.createItem(workspaceId, dto);
    }

    @Put(':id')
    async updateItem(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateItemDto) {
        const workspaceId = await this.resolveWorkspaceId(req);
        return this.itemsService.updateItem(workspaceId, id, dto);
    }

    @Delete(':id')
    async deleteItem(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
        const workspaceId = await this.resolveWorkspaceId(req);
        return this.itemsService.deleteItem(workspaceId, id);
    }
}


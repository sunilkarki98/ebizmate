import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards, UnauthorizedException, Query } from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('items')
@UseGuards(JwtAuthGuard)
export class ItemsController {
    constructor(private readonly itemsService: ItemsService) { }

    // Utility: Ensure we get a workspace for the authenticated user
    private async resolveWorkspaceId(req: any) {
        const userId = req.user.userId;
        const workspace = await this.itemsService.getWorkspace(userId, req.user.email, req.user.name);
        if (!workspace) throw new UnauthorizedException('No workspace found');
        return workspace.id;
    }

    @Get('workspace')
    async getWorkspaceInfo(@Req() req: any) {
        const userId = req.user.userId;
        return this.itemsService.getWorkspace(userId, req.user.email, req.user.name);
    }

    @Get('all')
    async getAllItems(@Req() req: any) {
        const workspaceId = await this.resolveWorkspaceId(req);
        return this.itemsService.getWorkspaceItems(workspaceId);
    }

    @Get('posts')
    async getRecentPosts(@Req() req: any, @Query('limit') limit?: string) {
        const workspaceId = await this.resolveWorkspaceId(req);
        return this.itemsService.getRecentPosts(workspaceId, limit ? parseInt(limit, 10) : 12);
    }

    @Post()
    async createItem(@Req() req: any, @Body() dto: CreateItemDto) {
        const workspaceId = await this.resolveWorkspaceId(req);
        return this.itemsService.createItem(workspaceId, dto);
    }

    @Put(':id')
    async updateItem(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateItemDto) {
        const workspaceId = await this.resolveWorkspaceId(req);
        return this.itemsService.updateItem(workspaceId, id, dto);
    }

    @Delete(':id')
    async deleteItem(@Req() req: any, @Param('id') id: string) {
        const workspaceId = await this.resolveWorkspaceId(req);
        return this.itemsService.deleteItem(workspaceId, id);
    }
}

import { Controller, Post, Get, Body, UseGuards, Req, Param, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspacePolicyGuard } from '../common/guards/workspace-policy.guard';
import { AdminGuard } from '../auth/admin.guard';
import { WorkspaceOwnershipGuard } from '../common/guards/workspace-ownership.guard';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import {
    ProcessInteractionDto,
    GenerateEmbeddingDto,
    ChatDto,
    CoachChatDto,
    IngestPostDto,
    BatchIngestDto,
    TeachReplyDto,
} from '@ebizmate/contracts';
import { db, interactions, posts } from '@ebizmate/db';
import { eq } from 'drizzle-orm';

@Controller('ai')
@UseGuards(JwtAuthGuard, WorkspacePolicyGuard, WorkspaceOwnershipGuard)
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('process')
    async processAiInteraction(
        @Req() req: AuthenticatedRequest,
        @Body() dto: ProcessInteractionDto,
    ) {
        // IDOR check for interaction in body
        const interaction = await db.query.interactions.findFirst({
            where: eq(interactions.id, dto.interactionId),
            columns: { workspaceId: true }
        });

        if (!interaction) throw new HttpException('Interaction not found', HttpStatus.NOT_FOUND);
        if (interaction.workspaceId !== req.workspacePolicy?.id) {
            throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        }

        return this.aiService.processInteraction(dto.interactionId);
    }

    @Post('embed')
    async generateEmbedding(
        @Req() req: AuthenticatedRequest,
        @Body() dto: GenerateEmbeddingDto,
    ) {
        return this.aiService.generateEmbedding(req.user.userId, dto);
    }

    @Post('chat')
    async performChat(
        @Req() req: AuthenticatedRequest,
        @Body() dto: ChatDto,
    ) {
        return this.aiService.chat(req.user.userId, dto);
    }

    @Post('coach/chat')
    async processCoachMessage(
        @Req() req: AuthenticatedRequest,
        @Body() dto: CoachChatDto,
    ) {
        try {
            return await this.aiService.coachChat(req.user.userId, dto);
        } catch (error: any) {
            const msg = error?.message || String(error);
            // Map domain-level AI errors to proper HTTP status codes
            if (msg.includes('AI_LIMIT_EXCEEDED') || msg.includes('AI_TRIAL_EXPIRED')) {
                throw new HttpException(msg, HttpStatus.FORBIDDEN);
            }
            if (msg.includes('AI_ACCESS_DENIED')) {
                throw new HttpException(msg, HttpStatus.FORBIDDEN);
            }
            console.error("[AiController] processCoachMessage Error:", error);
            throw error;
        }
    }

    @Get('coach/history')
    async getCoachHistory(@Req() req: AuthenticatedRequest) {
        return this.aiService.getCoachHistory(req.user.userId);
    }

    @Get('customer/interactions')
    async getCustomerInteractions(@Req() req: AuthenticatedRequest) {
        return this.aiService.getCustomerInteractions(req.user.userId);
    }

    @Get('customer/all')
    async getCustomers(@Req() req: AuthenticatedRequest) {
        return this.aiService.getCustomers(req.user.userId);
    }

    @Get('customer/:id')
    async getCustomer(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
        return this.aiService.getCustomer(req.user.userId, id);
    }

    @Post('customer/:id/pause')
    async pauseCustomerAi(
        @Req() req: AuthenticatedRequest,
        @Param('id') id: string
    ) {
        return this.aiService.setCustomerAiStatus(req.user.userId, id, true);
    }

    @Post('customer/:id/resume')
    async resumeCustomerAi(
        @Req() req: AuthenticatedRequest,
        @Param('id') id: string
    ) {
        return this.aiService.setCustomerAiStatus(req.user.userId, id, false);
    }

    @Post('ingest')
    async ingestPostData(
        @Req() req: AuthenticatedRequest,
        @Body() dto: IngestPostDto,
    ) {
        // IDOR check for post in body
        const post = await db.query.posts.findFirst({
            where: eq(posts.id, dto.postId),
            columns: { workspaceId: true }
        });

        if (!post) throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
        if (post.workspaceId !== req.workspacePolicy?.id) {
            throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        }

        return this.aiService.ingestPost(dto.postId);
    }

    @Post('upload-batch')
    async queueBatchIngest(
        @Req() req: AuthenticatedRequest,
        @Body() dto: BatchIngestDto,
    ) {
        return this.aiService.batchIngest(req.user.userId, dto);
    }

    @Post('test-connection')
    @UseGuards(AdminGuard)
    async testProviderConnection(@Req() req: AuthenticatedRequest) {
        return this.aiService.testConnection();
    }

    @Post('teach-reply')
    async teachAndReply(
        @Req() req: AuthenticatedRequest,
        @Body() dto: TeachReplyDto,
    ) {
        return this.aiService.teachAndReply(req.user.userId, dto);
    }
}


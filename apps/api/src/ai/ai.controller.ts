import { Controller, Post, Body, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import {
    ProcessInteractionDto,
    GenerateEmbeddingDto,
    ChatDto,
    CoachChatDto,
    IngestPostDto,
    BatchIngestDto,
} from './dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('process')
    async processAiInteraction(
        @Req() req: AuthenticatedRequest,
        @Body() dto: ProcessInteractionDto,
    ) {
        try {
            return await this.aiService.processInteraction(dto.interactionId);
        } catch (error) {
            throw new HttpException(
                error instanceof Error ? error.message : 'Internal Server Error',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post('embed')
    async generateEmbedding(
        @Req() req: AuthenticatedRequest,
        @Body() dto: GenerateEmbeddingDto,
    ) {
        try {
            return await this.aiService.generateEmbedding(req.user.userId, dto);
        } catch (error) {
            throw new HttpException(
                error instanceof Error ? error.message : 'Internal Server Error',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post('chat')
    async performChat(
        @Req() req: AuthenticatedRequest,
        @Body() dto: ChatDto,
    ) {
        try {
            return await this.aiService.chat(req.user.userId, dto);
        } catch (error) {
            throw new HttpException(
                error instanceof Error ? error.message : 'Internal Server Error',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post('coach/chat')
    async processCoachMessage(
        @Req() req: AuthenticatedRequest,
        @Body() dto: CoachChatDto,
    ) {
        try {
            return await this.aiService.coachChat(req.user.userId, dto);
        } catch (error) {
            throw new HttpException(
                error instanceof Error ? error.message : 'Internal Server Error',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post('ingest')
    async ingestPostData(
        @Req() req: AuthenticatedRequest,
        @Body() dto: IngestPostDto,
    ) {
        try {
            return await this.aiService.ingestPost(dto.postId);
        } catch (error) {
            throw new HttpException(
                error instanceof Error ? error.message : 'Internal Server Error',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post('upload-batch')
    async queueBatchIngest(
        @Req() req: AuthenticatedRequest,
        @Body() dto: BatchIngestDto,
    ) {
        try {
            return await this.aiService.batchIngest(req.user.userId, dto);
        } catch (error) {
            throw new HttpException(
                error instanceof Error ? error.message : 'Internal Server Error',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post('test-connection')
    async testProviderConnection(@Req() req: AuthenticatedRequest) {
        try {
            return await this.aiService.testConnection();
        } catch (error) {
            throw new HttpException(
                error instanceof Error ? error.message : 'Internal Server Error',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}

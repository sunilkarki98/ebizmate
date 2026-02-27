import { Controller, Post, Get, Body, UseGuards, Req, HttpException, HttpStatus, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { CustomerDomain } from "@ebizmate/domain";

@Controller('customer')
@UseGuards(JwtAuthGuard)
export class CustomerController {

    @Get(':platformId/conversation')
    async getConversation(
        @Req() req: AuthenticatedRequest,
        @Param('platformId') platformId: string,
    ) {
        try {
            const userId = req.user.userId;
            return await CustomerDomain.getConversation(userId, platformId);

        } catch (error) {
            throw new HttpException(
                error instanceof Error ? error.message : 'Internal Server Error',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post(':id/resume')
    async resumeAi(
        @Req() req: AuthenticatedRequest,
        @Param('id') customerId: string,
    ) {
        try {
            const userId = req.user.userId;
            return await CustomerDomain.resumeAi(userId, customerId);
        } catch (error) {
            throw new HttpException(
                error instanceof Error ? error.message : 'Internal Server Error',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post(':id/pause')
    async pauseAi(
        @Req() req: AuthenticatedRequest,
        @Param('id') customerId: string,
    ) {
        try {
            const userId = req.user.userId;
            return await CustomerDomain.pauseAi(userId, customerId);
        } catch (error) {
            throw new HttpException(
                error instanceof Error ? error.message : 'Internal Server Error',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}

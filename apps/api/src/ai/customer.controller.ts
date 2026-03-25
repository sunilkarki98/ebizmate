import {
    Controller,
    Post,
    Get,
    UseGuards,
    Req,
    HttpException,
    HttpStatus,
    Param,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { CustomerDomain } from "@ebizmate/domain";

function mapCustomerDomainError(error: unknown): never {
    if (error instanceof Error) {
        const msg = error.message;
        if (
            msg === 'Workspace not found' ||
            msg === 'Customer not found' ||
            msg.endsWith(' not found')
        ) {
            throw new NotFoundException(msg);
        }
        if (msg.includes('Unauthorized')) {
            throw new ForbiddenException(msg);
        }
    }
    throw new HttpException(
        error instanceof Error ? error.message : 'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
    );
}

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
            return mapCustomerDomainError(error);
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
            return mapCustomerDomainError(error);
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
            return mapCustomerDomainError(error);
        }
    }
}

import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspacePolicyGuard } from '../common/guards/workspace-policy.guard';
import { InboxService } from './inbox.service';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('inbox')
@UseGuards(JwtAuthGuard, WorkspacePolicyGuard)
export class InboxController {
    constructor(private readonly inboxService: InboxService) { }

    @Get('customers')
    async getCustomers(@Req() req: AuthenticatedRequest) {
        return this.inboxService.getCustomers(req.user.userId);
    }

    @Get('customer/:platformId/conversation')
    async getConversation(
        @Req() req: AuthenticatedRequest,
        @Param('platformId') platformId: string
    ) {
        return this.inboxService.getConversation(req.user.userId, platformId);
    }

    @Post('customer/:id/archive')
    async archiveCustomer(
        @Req() req: AuthenticatedRequest,
        @Param('id') customerId: string
    ) {
        return this.inboxService.archiveCustomer(req.user.userId, customerId);
    }

    @Post('customer/:id/pause')
    async pauseCustomerAi(
        @Req() req: AuthenticatedRequest,
        @Param('id') customerId: string
    ) {
        return this.inboxService.pauseAi(req.user.userId, customerId);
    }

    @Post('customer/:id/resume')
    async resumeCustomerAi(
        @Req() req: AuthenticatedRequest,
        @Param('id') customerId: string
    ) {
        return this.inboxService.resumeAi(req.user.userId, customerId);
    }

    @Post('customer/:id/message')
    async sendMessage(
        @Req() req: AuthenticatedRequest,
        @Param('id') customerId: string,
        @Body() body: { text: string }
    ) {
        return this.inboxService.sendMessage(req.user.userId, customerId, body.text);
    }
}

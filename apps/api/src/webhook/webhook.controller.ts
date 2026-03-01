import { Controller, Post, Body, Param, UseGuards, BadRequestException, Req, HttpException, HttpStatus } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
import { webhookBodySchema } from '@ebizmate/contracts';
import { checkIpRateLimit } from '@ebizmate/shared';
import { Request } from 'express';

@Controller('webhook/internal')
@UseGuards(WebhookSignatureGuard)
export class WebhookController {
    constructor(private readonly webhookService: WebhookService) { }

    @Post(':platform')
    async handleInternalWebhook(
        @Param('platform') platform: string,
        @Body() rawPayload: unknown,
        @Req() req: Request
    ) {
        // IP Rate Limiting
        const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
        const isAllowed = await checkIpRateLimit(ip);
        if (!isAllowed) {
            throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
        }

        // Validate payload using Zod schema
        const parsed = webhookBodySchema.safeParse(rawPayload);

        if (!parsed.success) {
            throw new BadRequestException({
                message: 'Invalid webhook payload',
                errors: parsed.error.issues.map(i => ({
                    path: i.path.join('.'),
                    message: i.message
                }))
            });
        }

        return this.webhookService.handleWebhookEvent(platform, parsed.data);
    }
}

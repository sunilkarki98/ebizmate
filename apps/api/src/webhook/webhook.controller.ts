import { Controller, Post, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { InternalSecretGuard } from '../common/guards/internal-secret.guard';
import { webhookBodySchema } from '@ebizmate/contracts';

@Controller('webhook/internal')
@UseGuards(InternalSecretGuard)
export class WebhookController {
    constructor(private readonly webhookService: WebhookService) { }

    @Post(':platform')
    async handleInternalWebhook(
        @Param('platform') platform: string,
        @Body() rawPayload: unknown
    ) {
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

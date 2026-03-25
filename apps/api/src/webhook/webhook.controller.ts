import { Controller, Post, Body, Param, UseGuards, BadRequestException, Req, HttpException, HttpStatus } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { InternalSecretGuard } from '../common/guards/internal-secret.guard';
import { webhookBodySchema } from '@ebizmate/contracts';
import { checkIpRateLimit, checkTenantRateLimit } from '@ebizmate/shared';
import { Request } from 'express';
import { db, workspaces } from '@ebizmate/db';
import { eq } from 'drizzle-orm';

/**
 * Next.js validates/signs webhooks at the edge, then forwards here with INTERNAL_API_SECRET.
 * Platform HMAC verification is NOT repeated here (raw provider body is not available).
 */
@Controller('webhook/internal')
@UseGuards(InternalSecretGuard)
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
        const isAllowedIp = await checkIpRateLimit(ip);
        if (!isAllowedIp) {
            throw new HttpException('Too Many Requests (IP)', HttpStatus.TOO_MANY_REQUESTS);
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

        const data = parsed.data;

        // PRINCIPAL AUDIT FIX: Tenant-level inbound rate limiting
        // We must extract the account ID from the payload to find the workspace
        let platformAccountId: string | undefined;

        if (platform === 'instagram' || platform === 'messenger') {
            platformAccountId = data.entry?.[0]?.id;
        } else if (platform === 'tiktok') {
            platformAccountId = data.log_id ? data.entry?.[0]?.id : undefined; // Tiktok might vary, safely try to get it
        }

        if (platformAccountId) {
            // Fast lookup in DB
            const workspace = await db.query.workspaces.findFirst({
                where: eq(workspaces.platformId, platformAccountId),
                columns: { id: true }
            });

            if (workspace) {
                const isAllowedTenant = await checkTenantRateLimit(workspace.id);
                if (!isAllowedTenant) {
                    throw new HttpException('Too Many Requests (Tenant)', HttpStatus.TOO_MANY_REQUESTS);
                }
            }
        }

        return this.webhookService.handleWebhookEvent(platform, data);
    }
}

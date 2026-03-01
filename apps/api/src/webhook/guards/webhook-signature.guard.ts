import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { Request } from 'express';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
    private readonly logger = new Logger(WebhookSignatureGuard.name);

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        const platform = request.params?.platform; // from :platform route param

        // NestJS populates req.rawBody when { rawBody: true } is enabled in main.ts
        const rawBody = (request as any).rawBody;
        if (!rawBody) {
            this.logger.error('CRITICAL: rawBody not found on request. Ensure { rawBody: true } is enabled in main.ts.');
            throw new UnauthorizedException('Unable to verify webhook signature: rawBody missing');
        }

        if (platform === 'tiktok') {
            return this.verifyTikTokSignature(request, rawBody);
        } else if (['instagram', 'messenger', 'facebook_pages', 'facebook', 'whatsapp'].includes(platform as string)) {
            return this.verifyMetaSignature(request, rawBody);
        }

        // If platform is unknown or mock, we might reject or allow depending on env. 
        // For strict security, reject unknown platforms.
        this.logger.warn(`Unknown or unsupported webhook platform: ${platform}`);
        throw new UnauthorizedException(`Unsupported webhook platform: ${platform}`);
    }

    private verifyMetaSignature(request: Request, rawBody: Buffer): boolean {
        const appSecret = process.env['META_APP_SECRET'];
        if (!appSecret) {
            this.logger.error('CRITICAL: META_APP_SECRET is not configured.');
            throw new UnauthorizedException('Webhook verification failed: secret not configured');
        }

        const signatureHeader = request.headers['x-hub-signature-256'] as string;
        if (!signatureHeader) {
            this.logger.warn('Blocked Meta webhook request missing x-hub-signature-256 header');
            throw new UnauthorizedException('Missing signature header');
        }

        const expectedSignature = `sha256=${crypto
            .createHmac('sha256', appSecret)
            .update(rawBody)
            .digest('hex')}`;

        return this.compareSignatures(signatureHeader, expectedSignature, 'Meta');
    }

    private verifyTikTokSignature(request: Request, rawBody: Buffer): boolean {
        const appSecret = process.env['TIKTOK_APP_SECRET'];
        if (!appSecret) {
            this.logger.error('CRITICAL: TIKTOK_APP_SECRET is not configured.');
            throw new UnauthorizedException('Webhook verification failed: secret not configured');
        }

        const signatureHeader = request.headers['x-tiktok-signature'] as string;
        if (!signatureHeader) {
            this.logger.warn('Blocked TikTok webhook request missing x-tiktok-signature header');
            throw new UnauthorizedException('Missing signature header');
        }

        const expectedSignature = crypto
            .createHmac('sha256', appSecret)
            .update(rawBody)
            .digest('hex');

        return this.compareSignatures(signatureHeader, expectedSignature, 'TikTok');
    }

    private compareSignatures(received: string, expected: string, platformName: string): boolean {
        try {
            const signatureBuffer = Buffer.from(received);
            const expectedBuffer = Buffer.from(expected);

            if (
                signatureBuffer.length !== expectedBuffer.length ||
                !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
            ) {
                // IMPORTANT: Do NOT log the expectedSignature here, it leaks the secret hash
                this.logger.warn(`Signature mismatch for ${platformName} webhook. Received: ${received}`);
                throw new UnauthorizedException('Invalid signature');
            }
        } catch (error) {
            throw new UnauthorizedException('Invalid signature format');
        }

        return true;
    }
}

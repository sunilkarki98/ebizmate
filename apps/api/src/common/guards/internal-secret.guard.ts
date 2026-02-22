import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Guards internal-only routes (e.g. webhook forwarding from Next.js).
 * Validates that the request carries `Authorization: Bearer <INTERNAL_API_SECRET>`.
 *
 * The same INTERNAL_API_SECRET env var must be set in both the Next.js
 * frontend (sender) and the NestJS backend (receiver).
 */
@Injectable()
export class InternalSecretGuard implements CanActivate {
    private readonly logger = new Logger(InternalSecretGuard.name);

    canActivate(context: ExecutionContext): boolean {
        const secret = process.env.INTERNAL_API_SECRET;

        if (!secret) {
            this.logger.error('INTERNAL_API_SECRET env var is not set — blocking all internal requests');
            throw new UnauthorizedException('Server misconfiguration');
        }

        const request = context.switchToHttp().getRequest();
        const authHeader: string | undefined = request.headers?.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing internal authorization token');
        }

        const token = authHeader.slice(7); // strip "Bearer "

        // Constant-time comparison to prevent timing attacks
        if (token.length !== secret.length || !timingSafeEqual(token, secret)) {
            this.logger.warn('Internal webhook request rejected — invalid token');
            throw new UnauthorizedException('Invalid internal authorization token');
        }

        return true;
    }
}

/** Constant-time string comparison (avoids timing attacks) */
function timingSafeEqual(a: string, b: string): boolean {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

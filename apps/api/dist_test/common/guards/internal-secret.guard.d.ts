import { CanActivate, ExecutionContext } from '@nestjs/common';
/**
 * Guards internal-only routes (e.g. webhook forwarding from Next.js).
 * Validates that the request carries `Authorization: Bearer <INTERNAL_API_SECRET>`.
 *
 * The same INTERNAL_API_SECRET env var must be set in both the Next.js
 * frontend (sender) and the NestJS backend (receiver).
 */
export declare class InternalSecretGuard implements CanActivate {
    private readonly logger;
    canActivate(context: ExecutionContext): boolean;
}
//# sourceMappingURL=internal-secret.guard.d.ts.map
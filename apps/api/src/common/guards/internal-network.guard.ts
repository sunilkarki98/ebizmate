import { Injectable, CanActivate, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class InternalNetworkGuard implements CanActivate {
    private readonly logger = new Logger(InternalNetworkGuard.name);

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();

        // Basic check for loopback/internal IP
        // In production, your load balancer typically routes health checks from an internal subnet
        const ip = request.ip || request.connection.remoteAddress;

        if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
            return true;
        }

        // Could also check for internal VPC subnets like '10.', '172.16.', '192.168.', etc.
        if (ip && (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.'))) {
            return true;
        }

        // If a specific health check token is provided via environment variables, allow it
        // This is useful for external monitoring services like Datadog/UptimeRobot
        const authHeader = request.headers.authorization;
        const expectedToken = process.env.HEALTH_CHECK_TOKEN;

        if (expectedToken && authHeader === `Bearer ${expectedToken}`) {
            return true;
        }

        this.logger.warn(`Rejected health check attempt from external IP: ${ip}`);
        throw new UnauthorizedException('Access to deep health metrics is restricted to internal infrastructure');
    }
}

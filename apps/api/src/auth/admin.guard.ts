import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { db } from '@ebizmate/db';
import { users } from '@ebizmate/db';
import { eq } from 'drizzle-orm';

// PERF-5 FIX: In-memory cache for admin role checks.
// Admin role changes are rare — caching for 60s eliminates 99% of redundant DB queries.
const _roleCache = new Map<string, { role: string; expiresAt: number }>();
const ROLE_CACHE_TTL = 60_000; // 60 seconds

@Injectable()
export class AdminGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || (!user.sub && !user.id)) {
            throw new UnauthorizedException('Authentication required');
        }

        const userId = user.sub || user.id;

        // Check in-memory cache first
        const cached = _roleCache.get(userId);
        if (cached && cached.expiresAt > Date.now()) {
            if (cached.role !== 'admin') {
                throw new ForbiddenException('Admin access required');
            }
            return true;
        }

        const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));

        if (!dbUser || dbUser.role !== 'admin') {
            // Cache non-admin too so we don't re-query for them
            if (dbUser) _roleCache.set(userId, { role: dbUser.role, expiresAt: Date.now() + ROLE_CACHE_TTL });
            throw new ForbiddenException('Admin access required');
        }

        // Cache admin role
        _roleCache.set(userId, { role: 'admin', expiresAt: Date.now() + ROLE_CACHE_TTL });
        return true;
    }
}

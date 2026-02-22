import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { db } from '@ebizmate/db';
import { users } from '@ebizmate/db';
import { eq } from 'drizzle-orm';

@Injectable()
export class AdminGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || (!user.sub && !user.id)) {
            throw new UnauthorizedException('Authentication required');
        }

        const userId = user.sub || user.id;

        const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));

        if (!dbUser || dbUser.role !== 'admin') {
            throw new ForbiddenException('Admin access required');
        }

        return true;
    }
}

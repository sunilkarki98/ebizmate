import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { db, workspaces } from '@ebizmate/db';
import { eq } from 'drizzle-orm';

/**
 * Defense-in-depth guard for AI endpoints.
 * Checks workspace status and aiBlocked BEFORE any domain code runs.
 * This catches blocked workspaces early with clean HTTP errors.
 *
 * Must be applied AFTER JwtAuthGuard (needs req.user).
 */
@Injectable()
export class WorkspacePolicyGuard implements CanActivate {
    private readonly logger = new Logger(WorkspacePolicyGuard.name);

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.userId) {
            throw new UnauthorizedException('Authentication required');
        }

        // Lightweight query — only fetch enforcement-relevant fields
        const workspace = await db.query.workspaces.findFirst({
            where: eq(workspaces.userId, user.userId),
            columns: {
                id: true,
                status: true,
                aiBlocked: true,
                allowGlobalAi: true,
                plan: true,
            },
        });

        if (!workspace) {
            // No workspace yet — allow through (lazy-create will handle it downstream)
            return true;
        }

        if (workspace.status === 'suspended') {
            this.logger.warn(`Blocked AI request: workspace ${workspace.id} is suspended`);
            throw new ForbiddenException('Workspace is suspended. Contact support.');
        }

        if (workspace.aiBlocked) {
            this.logger.warn(`Blocked AI request: workspace ${workspace.id} has AI blocked by admin`);
            throw new ForbiddenException('AI access has been blocked by the platform administrator.');
        }

        // Attach workspace policy to request for downstream use (avoids duplicate DB query)
        request.workspacePolicy = workspace;

        return true;
    }
}

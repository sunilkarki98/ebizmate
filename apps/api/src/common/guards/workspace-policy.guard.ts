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
import { dragonfly, isDragonflyAvailable } from '@ebizmate/shared';

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

        const cacheKey = `workspace_policy:${user.userId}`;
        let workspace: any = null;

        // 1. Try Cache First
        if (isDragonflyAvailable() && dragonfly) {
            try {
                const cached = await dragonfly.get(cacheKey);
                if (cached) {
                    workspace = JSON.parse(cached);
                }
            } catch (err) {
                this.logger.warn(`Failed to read from Dragonfly cache: ${err}`);
            }
        }

        // 2. Fetch from DB if not in cache
        if (!workspace) {
            // Lightweight query — only fetch enforcement-relevant fields
            workspace = await db.query.workspaces.findFirst({
                where: eq(workspaces.userId, user.userId),
                columns: {
                    id: true,
                    status: true,
                    aiBlocked: true,
                    allowGlobalAi: true,
                    plan: true,
                },
            });

            // 3. Write to Cache (60s TTL)
            if (workspace && isDragonflyAvailable() && dragonfly) {
                try {
                    await dragonfly.set(cacheKey, JSON.stringify(workspace), 'EX', 60);
                } catch (err) {
                    this.logger.warn(`Failed to write to Dragonfly cache: ${err}`);
                }
            }
        }

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

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { db, customers, items, posts, orders, interactions } from '@ebizmate/db';
import { eq } from 'drizzle-orm';

/**
 * Path segment → table mapping (first match wins; list most specific routes first).
 * Prefer matching on `originalUrl` so rewrites/proxies still resolve correctly.
 */
const RESOURCE_ROUTE_MAP: Array<{
    segment: string;
    // Drizzle table refs share workspaceId + id; union typing is verbose for .from()
    table: typeof customers;
    label: string;
}> = [
    { segment: '/interaction/', table: interactions as unknown as typeof customers, label: 'Interaction' },
    { segment: '/interactions/', table: interactions as unknown as typeof customers, label: 'Interaction' },
    { segment: '/customer/', table: customers, label: 'Customer' },
    { segment: '/customers/', table: customers, label: 'Customer' },
    { segment: '/item/', table: items as unknown as typeof customers, label: 'Item' },
    { segment: '/items/', table: items as unknown as typeof customers, label: 'Item' },
    { segment: '/post/', table: posts as unknown as typeof customers, label: 'Post' },
    { segment: '/posts/', table: posts as unknown as typeof customers, label: 'Post' },
    { segment: '/order/', table: orders as unknown as typeof customers, label: 'Order' },
    { segment: '/orders/', table: orders as unknown as typeof customers, label: 'Order' },
];

/**
 * IDOR Protection Guard
 * Verifies that the resource at `:id` belongs to the caller's workspace.
 */
@Injectable()
export class WorkspaceOwnershipGuard implements CanActivate {
    private readonly logger = new Logger(WorkspaceOwnershipGuard.name);

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const resourceId = request.params.id as string | undefined;

        if (!user || !user.userId) {
            return false;
        }

        const workspaceId = request.workspacePolicy?.id as string | undefined;

        if (!workspaceId) {
            throw new ForbiddenException('No active workspace found for user.');
        }

        if (!resourceId) {
            return true;
        }

        const urlPath = (request.originalUrl || request.url || '') as string;

        try {
            const mapping = RESOURCE_ROUTE_MAP.find((m) => urlPath.includes(m.segment));
            if (mapping) {
                await this.verifyOwnership(
                    mapping.table,
                    resourceId,
                    workspaceId,
                    mapping.label,
                );
            }

            return true;
        } catch (err) {
            if (err instanceof NotFoundException || err instanceof ForbiddenException) {
                throw err;
            }
            this.logger.error(`Error in WorkspaceOwnershipGuard: ${err}`);
            throw new ForbiddenException('Access denied to resource');
        }
    }

    private async verifyOwnership(
        table: typeof customers,
        resourceId: string,
        workspaceId: string,
        resourceName: string,
    ) {
        const records = await db
            .select({ workspaceId: table.workspaceId })
            .from(table)
            .where(eq(table.id, resourceId))
            .limit(1);

        const record = records[0];

        if (!record) {
            throw new NotFoundException(`${resourceName} not found`);
        }

        if (record.workspaceId !== workspaceId) {
            this.logger.warn(
                `IDOR Attempt Blocked: User attempted to access ${resourceName} ${resourceId} belonging to workspace ${record.workspaceId}`,
            );
            throw new ForbiddenException(
                `You do not have permission to access this ${resourceName}`,
            );
        }
    }
}

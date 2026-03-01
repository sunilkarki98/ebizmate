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
 * IDOR Protection Guard
 * Automatically secures endpoints that receive a resource ID in the path (e.g. /customers/:id).
 * Verifies that the requested resource actually belongs to the caller's workspace.
 */
@Injectable()
export class WorkspaceOwnershipGuard implements CanActivate {
    private readonly logger = new Logger(WorkspaceOwnershipGuard.name);

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const resourceId = request.params.id; // Expects ID in URL path (e.g. /resource/:id)

        if (!user || !user.userId) {
            return false; // Handled by JwtAuthGuard ideally
        }

        // We assume WorkspacePolicyGuard ran first and attached the workspace 
        const workspaceId = request.workspacePolicy?.id;

        if (!workspaceId) {
            throw new ForbiddenException('No active workspace found for user.');
        }

        // If there's no ID in the path, this guard is effectively a no-op 
        // (useful if applied at the controller level but some routes are collection-based).
        if (!resourceId) {
            return true;
        }

        const urlPath = request.originalUrl || request.url;

        try {
            // Determine resource type based on URL path routing
            if (urlPath.includes('/customer/') || urlPath.includes('/customers/')) {
                await this.verifyOwnership(customers, 'id', resourceId, workspaceId, 'Customer');
            } else if (urlPath.includes('/item/') || urlPath.includes('/items/')) {
                await this.verifyOwnership(items, 'id', resourceId, workspaceId, 'Item');
            } else if (urlPath.includes('/post/') || urlPath.includes('/posts/')) {
                await this.verifyOwnership(posts, 'id', resourceId, workspaceId, 'Post');
            } else if (urlPath.includes('/order/') || urlPath.includes('/orders/')) {
                await this.verifyOwnership(orders, 'id', resourceId, workspaceId, 'Order');
            } else if (urlPath.includes('/interaction/') || urlPath.includes('/interactions/')) {
                await this.verifyOwnership(interactions, 'id', resourceId, workspaceId, 'Interaction');
            }
            // Add more resource mappings as needed

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
        table: any,
        idColumn: string,
        resourceId: string,
        workspaceId: string,
        resourceName: string
    ) {
        const records = await db.select({ workspaceId: table.workspaceId })
            .from(table)
            .where(eq(table[idColumn], resourceId))
            .limit(1);

        const record = records[0];

        if (!record) {
            throw new NotFoundException(`${resourceName} not found`);
        }

        if (record.workspaceId !== workspaceId) {
            this.logger.warn(`IDOR Attempt Blocked: User attempted to access ${resourceName} ${resourceId} belonging to workspace ${record.workspaceId}`);
            throw new ForbiddenException(`You do not have permission to access this ${resourceName}`);
        }
    }
}

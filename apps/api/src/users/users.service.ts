import { Injectable, Logger } from '@nestjs/common';
import { db } from '@ebizmate/db';
import { users, sessions, accounts } from '@ebizmate/db';
import { eq } from 'drizzle-orm';
import { dragonfly, isDragonflyAvailable } from '@ebizmate/shared';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    /**
     * Executes a hard GDPR-compliant data deletion.
     * Workspaces, Usage Logs, Customers, Orders, and Interactions are automatically
     * removed via PostgreSQL's ON DELETE CASCADE constraints.
     */
    async deleteUserAccount(userId: string) {
        try {
            this.logger.log(`[GDPR] Initiating hard delete for user: ${userId}`);

            // First, proactively collect workspace IDs to clear their caches
            const userWorkspaces = await db.query.workspaces.findMany({
                where: (ws, { eq }) => eq(ws.userId, userId),
                columns: { id: true }
            });

            await db.transaction(async (tx) => {
                // Delete NextAuth sessions and accounts
                await tx.delete(sessions).where(eq(sessions.userId, userId));
                await tx.delete(accounts).where(eq(accounts.userId, userId));

                // Delete the core user record.
                // CASCADE handles workspaces, items, interactions, customers, orders, aiUsageLog, etc.
                await tx.delete(users).where(eq(users.id, userId));
            });

            // Post-DB Cleanup: Purge caches to prevent ghost data from serving
            if (isDragonflyAvailable() && dragonfly) {
                const pipeline = dragonfly.pipeline();
                for (const ws of userWorkspaces) {
                    pipeline.del(`ai_settings:${ws.id}`);
                    pipeline.del(`policy_version:${ws.id}`);
                    pipeline.del(`usage:${ws.id}`);
                }
                await pipeline.exec();
            }

            this.logger.log(`[GDPR] Successfully scrubbed all data for user: ${userId}`);
        } catch (error) {
            this.logger.error(`[GDPR] Failed to delete user account ${userId}`, error);
            throw new Error('Data deletion failed. Please contact support.');
        }
    }
}

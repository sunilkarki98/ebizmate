import { db, workspaces, customers, interactions, items } from '@ebizmate/db';
import { eq, desc, sql } from 'drizzle-orm';
import { syncUser } from '../auth/service.js';

export async function getDashboardOverview(userId: string, email?: string, name?: string) {
    let workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, userId),
    });

    if (!workspace) {
        if (!email) {
            throw new Error('Workspace not found and no email provided for auto-sync');
        }

        // Auto-heal Split-Brain scenario
        console.log(`[Auto-Sync] Workspace not found for user ${userId}, invoking self-healing sync...`);
        const syncResult = await syncUser(userId, email, name || email.split('@')[0]);
        workspace = syncResult.workspace;

        if (!workspace) {
            throw new Error('Auto-sync failed to create workspace');
        }
    }

    const [
        customerCountRes,
        interactionCountRes,
        itemCountRes,
        recentInteractions
    ] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(customers).where(eq(customers.workspaceId, workspace.id)),
        db.select({ count: sql<number>`count(*)::int` }).from(interactions).where(eq(interactions.workspaceId, workspace.id)),
        db.select({ count: sql<number>`count(*)::int` }).from(items).where(eq(items.workspaceId, workspace.id)),
        db.query.interactions.findMany({
            where: eq(interactions.workspaceId, workspace.id),
            orderBy: [desc(interactions.createdAt)],
            limit: 5,
            with: {
                customer: {
                    columns: {
                        name: true,
                        platformHandle: true,
                        platformId: true,
                    }
                }
            }
        })
    ]);

    return {
        success: true,
        counts: {
            customers: customerCountRes[0].count || 0,
            interactions: interactionCountRes[0].count || 0,
            items: itemCountRes[0].count || 0,
        },
        recentInteractions
    };
}

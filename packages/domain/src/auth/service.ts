import { db } from '@ebizmate/db';
import { users, workspaces } from '@ebizmate/db';
import { eq } from 'drizzle-orm';

export async function syncUser(userId: string, email: string, name: string, image?: string) {
    let isNewUser = false;
    let finalWorkspace: any = null;

    await db.transaction(async (tx) => {
        // 1. Try to insert the user profile (idempotent due to onConflictDoNothing)
        const [insertedUser] = await tx.insert(users).values({
            id: userId,
            name: name,
            email: email,
            role: "user",
            image: image || null,
            emailVerified: new Date(),
        }).onConflictDoNothing().returning();

        if (insertedUser) {
            // This is a genuinely new user, so create their default workspace
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 7);

            const [ws] = await tx.insert(workspaces).values({
                userId: userId,
                name: `${name}'s Workspace`,
                platform: "generic",
                trialEndsAt: trialEnd,
            }).returning();

            finalWorkspace = ws;
            isNewUser = true;
        } else {
            // User already existed (either previously, or just won a concurrent race)
            const existingWorkspace = await tx.query.workspaces.findFirst({
                where: eq(workspaces.userId, userId)
            });
            finalWorkspace = existingWorkspace;
        }
    });

    return {
        success: true,
        message: isNewUser ? 'User synced successfully' : 'User already exists',
        isNewUser,
        workspace: finalWorkspace
    };
}

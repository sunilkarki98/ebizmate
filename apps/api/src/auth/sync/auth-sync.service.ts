import { Injectable, Logger } from '@nestjs/common';
import { db } from '@ebizmate/db';
import { users, workspaces } from '@ebizmate/db';
import { eq } from 'drizzle-orm';

@Injectable()
export class AuthSyncService {
    private readonly logger = new Logger(AuthSyncService.name);

    async syncUser(userId: string, email: string, name: string, image?: string) {
        try {
            // Check if profile exists (idempotency)
            const existing = await db.query.users.findFirst({
                where: eq(users.id, userId)
            });

            if (!existing) {
                await db.transaction(async (tx) => {
                    // Insert User Profile
                    await tx.insert(users).values({
                        id: userId,
                        name: name,
                        email: email,
                        role: "user",
                        image: image || null,
                        emailVerified: new Date(),
                    });

                    // Create Default Workspace
                    await tx.insert(workspaces).values({
                        userId: userId,
                        name: `${name}'s Workspace`,
                        platform: "generic",
                    });
                });

                this.logger.log(`Synced new user and workspace for ${email}`);
                return { success: true, message: 'User synced successfully' };
            }

            return { success: true, message: 'User already exists' };

        } catch (error) {
            this.logger.error(`Error syncing user profile for ${email}:`, error);
            throw new Error('Failed to sync user profile');
        }
    }
}

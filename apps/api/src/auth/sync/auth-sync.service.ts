import { Injectable, Logger } from '@nestjs/common';
import { AuthDomain } from '@ebizmate/domain';

@Injectable()
export class AuthSyncService {
    private readonly logger = new Logger(AuthSyncService.name);

    async syncUser(userId: string, email: string, name: string, image?: string) {
        try {
            const result = await AuthDomain.syncUser(userId, email, name, image);
            if (result.isNewUser) {
                this.logger.log(`Synced new user and workspace for ${email}`);
            }
            return result;

        } catch (error) {
            this.logger.error(`Error syncing user profile for ${email}:`, error);
            throw new Error('Failed to sync user profile');
        }
    }
}

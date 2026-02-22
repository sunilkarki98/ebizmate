"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AuthSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthSyncService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@ebizmate/db");
const db_2 = require("@ebizmate/db");
const drizzle_orm_1 = require("drizzle-orm");
let AuthSyncService = AuthSyncService_1 = class AuthSyncService {
    logger = new common_1.Logger(AuthSyncService_1.name);
    async syncUser(userId, email, name, image) {
        try {
            // Check if profile exists (idempotency)
            const existing = await db_1.db.query.users.findFirst({
                where: (0, drizzle_orm_1.eq)(db_2.users.id, userId)
            });
            if (!existing) {
                await db_1.db.transaction(async (tx) => {
                    // Insert User Profile
                    await tx.insert(db_2.users).values({
                        id: userId,
                        name: name,
                        email: email,
                        role: "user",
                        image: image || null,
                        emailVerified: new Date(),
                    });
                    // Create Default Workspace
                    await tx.insert(db_2.workspaces).values({
                        userId: userId,
                        name: `${name}'s Workspace`,
                        platform: "generic",
                    });
                });
                this.logger.log(`Synced new user and workspace for ${email}`);
                return { success: true, message: 'User synced successfully' };
            }
            return { success: true, message: 'User already exists' };
        }
        catch (error) {
            this.logger.error(`Error syncing user profile for ${email}:`, error);
            throw new Error('Failed to sync user profile');
        }
    }
};
exports.AuthSyncService = AuthSyncService;
exports.AuthSyncService = AuthSyncService = AuthSyncService_1 = __decorate([
    (0, common_1.Injectable)()
], AuthSyncService);
//# sourceMappingURL=auth-sync.service.js.map
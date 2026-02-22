"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@ebizmate/db");
const db_2 = require("@ebizmate/db");
const drizzle_orm_1 = require("drizzle-orm");
const shared_1 = require("@ebizmate/shared");
let SettingsService = class SettingsService {
    async getWorkspace(userId) {
        const workspace = await db_1.db.query.workspaces.findFirst({
            where: (0, drizzle_orm_1.eq)(db_2.workspaces.userId, userId),
        });
        if (!workspace)
            throw new common_1.NotFoundException('Workspace not found');
        return workspace;
    }
    async getWorkspaceDetailed(userId) {
        const workspace = await db_1.db.query.workspaces.findFirst({
            where: (0, drizzle_orm_1.eq)(db_2.workspaces.userId, userId),
            with: { aiSettings: true }
        });
        if (!workspace)
            throw new common_1.NotFoundException('Workspace not found');
        return workspace;
    }
    async updateIdentity(userId, dto) {
        const workspace = await db_1.db.query.workspaces.findFirst({
            where: (0, drizzle_orm_1.eq)(db_2.workspaces.userId, userId),
        });
        if (!workspace)
            throw new common_1.NotFoundException('Workspace not found');
        await db_1.db.update(db_2.workspaces)
            .set({
            name: dto.workspaceName,
            platform: dto.platform,
            platformHandle: dto.platformHandle || null,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(db_2.workspaces.id, workspace.id));
        return { success: true };
    }
    async updateProfile(userId, dto) {
        const workspace = await db_1.db.query.workspaces.findFirst({
            where: (0, drizzle_orm_1.eq)(db_2.workspaces.userId, userId),
        });
        if (!workspace)
            throw new common_1.NotFoundException('Workspace not found');
        await db_1.db.update(db_2.workspaces)
            .set({
            businessName: dto.businessName,
            industry: dto.industry,
            about: dto.about,
            targetAudience: dto.targetAudience,
            toneOfVoice: dto.toneOfVoice,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(db_2.workspaces.id, workspace.id));
        return { success: true };
    }
    async updateAiSettings(userId, dto) {
        const workspace = await db_1.db.query.workspaces.findFirst({
            where: (0, drizzle_orm_1.eq)(db_2.workspaces.userId, userId),
            with: { aiSettings: true }
        });
        if (!workspace)
            throw new common_1.NotFoundException('Workspace not found');
        const updates = { ...dto };
        delete updates.openaiApiKey;
        delete updates.geminiApiKey;
        delete updates.openrouterApiKey;
        delete updates.groqApiKey;
        if (dto.openaiApiKey)
            updates.openaiApiKey = (0, shared_1.encrypt)(dto.openaiApiKey);
        if (dto.geminiApiKey)
            updates.geminiApiKey = (0, shared_1.encrypt)(dto.geminiApiKey);
        if (dto.openrouterApiKey)
            updates.openrouterApiKey = (0, shared_1.encrypt)(dto.openrouterApiKey);
        if (dto.groqApiKey)
            updates.groqApiKey = (0, shared_1.encrypt)(dto.groqApiKey);
        if (Object.keys(updates).length > 0) {
            if (workspace.aiSettings) {
                await db_1.db.update(db_2.aiSettings)
                    .set({ ...updates, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(db_2.aiSettings.workspaceId, workspace.id));
            }
            else {
                await db_1.db.insert(db_2.aiSettings)
                    .values({
                    workspaceId: workspace.id,
                    ...updates
                });
            }
        }
        return { success: true };
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)()
], SettingsService);
//# sourceMappingURL=settings.service.js.map
import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@ebizmate/db';
import { workspaces, aiSettings } from '@ebizmate/db';
import { eq } from 'drizzle-orm';
import { encrypt } from '@ebizmate/shared';
import { UpdateIdentityDto } from './dto/update-identity.dto';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class SettingsService {
    async getWorkspace(userId: string) {
        const workspace = await db.query.workspaces.findFirst({
            where: eq(workspaces.userId, userId),
        });

        if (!workspace) throw new NotFoundException('Workspace not found');
        return workspace;
    }

    async getWorkspaceDetailed(userId: string) {
        const workspace = await db.query.workspaces.findFirst({
            where: eq(workspaces.userId, userId),
            with: { aiSettings: true }
        });

        if (!workspace) throw new NotFoundException('Workspace not found');
        return workspace;
    }

    async updateIdentity(userId: string, dto: UpdateIdentityDto) {
        const workspace = await db.query.workspaces.findFirst({
            where: eq(workspaces.userId, userId),
        });

        if (!workspace) throw new NotFoundException('Workspace not found');

        await db.update(workspaces)
            .set({
                name: dto.workspaceName,
                platform: dto.platform,
                platformHandle: dto.platformHandle || null,
                updatedAt: new Date(),
            })
            .where(eq(workspaces.id, workspace.id));

        return { success: true };
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        const workspace = await db.query.workspaces.findFirst({
            where: eq(workspaces.userId, userId),
        });

        if (!workspace) throw new NotFoundException('Workspace not found');

        await db.update(workspaces)
            .set({
                businessName: dto.businessName,
                industry: dto.industry,
                about: dto.about,
                targetAudience: dto.targetAudience,
                toneOfVoice: dto.toneOfVoice,
                updatedAt: new Date(),
            })
            .where(eq(workspaces.id, workspace.id));

        return { success: true };
    }

    async updateAiSettings(userId: string, dto: UpdateAiSettingsDto) {
        const workspace = await db.query.workspaces.findFirst({
            where: eq(workspaces.userId, userId),
            with: { aiSettings: true }
        });

        if (!workspace) throw new NotFoundException('Workspace not found');

        const updates: Record<string, any> = { ...dto };
        delete updates.openaiApiKey;
        delete updates.geminiApiKey;
        delete updates.openrouterApiKey;
        delete updates.groqApiKey;

        if (dto.openaiApiKey) updates.openaiApiKey = encrypt(dto.openaiApiKey);
        if (dto.geminiApiKey) updates.geminiApiKey = encrypt(dto.geminiApiKey);
        if (dto.openrouterApiKey) updates.openrouterApiKey = encrypt(dto.openrouterApiKey);
        if (dto.groqApiKey) updates.groqApiKey = encrypt(dto.groqApiKey);

        if (Object.keys(updates).length > 0) {
            if (workspace.aiSettings) {
                await db.update(aiSettings)
                    .set({ ...updates, updatedAt: new Date() })
                    .where(eq(aiSettings.workspaceId, workspace.id));
            } else {
                await db.insert(aiSettings)
                    .values({
                        workspaceId: workspace.id,
                        ...updates
                    });
            }
        }

        return { success: true };
    }
}

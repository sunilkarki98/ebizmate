import { db } from '@ebizmate/db';
import { workspaces, aiSettings } from '@ebizmate/db';
import { eq } from 'drizzle-orm';
import { encrypt, dragonfly } from '@ebizmate/shared';
import { UpdateIdentityDto, UpdateAiSettingsDto, UpdateProfileDto, updateIdentitySchema, updateProfileSchema, updateAiSettingsSchema } from '@ebizmate/contracts';
import type { Queue } from 'bullmq';



export async function updateIdentity(userId: string, inputDto: UpdateIdentityDto, aiQueue?: Queue) {
    const dto = updateIdentitySchema.parse(inputDto);
    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, userId),
    });

    if (!workspace) throw new Error('Workspace not found');

    await db.update(workspaces)
        .set({
            name: dto.workspaceName,
            platform: dto.platform,
            platformHandle: dto.platformHandle || null,
            updatedAt: new Date(),
        })
        .where(eq(workspaces.id, workspace.id));

    // Dispatch initial sync if platform was updated and background queue is available
    if (dto.platform && aiQueue) {
        await aiQueue.add('initial_sync', { workspaceId: workspace.id }, {
            jobId: `initial_sync_${workspace.id}`, // Idempotency
            removeOnComplete: true,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 }
        });
        console.log(`[Onboarding] Scheduled initial sync for workspace ${workspace.id}`);
    }

    return { success: true };
}

export async function updateProfile(userId: string, inputDto: UpdateProfileDto) {
    const dto = updateProfileSchema.parse(inputDto);
    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, userId),
    });

    if (!workspace) throw new Error('Workspace not found');

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

export async function updateAiSettings(userId: string, inputDto: UpdateAiSettingsDto) {
    const dto = updateAiSettingsSchema.parse(inputDto);
    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, userId),
        with: { aiSettings: true }
    });

    if (!workspace) throw new Error('Workspace not found');

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
    // Invalidate Cache
    try {
        await dragonfly?.del(`ai_settings:${workspace.id}`);
    } catch (err) {
        console.warn("Failed to invalidate AI settings cache:", err);
    }

    return { success: true };
}

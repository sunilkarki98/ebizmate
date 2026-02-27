import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// --- Admin Action Schemas ---

export const updateUserRoleSchema = z.object({
    userId: z.string().min(1),
    role: z.enum(["admin", "user"]),
});

export const workspacePlanSchema = z.object({
    plan: z.string().min(1),
    status: z.string().min(1),
    customUsageLimit: z.number().int().min(0).nullable().optional(),
    trialEndsAt: z.any().nullable().optional(),
});

export const updateWorkspacePlanSchema = z.object({
    workspaceId: z.string().min(1),
    data: workspacePlanSchema,
});

export const toggleGlobalAiAccessSchema = z.object({
    workspaceId: z.string().min(1),
    allowed: z.boolean(),
});

export const resolveEscalationSchema = z.object({
    interactionId: z.string().min(1),
});

export const toggleAiPauseSchema = z.object({
    workspaceId: z.string().min(1),
    platformId: z.string().min(1),
});

export const fetchModelsSchema = z.object({
    provider: z.string().min(1),
    apiKey: z.string().optional(),
});

// --- Inferred Types ---

export type UpdateUserRole = z.infer<typeof updateUserRoleSchema>;
export type WorkspacePlan = z.infer<typeof workspacePlanSchema>;
export type UpdateWorkspacePlan = z.infer<typeof updateWorkspacePlanSchema>;
export type ToggleGlobalAiAccess = z.infer<typeof toggleGlobalAiAccessSchema>;
export type ResolveEscalation = z.infer<typeof resolveEscalationSchema>;
export type ToggleAiPause = z.infer<typeof toggleAiPauseSchema>;
export type FetchModels = z.infer<typeof fetchModelsSchema>;

// --- NestJS DTO Classes (auto-validated by ZodValidationPipe) ---

export class WorkspacePlanDto extends createZodDto(workspacePlanSchema) { }
export class ToggleAiPauseDto extends createZodDto(toggleAiPauseSchema) { }
export class FetchModelsDto extends createZodDto(fetchModelsSchema) { }

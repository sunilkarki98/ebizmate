/**
 * Validation schemas — re-exported from @ebizmate/contracts (single source of truth).
 * Only web-specific schemas that don't belong in shared contracts live here.
 */

// --- Shared schemas from contracts ---
export {
    // Items
    addItemSchema,
    deleteItemSchema,
    updateItemFullSchema as updateItemSchema,

    // Webhook
    webhookBodySchema,

    // AI Settings
    aiSettingsStrictSchema as aiSettingsSchema,
    updateAiSettingsSchema,

    // Admin
    updateUserRoleSchema,
    workspacePlanSchema,
    updateWorkspacePlanSchema,
    toggleGlobalAiAccessSchema,
    resolveEscalationSchema,
    toggleAiPauseSchema,
    fetchModelsSchema,
} from '@ebizmate/contracts';

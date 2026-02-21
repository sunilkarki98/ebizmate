import { z } from "zod";

// --- Server Action Schemas ---

export const addItemSchema = z.object({
    name: z.string().min(1, "Name is required").max(200, "Name too long"),
    content: z.string().min(1, "Content is required").max(10000, "Content too long"),
    sourceId: z.string().max(200).nullable().optional(),
});

// --- Webhook Payload Schemas ---

export const webhookBodySchema = z.object({
    type: z.string().optional(),
    userId: z.string().max(500).optional(),
    sec_uid: z.string().max(500).optional(),
    authorId: z.string().max(500).optional(),
    userName: z.string().max(200).optional(),
    text: z.string().max(5000).optional(),
    message: z.string().max(5000).optional(),
    commentId: z.string().max(500).optional(),
    messageId: z.string().max(500).optional(),
    video_id: z.string().max(500).optional(),
    item_id: z.string().max(500).optional(),
    post_id: z.string().max(500).optional(),
    description: z.string().max(5000).optional(),
    caption: z.string().max(5000).optional(),
}).passthrough(); // Allow extra fields for platform-specific data

// --- Utility: Sanitize ILIKE input ---

/**
 * Escapes special characters in a string for use in PostgreSQL ILIKE patterns.
 * Prevents SQL injection via wildcard characters.
 */
export function sanitizeLikeInput(input: string): string {
    return input
        .replace(/\\/g, "\\\\") // Escape backslash first
        .replace(/%/g, "\\%")   // Escape percent
        .replace(/_/g, "\\_");  // Escape underscore
}

// --- AI Settings Schema ---

export const aiSettingsSchema = z.object({
    coachProvider: z.enum(["openai", "gemini", "openrouter", "groq"]),
    coachModel: z.string().min(1).max(100),
    customerProvider: z.enum(["openai", "gemini", "openrouter", "groq"]),
    customerModel: z.string().min(1).max(100),
    openaiApiKey: z.string().max(500).optional(),
    openaiModel: z.string().min(1).max(100),
    openaiEmbeddingModel: z.string().min(1).max(100),
    geminiApiKey: z.string().max(500).optional(),
    geminiModel: z.string().min(1).max(100),
    openrouterApiKey: z.string().max(500).optional(),
    openrouterModel: z.string().min(1).max(100),
    groqApiKey: z.string().max(500).optional(),
    groqModel: z.string().min(1).max(100),
    temperature: z.string().refine(v => { const n = parseFloat(v); return n >= 0 && n <= 2; }, "Temperature must be 0-2"),
    maxTokens: z.number().int().min(1).max(128000),
    topP: z.string().refine(v => { const n = parseFloat(v); return n >= 0 && n <= 1; }, "Top-P must be 0-1"),
    systemPromptTemplate: z.string().max(10000).nullable().optional(),
    rateLimitPerMinute: z.number().int().min(1).max(10000),
    retryAttempts: z.number().int().min(0).max(10),
});

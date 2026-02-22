"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiSettingsSchema = exports.webhookBodySchema = exports.addItemSchema = void 0;
const zod_1 = require("zod");
// --- Server Action Schemas ---
exports.addItemSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required").max(200, "Name too long"),
    content: zod_1.z.string().min(1, "Content is required").max(10000, "Content too long"),
    sourceId: zod_1.z.string().max(200).nullable().optional(),
});
// --- Webhook Payload Schemas ---
exports.webhookBodySchema = zod_1.z.object({
    type: zod_1.z.string().optional(),
    userId: zod_1.z.string().max(500).optional(),
    sec_uid: zod_1.z.string().max(500).optional(),
    authorId: zod_1.z.string().max(500).optional(),
    userName: zod_1.z.string().max(200).optional(),
    text: zod_1.z.string().max(5000).optional(),
    message: zod_1.z.string().max(5000).optional(),
    commentId: zod_1.z.string().max(500).optional(),
    messageId: zod_1.z.string().max(500).optional(),
    video_id: zod_1.z.string().max(500).optional(),
    item_id: zod_1.z.string().max(500).optional(),
    post_id: zod_1.z.string().max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    caption: zod_1.z.string().max(5000).optional(),
}).passthrough(); // Allow extra fields for platform-specific data
// --- AI Settings Schema ---
exports.aiSettingsSchema = zod_1.z.object({
    coachProvider: zod_1.z.enum(["openai", "gemini", "openrouter", "groq"]),
    coachModel: zod_1.z.string().min(1).max(100),
    customerProvider: zod_1.z.enum(["openai", "gemini", "openrouter", "groq"]),
    customerModel: zod_1.z.string().min(1).max(100),
    openaiApiKey: zod_1.z.string().max(500).optional(),
    openaiModel: zod_1.z.string().min(1).max(100),
    openaiEmbeddingModel: zod_1.z.string().min(1).max(100),
    geminiApiKey: zod_1.z.string().max(500).optional(),
    geminiModel: zod_1.z.string().min(1).max(100),
    openrouterApiKey: zod_1.z.string().max(500).optional(),
    openrouterModel: zod_1.z.string().min(1).max(100),
    groqApiKey: zod_1.z.string().max(500).optional(),
    groqModel: zod_1.z.string().min(1).max(100),
    temperature: zod_1.z.string().refine(v => { const n = parseFloat(v); return n >= 0 && n <= 2; }, "Temperature must be 0-2"),
    maxTokens: zod_1.z.number().int().min(1).max(128000),
    topP: zod_1.z.string().refine(v => { const n = parseFloat(v); return n >= 0 && n <= 1; }, "Top-P must be 0-1"),
    systemPromptTemplate: zod_1.z.string().max(10000).nullable().optional(),
    rateLimitPerMinute: zod_1.z.number().int().min(1).max(10000),
    retryAttempts: zod_1.z.number().int().min(0).max(10),
});
//# sourceMappingURL=validation.js.map
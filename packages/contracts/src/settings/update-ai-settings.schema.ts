import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const validProviders = ['openai', 'gemini', 'openrouter', 'groq', 'mock'] as const;

export const updateAiSettingsSchema = z.object({
    coachProvider: z.enum(validProviders).optional(),
    coachModel: z.string().max(100).optional(),
    customerProvider: z.enum(validProviders).optional(),
    customerModel: z.string().max(100).optional(),
    openaiApiKey: z.string().max(500).optional(),
    openaiModel: z.string().max(100).optional(),
    openaiEmbeddingModel: z.string().max(100).optional(),
    geminiApiKey: z.string().max(500).optional(),
    geminiModel: z.string().max(100).optional(),
    geminiEmbeddingModel: z.string().max(100).optional(),
    openrouterApiKey: z.string().max(500).optional(),
    openrouterModel: z.string().max(100).optional(),
    groqApiKey: z.string().max(500).optional(),
    groqModel: z.string().max(100).optional(),
    temperature: z.coerce.number().min(0).max(2).optional(),
    maxTokens: z.number().int().min(1).max(128000).optional(),
    topP: z.coerce.number().min(0).max(1).optional(),
    systemPromptTemplate: z.string().max(10000).nullable().optional(),
    rateLimitPerMinute: z.number().int().min(1).max(10000).optional(),
    retryAttempts: z.number().int().min(0).max(10).optional(),
});

export class UpdateAiSettingsDto extends createZodDto(updateAiSettingsSchema) { }

/** Strict version for admin panel — all fields required (used by frontend forms) */
export const aiSettingsStrictSchema = z.object({
    coachProvider: z.enum(validProviders),
    coachModel: z.string().min(1).max(100),
    customerProvider: z.enum(validProviders),
    customerModel: z.string().min(1).max(100),
    openaiApiKey: z.string().max(500).optional(),
    openaiModel: z.string().min(1).max(100),
    openaiEmbeddingModel: z.string().min(1).max(100),
    geminiApiKey: z.string().max(500).optional(),
    geminiModel: z.string().min(1).max(100),
    geminiEmbeddingModel: z.string().min(1).max(100),
    openrouterApiKey: z.string().max(500).optional(),
    openrouterModel: z.string().min(1).max(100),
    groqApiKey: z.string().max(500).optional(),
    groqModel: z.string().min(1).max(100),
    temperature: z.coerce.number().min(0).max(2),
    maxTokens: z.number().int().min(1).max(128000),
    topP: z.coerce.number().min(0).max(1),
    systemPromptTemplate: z.string().max(10000).nullable().optional(),
    rateLimitPerMinute: z.number().int().min(1).max(10000),
    retryAttempts: z.number().int().min(0).max(10),
});


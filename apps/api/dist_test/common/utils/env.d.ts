import { z } from "zod";
declare const envSchema: z.ZodObject<{
    DATABASE_URL: z.ZodString;
    AUTH_SECRET: z.ZodString;
    ENCRYPTION_KEY: z.ZodString;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    OPENAI_API_KEY: z.ZodOptional<z.ZodString>;
    GEMINI_API_KEY: z.ZodOptional<z.ZodString>;
    OPENROUTER_API_KEY: z.ZodOptional<z.ZodString>;
    GOOGLE_CLIENT_ID: z.ZodOptional<z.ZodString>;
    GOOGLE_CLIENT_SECRET: z.ZodOptional<z.ZodString>;
    WEBHOOK_SECRET: z.ZodOptional<z.ZodString>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
}, "strip", z.ZodTypeAny, {
    REDIS_URL?: string;
    NODE_ENV?: "production" | "development" | "test";
    OPENAI_API_KEY?: string;
    GEMINI_API_KEY?: string;
    OPENROUTER_API_KEY?: string;
    WEBHOOK_SECRET?: string;
    DATABASE_URL?: string;
    AUTH_SECRET?: string;
    ENCRYPTION_KEY?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
}, {
    REDIS_URL?: string;
    NODE_ENV?: "production" | "development" | "test";
    OPENAI_API_KEY?: string;
    GEMINI_API_KEY?: string;
    OPENROUTER_API_KEY?: string;
    WEBHOOK_SECRET?: string;
    DATABASE_URL?: string;
    AUTH_SECRET?: string;
    ENCRYPTION_KEY?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
}>;
export type Env = z.infer<typeof envSchema>;
export declare function getEnv(): Env;
export {};
//# sourceMappingURL=env.d.ts.map
import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
    ENCRYPTION_KEY: z.string().min(1, "ENCRYPTION_KEY is required for API key encryption"),
    DRAGONFLY_URL: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    WEBHOOK_SECRET: z.string().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
    if (_env) return _env;

    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error("❌ Invalid environment variables:");
        for (const issue of parsed.error.issues) {
            console.error(`   ${issue.path.join(".")}: ${issue.message}`);
        }
        throw new Error("Invalid environment variables. See above for details.");
    }

    _env = parsed.data;
    return _env;
}

// Validate env at module load time — fail fast at startup, not at runtime.
// Skip during build phase (process.env vars may not be fully available).
if (typeof globalThis !== "undefined" && !("window" in globalThis) && process.env["DATABASE_URL"]) {
    getEnv();
}

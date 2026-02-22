"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnv = getEnv;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string().min(1, "DATABASE_URL is required"),
    AUTH_SECRET: zod_1.z.string().min(1, "AUTH_SECRET is required"),
    ENCRYPTION_KEY: zod_1.z.string().min(1, "ENCRYPTION_KEY is required for API key encryption"),
    REDIS_URL: zod_1.z.string().optional(),
    OPENAI_API_KEY: zod_1.z.string().optional(),
    GEMINI_API_KEY: zod_1.z.string().optional(),
    OPENROUTER_API_KEY: zod_1.z.string().optional(),
    GOOGLE_CLIENT_ID: zod_1.z.string().optional(),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().optional(),
    WEBHOOK_SECRET: zod_1.z.string().optional(),
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]).default("development"),
});
let _env = null;
function getEnv() {
    if (_env)
        return _env;
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
//# sourceMappingURL=env.js.map
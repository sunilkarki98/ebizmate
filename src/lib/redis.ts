
import Redis from "ioredis";

const globalForRedis = global as unknown as { redis: Redis | undefined };

export const redis =
    globalForRedis.redis ??
    new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
        lazyConnect: true, // IMPORTANT: Prevents Next.js HMR/build process from spamming connection attempts on file load
        connectTimeout: 10000,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3, // Allow a few retries to handle temporary container restarts
        retryStrategy: (times) => {
            if (times > 5) return null; // Stop retrying after 5 failures to avoid infinite looping
            return Math.min(times * 500, 2000); // Wait between 500ms and 2s between retries
        },
    });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// --- Connection Logging ---
let hasLoggedError = false;
redis.on("connect", () => {
    console.log("✅ [Redis] Connection Established");
    hasLoggedError = false; // Reset on success
});
redis.on("error", (err) => {
    if (!hasLoggedError) {
        console.warn(`⚠️ [Redis] Connection Warning: ${err.message}. Retrying...`);
        hasLoggedError = true; // Suppress continuous connection spam
    }
});
redis.on("ready", () => console.log("🚀 [Redis] Client Ready"));

// Atomic Rate Limiter — Lua script ensures INCR + EXPIRE are a single operation
const RATE_LIMIT_LUA = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local current = redis.call("INCR", key)
if current == 1 then
    redis.call("EXPIRE", key, ttl)
end
if current > limit then
    return {0, 0}
end
return {1, limit - current}
`;

export async function checkRateLimit(workspaceId: string, limit: number): Promise<{ success: boolean; remaining: number }> {
    try {
        if (!redis) return { success: true, remaining: limit }; // Fail open

        const now = new Date();
        const minuteKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}:${now.getUTCHours()}:${now.getUTCMinutes()}`;
        const key = `ratelimit:${workspaceId}:${minuteKey}`;

        // Atomic: INCR + EXPIRE in one roundtrip via Lua
        const result = await redis.eval(RATE_LIMIT_LUA, 1, key, limit, 60) as [number, number];

        return {
            success: result[0] === 1,
            remaining: result[1],
        };
    } catch (error) {
        console.warn("Redis rate limit check failed:", error);
        return { success: true, remaining: limit }; // Fail open
    }
}

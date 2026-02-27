import { Redis as Dragonfly } from "ioredis";

// ---------------------------------------------------------------------------
// Configuration — single source of truth for all Dragonfly consumers
// ---------------------------------------------------------------------------

/** Parse DRAGONFLY_URL or compose from DRAGONFLY_HOST/DRAGONFLY_PORT */
function getDragonflyUrl(): string {
    if (process.env.DRAGONFLY_URL) return process.env.DRAGONFLY_URL;
    const host = process.env.DRAGONFLY_HOST || "127.0.0.1";
    const port = process.env.DRAGONFLY_PORT || "6379";
    const password = process.env.DRAGONFLY_PASSWORD;
    return password
        ? `dragonfly://:${password}@${host}:${port}`
        : `dragonfly://${host}:${port}`;
}

/** Parsed connection options for BullMQ and other iodragonfly consumers */
export function getDragonflyConfig(): Record<string, any> {
    const baseConfig = {
        maxRetriesPerRequest: null as null, // Critical for BullMQ resilience
        enableOfflineQueue: false,
        retryStrategy: (times: number) => {
            if (times > 5 && (times % 12 === 0)) {
                console.warn(`⚠️ [BullMQ/Dragonfly] Can't connect, retrying (attempt ${times})...`);
            }
            return Math.min(times * 500, 5000);
        }
    };

    if (process.env.DRAGONFLY_URL) {
        try {
            const url = new URL(process.env.DRAGONFLY_URL);
            return {
                ...baseConfig,
                host: url.hostname,
                port: parseInt(url.port || "6379", 10),
                ...(url.password ? { password: url.password } : {}),
            };
        } catch {
            // Malformed URL, fall through to env vars
        }
    }
    return {
        ...baseConfig,
        host: process.env.DRAGONFLY_HOST || '127.0.0.1',
        port: parseInt(process.env.DRAGONFLY_PORT || '6379'),
        password: process.env.DRAGONFLY_PASSWORD || undefined,
        tls: process.env.DRAGONFLY_TLS === 'true' ? {} : undefined,
    };
}

// ---------------------------------------------------------------------------
// Singleton client — gracefully optional
// ---------------------------------------------------------------------------

const globalForDragonfly = global as unknown as { dragonfly: Dragonfly | null; dragonflyReady: boolean };

let hasLoggedError = false;
let isConnected = false;

function createDragonflyClient(): Dragonfly | null {
    try {
        const client = new Dragonfly(getDragonflyUrl(), {
            lazyConnect: true,
            connectTimeout: 5000,
            enableReadyCheck: true,
            maxRetriesPerRequest: null, // Critical: BullMQ requires this to be null
            retryStrategy: (times: number) => {
                if (times > 5 && (times % 12 === 0)) {
                    console.warn(`⚠️ [Dragonfly/Dragonfly] Connection lost. Infinite retry backing off (attempt ${times})...`);
                }
                // Never return null! BullMQ relies on this connection eventually recovering.
                return Math.min(times * 500, 5000);
            },
        });

        client.on("connect", () => {
            isConnected = true;
            hasLoggedError = false;
            console.log("✅ [Dragonfly] Connected");
        });

        client.on("ready", () => {
            console.log("🚀 [Dragonfly] Ready");
        });

        client.on("error", (err: Error) => {
            isConnected = false;
            if (!hasLoggedError) {
                console.warn(`⚠️ [Dragonfly] ${err.message}`);
                hasLoggedError = true;
            }
        });

        client.on("close", () => {
            isConnected = false;
        });

        // Attempt connection but don't block startup
        client.connect().catch(() => {
            // Error handler above will log this
        });

        return client;
    } catch (err) {
        console.warn("⚠️ [Dragonfly] Failed to create client:", err);
        return null;
    }
}

// Use global singleton to survive HMR in development
export const dragonfly: Dragonfly | null = globalForDragonfly.dragonfly ?? createDragonflyClient();
if (process.env.NODE_ENV !== "production") globalForDragonfly.dragonfly = dragonfly;

/** Check if Dragonfly is currently connected and usable */
export function isDragonflyAvailable(): boolean {
    return dragonfly !== null && (dragonfly.status === "ready" || dragonfly.status === "connect");
}

// ---------------------------------------------------------------------------
// SEC-5 FIX: In-memory rate limit fallback when Redis is unavailable
// Uses a simple sliding window counter stored in a Map with TTL-based cleanup.
// This prevents unlimited AI API calls (cost amplification) when Redis is down.
// ---------------------------------------------------------------------------

interface InMemoryWindow {
    count: number;
    expiresAt: number;
}

const _inMemoryLimits = new Map<string, InMemoryWindow>();
const _CLEANUP_INTERVAL = 60_000; // Clean up expired entries every 60s
let _lastCleanup = Date.now();

function inMemoryRateCheck(key: string, limit: number, windowMs: number): { success: boolean; remaining: number } {
    const now = Date.now();

    // Periodic cleanup to prevent memory leaks
    if (now - _lastCleanup > _CLEANUP_INTERVAL) {
        _lastCleanup = now;
        for (const [k, v] of _inMemoryLimits) {
            if (v.expiresAt < now) _inMemoryLimits.delete(k);
        }
    }

    const existing = _inMemoryLimits.get(key);
    if (!existing || existing.expiresAt < now) {
        _inMemoryLimits.set(key, { count: 1, expiresAt: now + windowMs });
        return { success: true, remaining: limit - 1 };
    }

    existing.count++;
    if (existing.count > limit) {
        return { success: false, remaining: 0 };
    }
    return { success: true, remaining: limit - existing.count };
}

// ---------------------------------------------------------------------------
// Rate limiting — Lua-based atomic counter
// ---------------------------------------------------------------------------

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

export async function checkRateLimit(
    workspaceId: string,
    limit: number,
): Promise<{ success: boolean; remaining: number }> {
    try {
        if (!dragonfly || !isConnected) {
            // SEC-5 FIX: Use in-memory fallback instead of failing open
            console.warn("Dragonfly not connected, using in-memory rate limit fallback.");
            return inMemoryRateCheck(`ratelimit:${workspaceId}`, limit, 60_000);
        }

        const now = new Date();
        const minuteKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}:${now.getUTCHours()}:${now.getUTCMinutes()}`;
        const key = `ratelimit:${workspaceId}:${minuteKey}`;

        const result = (await dragonfly.eval(RATE_LIMIT_LUA, 1, key, limit, 60)) as [number, number];

        return {
            success: result[0] === 1,
            remaining: result[1],
        };
    } catch (error) {
        console.warn("Dragonfly rate limit check failed, using in-memory fallback:", error);
        return inMemoryRateCheck(`ratelimit:${workspaceId}`, limit, 60_000);
    }
}

export async function checkOutboundRateLimit(workspaceId: string): Promise<boolean> {
    const key = `rate_limit:outbound:${workspaceId}`;
    const windowSeconds = 5;
    const maxRequests = 5;

    try {
        if (!dragonfly || !isConnected) {
            // SEC-5 FIX: In-memory fallback
            return inMemoryRateCheck(key, maxRequests, windowSeconds * 1000).success;
        }
        const requests = await dragonfly.incr(key);
        if (requests === 1) {
            await dragonfly.expire(key, windowSeconds);
        }
        return requests <= maxRequests;
    } catch (e) {
        console.error("Rate Limit Error, using in-memory fallback:", e);
        return inMemoryRateCheck(key, maxRequests, windowSeconds * 1000).success;
    }
}

/** Check if an end-user is spamming the webhook endpoint (max 15 messages/minute per user per workspace) */
export async function checkInboundRateLimit(workspaceId: string, authorId: string): Promise<boolean> {
    const key = `rate_limit:inbound:${workspaceId}:${authorId}`;
    const windowSeconds = 60;
    const maxRequests = 15;

    try {
        if (!dragonfly || !isConnected) {
            // SEC-5 FIX: In-memory fallback
            return inMemoryRateCheck(key, maxRequests, windowSeconds * 1000).success;
        }
        const requests = await dragonfly.incr(key);
        if (requests === 1) {
            await dragonfly.expire(key, windowSeconds);
        }
        return requests <= maxRequests;
    } catch (e) {
        console.error("Inbound Rate Limit Error, using in-memory fallback:", e);
        return inMemoryRateCheck(key, maxRequests, windowSeconds * 1000).success;
    }
}

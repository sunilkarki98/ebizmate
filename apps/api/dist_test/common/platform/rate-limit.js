"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOutboundRateLimit = checkOutboundRateLimit;
const redis_1 = require("../utils/redis");
/**
 * Rate Limit Outbound Messages to avoid Platform Bans.
 * Algorithm: Token Bucket / Sliding Window via Redis.
 * Rule: Max 5 messages per 5 seconds per workspace (safe default).
 */
async function checkOutboundRateLimit(workspaceId) {
    if (!redis_1.redis)
        return true; // Fail open if Redis not connected (risky but better than blocking)
    const key = `rate_limit:outbound:${workspaceId}`;
    const windowSeconds = 5;
    const maxRequests = 5;
    try {
        // Increment count for this window
        const requests = await redis_1.redis.incr(key);
        if (requests === 1) {
            // Set expiry on first request
            await redis_1.redis.expire(key, windowSeconds);
        }
        if (requests > maxRequests) {
            console.warn(`[RateLimit] Workspace ${workspaceId} exceeded outbound limit.`);
            return false;
        }
        return true;
    }
    catch (e) {
        console.error("Rate Limit Error", e);
        return true; // Fail open
    }
}
//# sourceMappingURL=rate-limit.js.map
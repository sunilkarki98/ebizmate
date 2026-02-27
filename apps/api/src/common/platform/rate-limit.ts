
import { dragonfly } from "@ebizmate/shared";

/**
 * Rate Limit Outbound Messages to avoid Platform Bans.
 * Algorithm: Token Bucket / Sliding Window via Redis.
 * Rule: Max 5 messages per 5 seconds per workspace (safe default).
 */
export async function checkOutboundRateLimit(workspaceId: string): Promise<boolean> {
    if (!dragonfly) return true; // Fail open if Dragonfly not connected (risky but better than blocking)

    const key = `rate_limit:outbound:${workspaceId}`;
    const windowSeconds = 5;
    const maxRequests = 5;

    try {
        // Increment count for this window
        const requests = await dragonfly.incr(key);

        if (requests === 1) {
            // Set expiry on first request
            await dragonfly.expire(key, windowSeconds);
        }

        if (requests > maxRequests) {
            console.warn(`[RateLimit] Workspace ${workspaceId} exceeded outbound limit.`);
            return false;
        }

        return true;
    } catch (e) {
        console.error("Rate Limit Error", e);
        return true; // Fail open
    }
}

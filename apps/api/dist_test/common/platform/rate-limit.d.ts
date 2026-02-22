/**
 * Rate Limit Outbound Messages to avoid Platform Bans.
 * Algorithm: Token Bucket / Sliding Window via Redis.
 * Rule: Max 5 messages per 5 seconds per workspace (safe default).
 */
export declare function checkOutboundRateLimit(workspaceId: string): Promise<boolean>;
//# sourceMappingURL=rate-limit.d.ts.map
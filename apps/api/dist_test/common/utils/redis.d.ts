import Redis from "ioredis";
export declare const redis: Redis;
export declare function checkRateLimit(workspaceId: string, limit: number): Promise<{
    success: boolean;
    remaining: number;
}>;
//# sourceMappingURL=redis.d.ts.map
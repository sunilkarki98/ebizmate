import { NextResponse } from "next/server";
import { checkDbHealth } from "@ebizmate/db";
import { redis } from "@/lib/redis";

export async function GET() {
    const checks: Record<string, boolean> = {};

    // Database health
    checks.database = await checkDbHealth();

    // Redis health
    try {
        if (redis) {
            await redis.ping();
            checks.redis = true;
        } else {
            checks.redis = false;
        }
    } catch {
        checks.redis = false;
    }

    const healthy = Object.values(checks).every(Boolean);

    return NextResponse.json(
        {
            status: healthy ? "healthy" : "degraded",
            checks,
            timestamp: new Date().toISOString(),
        },
        { status: healthy ? 200 : 503 }
    );
}

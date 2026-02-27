import { NextResponse } from "next/server";
import { checkDbHealth } from "@ebizmate/db";

export async function GET() {
    const checks: Record<string, boolean> = {};

    // Database health
    checks["database"] = await checkDbHealth();

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

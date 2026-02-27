import { getBackendToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const token = await getBackendToken();
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ token });
    } catch (error) {
        return NextResponse.json({ error: "Failed to get token" }, { status: 500 });
    }
}

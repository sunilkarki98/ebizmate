import { NextResponse } from "next/server";
import { auth, getBackendToken } from "@/lib/auth";

// GET /api/auth/callback/[platform]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ platform: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.redirect(new URL("/signin", request.url));
    }

    const { platform } = await params;
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
        console.error(`OAuth error from ${platform}:`, error);
        return NextResponse.redirect(new URL(`/dashboard/connect?error=${error}`, request.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL(`/dashboard/connect?error=no_code`, request.url));
    }

    // Pass the authorization code to our NestJS backend to securely exchange for long-lived Access Tokens
    try {
        const backendUrl = process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001";
        const backendToken = await getBackendToken();

        const response = await fetch(`${backendUrl}/auth/social/callback`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${backendToken}`,
            },
            body: JSON.stringify({
                platform,
                code,
                redirectUri: `${process.env["NEXT_PUBLIC_APP_URL"]}/api/auth/callback/${platform}`
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Failed to exchange token");
        }

        return NextResponse.redirect(new URL("/dashboard/connect?success=true", request.url));
    } catch (err) {
        console.error(`Backend OAuth exchange failed for ${platform}:`, err);
        return NextResponse.redirect(new URL("/dashboard/connect?error=exchange_failed", request.url));
    }
}

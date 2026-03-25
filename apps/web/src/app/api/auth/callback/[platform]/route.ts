import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth, getBackendToken } from "@/lib/auth";
import { getNestApiBaseUrl } from "@/lib/nest-api-base";

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

    const cookieStore = await cookies();
    const expectedState = cookieStore.get("oauth_state")?.value;
    const returnedState = url.searchParams.get("state");
    if (expectedState && returnedState !== expectedState) {
        cookieStore.delete("oauth_state");
        return NextResponse.redirect(new URL(`/dashboard/connect?error=invalid_state`, request.url));
    }
    if (expectedState) {
        cookieStore.delete("oauth_state");
    }

    // Pass the authorization code to our NestJS backend to securely exchange for long-lived Access Tokens
    try {
        const backendUrl = getNestApiBaseUrl();
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

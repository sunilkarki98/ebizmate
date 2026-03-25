import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";

const META_PLATFORMS = new Set([
    "instagram",
    "messenger",
    "facebook",
    "facebook_pages",
    "whatsapp",
]);

function metaOAuthConfigured(): boolean {
    return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

function tiktokOAuthConfigured(): boolean {
    const key = process.env.TIKTOK_CLIENT_KEY || process.env.TIKTOK_APP_ID;
    const secret = process.env.TIKTOK_CLIENT_SECRET || process.env.TIKTOK_APP_SECRET;
    return !!(key && secret);
}

function allowMockConnect(): boolean {
    return (
        process.env.NODE_ENV !== "production" ||
        process.env.ENABLE_MOCK_SOCIAL_OAUTH === "true"
    );
}

// GET /api/auth/connect/[platform]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ platform: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.redirect(new URL("/signin", request.url));
    }

    const { platform: rawPlatform } = await params;
    const platform = rawPlatform.toLowerCase();

    const appBase =
        process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const redirectUri = `${appBase.replace(/\/$/, "")}/api/auth/callback/${platform}`;

    const cookieStore = await cookies();
    const state = randomUUID();
    cookieStore.set("oauth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600,
    });

    if (META_PLATFORMS.has(platform)) {
        if (metaOAuthConfigured()) {
            const scope =
                process.env.META_OAUTH_SCOPES ||
                "pages_messaging,pages_manage_metadata,business_management";
            const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
            authUrl.searchParams.set("client_id", process.env.META_APP_ID!);
            authUrl.searchParams.set("redirect_uri", redirectUri);
            authUrl.searchParams.set("scope", scope);
            authUrl.searchParams.set("response_type", "code");
            authUrl.searchParams.set("state", state);
            return NextResponse.redirect(authUrl.toString());
        }
        if (!allowMockConnect()) {
            return NextResponse.redirect(
                new URL(
                    "/dashboard/connect?error=oauth_not_configured",
                    request.url
                )
            );
        }
    } else if (platform === "tiktok") {
        if (tiktokOAuthConfigured()) {
            const clientKey =
                process.env.TIKTOK_CLIENT_KEY || process.env.TIKTOK_APP_ID!;
            const scope =
                process.env.TIKTOK_OAUTH_SCOPES ||
                "user.info.basic,video.list";
            const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
            authUrl.searchParams.set("client_key", clientKey);
            authUrl.searchParams.set("scope", scope);
            authUrl.searchParams.set("response_type", "code");
            authUrl.searchParams.set("redirect_uri", redirectUri);
            authUrl.searchParams.set("state", state);
            return NextResponse.redirect(authUrl.toString());
        }
        if (!allowMockConnect()) {
            return NextResponse.redirect(
                new URL(
                    "/dashboard/connect?error=oauth_not_configured",
                    request.url
                )
            );
        }
    } else {
        return NextResponse.redirect(
            new URL("/dashboard/connect?error=unsupported_platform", request.url)
        );
    }

    // Development / explicit mock: simulated provider redirect
    const mockAuthCode = `mock_${platform}_auth_code_${Date.now()}`;
    const callbackUrl = new URL(
        `/api/auth/callback/${platform}?code=${encodeURIComponent(mockAuthCode)}&state=${encodeURIComponent(state)}`,
        request.url
    );
    return NextResponse.redirect(callbackUrl);
}

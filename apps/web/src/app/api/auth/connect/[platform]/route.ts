import { NextResponse } from "next/server";
import { auth, getBackendToken } from "@/lib/auth";

// GET /api/auth/connect/[platform]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ platform: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.redirect(new URL("/signin", request.url));
    }

    const { platform } = await params;

    // In a real application, we would redirect to the actual OAuth provider URL.
    // e.g. for Meta: https://www.facebook.com/v19.0/dialog/oauth?client_id=...&redirect_uri=...
    // Since we don't have the APIs yet, we are simulating a successful OAuth callback 
    // to prove our internal architecture logic works correctly.

    // Simulate the OAuth provider redirecting back to our callback with a dummy authorization code
    const mockAuthCode = `mock_${platform}_auth_code_${Date.now()}`;
    const callbackUrl = new URL(`/api/auth/callback/${platform}?code=${mockAuthCode}`, request.url);

    return NextResponse.redirect(callbackUrl);
}

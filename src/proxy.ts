import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { updateSession } from "@/utils/supabase/middleware";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
    // 1. Admin Routes Protection (NextAuth)
    if (req.nextUrl.pathname.startsWith("/admin")) {
        const isLoggedIn = !!req.auth;
        const isLoginPage = req.nextUrl.pathname.startsWith("/admin/login");

        if (!isLoggedIn && !isLoginPage) {
            console.log("Middleware: Redirecting Unauthenticated Admin to /admin/login");
            return NextResponse.redirect(new URL("/admin/login", req.url));
        }

        if (isLoggedIn && isLoginPage) {
            return NextResponse.redirect(new URL("/admin", req.url));
        }

        // If authorized, just continue (default behavior)
        // We don't need Supabase session update for admin routes usually, 
        // but it doesn't hurt unless it causes issues. 
        // For now, let's keep them separate to avoid double-processing.
        return NextResponse.next();
    }

    // 2. User Routes Protection (Supabase)
    // Run Supabase middleware to refresh sessions and handle protection
    return await updateSession(req);
});

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api (API routes - handled individually or passed through)
         * - .png, .jpg, etc.
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
        process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // 1. Admin Routes: Handled by NextAuth (implied or explicit check if needed)
    // We skip Supabase logic for /admin to avoid redirect loops or conflicts
    if (request.nextUrl.pathname.startsWith('/admin')) {
        return supabaseResponse
    }

    // 2. Dashboard/User Routes
    // We do NOT strictly enforce redirects here to avoid loops with NextAuth.
    // The `DashboardLayout` in `src/app/dashboard/layout.tsx` handles access control
    // using the unified `auth()` helper which respects both Supabase and NextAuth.
    // This middleware's primary job is to ensure the Supabase session is refreshed.

    return supabaseResponse
}

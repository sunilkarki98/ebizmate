import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServerClient } from '@supabase/ssr'


export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/dashboard'
    const origin = requestUrl.origin

    if (code) {
        const cookieStore = await (await import('next/headers')).cookies()
        const supabase = createServerClient(
            process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
            process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch (error) {
                            // Valid catch for Server Components, but in Route Handler we usually want it to succeed.
                            // However, let's keep it safe.
                        }
                    },
                },
            }
        )
        const { error, data } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data?.user) {
            // SYNC USER TO DB
            const userId = data.user.id;
            const email = data.user.email!;
            const name = data.user.user_metadata["full_name"] || email.split("@")[0];

            try {
                // NEXT_PUBLIC_API_URL usually contains the /api prefix (e.g., http://localhost:3001/api)
                const backendUrl = process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api";
                const baseUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;

                const response = await fetch(`${baseUrl}/auth/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${data.session.access_token}`
                    },
                    body: JSON.stringify({
                        email: email,
                        name: name,
                        image: data.user.user_metadata["avatar_url"]
                    })
                });

                if (!response.ok) {
                    console.error("Callback Sync API Error:", await response.text());
                }
            } catch (err) {
                console.error("Callback Sync Error:", err);
            }

            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

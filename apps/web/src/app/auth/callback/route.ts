import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { db } from "@ebizmate/db";
import { users, workspaces } from "@ebizmate/db";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/dashboard'
    const origin = requestUrl.origin

    if (code) {
        const cookieStore = await (await import('next/headers')).cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
            const name = data.user.user_metadata.full_name || email.split("@")[0];

            try {
                // Check if profile exists
                const existing = await db.query.users.findFirst({
                    where: eq(users.id, userId)
                });

                if (!existing) {
                    await db.transaction(async (tx) => {
                        await tx.insert(users).values({
                            id: userId,
                            name,
                            email,
                            role: "user",
                            image: data.user.user_metadata.avatar_url,
                            emailVerified: new Date(),
                        });

                        await tx.insert(workspaces).values({
                            userId: userId,
                            name: `${name}'s Workspace`,
                            platform: "generic",
                        });
                    });
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

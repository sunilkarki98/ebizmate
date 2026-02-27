
import NextAuth, { type NextAuthConfig } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@ebizmate/db";
import { accounts, sessions, users, verificationTokens } from "@ebizmate/db";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";

import { authConfig } from "@/lib/auth.config";

const nextAuthConfig: NextAuthConfig = {
    ...authConfig,
    adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
    }),
    providers: [
        ...(process.env['GOOGLE_CLIENT_ID'] && process.env['GOOGLE_CLIENT_SECRET']
            ? [
                Google({
                    clientId: process.env['GOOGLE_CLIENT_ID'],
                    clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
                }),
            ]
            : []),
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const user = await db.query.users.findFirst({
                    where: eq(users.email, credentials.email as string),
                });

                if (!user || !user.password) {
                    return null;
                }

                const passwordsMatch = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (passwordsMatch) {
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        image: user.image,
                        role: user.role,
                    };
                }
                return null;
            },
        }),
    ],
    session: { strategy: "jwt" },
};

export const { handlers, auth: nextAuth, signIn, signOut } = NextAuth(nextAuthConfig);

// Unified Auth Helper
export async function auth(type: 'admin' | 'user' | 'any' = 'user') {
    // 1. Try NextAuth (Admin/High Privilege) - Prioritize this to prevent "User" session shadowing Admin
    if (type === 'admin' || type === 'any') {
        const nextAuthSession = await nextAuth();
        if (nextAuthSession?.user) {
            return nextAuthSession;
        }
    }

    // 2. Try Supabase (User)
    if (type === 'user' || type === 'any') {
        try {
            const supabase = await createClient();
            if (!supabase) return null;

            const { data: { user }, error } = await supabase.auth.getUser();

            if (error) {
                // console.error("Supabase Auth Error:", error.message);
            }

            if (user) {
                return {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.user_metadata['full_name'] || user.email?.split('@')[0],
                        image: user.user_metadata['avatar_url'],
                        role: "user",
                    },
                    expires: new Date(Date.now() + 3600 * 1000).toISOString(),
                };
            }
        } catch (e: any) {
            // Next.js throws a DYNAMIC_SERVER_USAGE error to opt out of static rendering.
            // We must rethrow it so Next.js can handle it, otherwise it clogs the build logs.
            if (e?.digest === 'DYNAMIC_SERVER_USAGE') {
                throw e;
            }
            console.error("Auth Exception:", e);
        }
    }

    return null;
}

import * as jwt from "jsonwebtoken";

// Fetches the raw JWT to send to the NestJS Backend API
export async function getBackendToken(): Promise<string | null> {
    const session = await auth('any');
    if (!session?.user) return null;

    const userRole = (session.user as any).role;

    // Supabase (Customer) -> Forward the original session token
    if (userRole !== 'admin') {
        const supabase = await createClient();
        if (supabase) {
            const { data } = await supabase.auth.getSession();
            if (data?.session?.access_token) return data.session.access_token;
        }
    }

    // NextAuth (Admin) -> Generating a synchronous bridging token using our matching secret
    if (userRole === 'admin') {
        const secret = process.env['NEXTAUTH_SECRET'] || process.env['AUTH_SECRET'];
        if (!secret) {
            throw new Error("NEXTAUTH_SECRET or AUTH_SECRET is required for admin token creation. Please set it in your environment variables.");
        }

        return jwt.sign(
            { sub: session.user.id, role: userRole, email: session.user.email },
            secret,
            { expiresIn: '1h' }
        );
    }

    return null;
}

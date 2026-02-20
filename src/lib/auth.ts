
import NextAuth, { type NextAuthConfig } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens, workspaces } from "@/db/schema";
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
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
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
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error) {
                // console.error("Supabase Auth Error:", error.message);
            }

            if (user) {
                return {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.user_metadata.full_name || user.email?.split('@')[0],
                        image: user.user_metadata.avatar_url,
                        role: "user",
                    },
                    expires: new Date(Date.now() + 3600 * 1000).toISOString(),
                };
            }
        } catch (e) {
            console.error("Auth Exception:", e);
        }
    }

    return null;
}

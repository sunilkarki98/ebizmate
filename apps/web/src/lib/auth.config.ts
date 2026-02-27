import type { NextAuthConfig } from "next-auth";

declare module "next-auth" {
    interface User {
        role?: string;
    }
    interface Session {
        user: User & { id?: string; role?: string };
    }
}

declare module "@auth/core/jwt" {
    interface JWT {
        role?: string;
        id?: string;
    }
}

export const authConfig = {
    pages: {
        signIn: "/admin/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token['role'] = user.role;
                token['id'] = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                const role = token['role'];
                const id = token['id'];
                if (typeof role === 'string') session.user.role = role;
                if (typeof id === 'string') session.user.id = id;
            }
            return session;
        },
    },
    providers: [], // Configured in auth.ts
} satisfies NextAuthConfig;


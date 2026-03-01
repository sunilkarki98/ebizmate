import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Sign In",
    description: "Sign in to your EbizMate dashboard to manage your AI sales assistant and monitor customer conversations.",
    robots: { index: false, follow: true },
    alternates: { canonical: "https://ebizmate.com/signin" },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
    return children;
}

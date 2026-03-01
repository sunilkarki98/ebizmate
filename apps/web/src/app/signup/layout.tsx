import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Sign Up",
    description: "Create your free EbizMate account and deploy an AI sales assistant for your Instagram, TikTok, WhatsApp, and Messenger in minutes.",
    robots: { index: false, follow: true },
    alternates: { canonical: "https://ebizmate.com/signup" },
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
    return children;
}

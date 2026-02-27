import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bot, Shield, FileText, Lock } from "lucide-react";
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "EbizMate Privacy Policy. Learn about how we handle your data, Meta (Instagram/Facebook) and TikTok integration compliance, and user rights.",
    alternates: {
        canonical: "https://ebizmate.com/privacy",
    }
};

export default function PrivacyPage() {
    return (
        <div className="flex min-h-screen flex-col font-sans">
            <header className="flex h-16 items-center justify-between border-b px-6 lg:px-12 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
                    <Bot className="h-6 w-6 text-primary" />
                    <span>EbizMate</span>
                </Link>
                <nav className="flex items-center gap-6">
                    <Link href="/about" className="text-sm font-medium hover:text-primary transition-colors">About</Link>
                    <Link href="/contact" className="text-sm font-medium hover:text-primary transition-colors">Contact</Link>
                    <div className="flex gap-4">
                        <Link href="/signin">
                            <Button variant="ghost">Log In</Button>
                        </Link>
                        <Link href="/dashboard">
                            <Button>Get Started</Button>
                        </Link>
                    </div>
                </nav>
            </header>

            <main className="flex-1 py-16 px-6 lg:px-12">
                <div className="max-w-4xl mx-auto space-y-12">
                    <div className="space-y-4">
                        <h1 className="text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
                        <p className="text-muted-foreground">Last Updated: February 2026</p>
                    </div>

                    <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 border-b pb-2">
                                <Shield className="h-6 w-6 text-primary" />
                                <h2 className="text-2xl font-bold m-0">1. Introduction</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                EbizMate ("we", "our", or "us") provides an AI orchestration platform to help merchants and creators manage customer interactions on social platforms. We are committed to protecting your privacy and ensuring transparency regarding how your data, and the data of your customers, is collected, used, and stored.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3 border-b pb-2">
                                <FileText className="h-6 w-6 text-primary" />
                                <h2 className="text-2xl font-bold m-0">2. Data We Collect from Social Platforms (Meta & TikTok)</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                When you connect your social media accounts (such as Instagram, Facebook Messenger, and TikTok) to EbizMate, our systems interact with their official APIs to provide our core automation services.
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                <li><strong>Messages and Comments:</strong> We collect and process inbound messages and comments sent to your connected social media profiles. This is strictly required to allow our AI to generate automated replies.</li>
                                <li><strong>Public User Information:</strong> We may access public profile information (such as usernames) of the individuals interacting with your page to provide context to the AI for personalized responses.</li>
                                <li><strong>Access Tokens:</strong> We securely store OAuth access tokens provided by Meta and TikTok. These tokens are used exclusively to authorize EbizMate to read messages and post replies on your behalf.</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3 border-b pb-2">
                                <Lock className="h-6 w-6 text-primary" />
                                <h2 className="text-2xl font-bold m-0">3. How We Use the Data</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                EbizMate processes this data solely for the purpose of providing the service you requested: automated customer support.
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                <li>The contents of external messages and comments are securely passed to Large Language Models (LLMs) to generate contextual replies.</li>
                                <li><strong>Crucial AI Data Policy:</strong> We <strong>do not</strong> use your private business data, nor your customers' messages, to train our own LLMs or public models. </li>
                                <li>We maintain a temporary cache of recent message history within your private workspace purely to allow the AI to maintain conversation context.</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3 border-b pb-2">
                                <h2 className="text-2xl font-bold m-0">4. Data Retention and Deletion</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                We retain personal information only for as long as necessary to provide our services.
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                <li>If you disconnect a social media account, the associated OAuth access tokens are immediately and permanently deleted from our databases.</li>
                                <li>You have the right to request a complete deletion of your workspace, which permanently scrubs all conversational histories, uploaded knowledge bases, and user data across our infrastructure.</li>
                                <li>To request data deletion, please contact us at <a href="mailto:privacy@ebizmate.com" className="text-primary hover:underline">privacy@ebizmate.com</a>. We comply with deletion requests within 30 days.</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3 border-b pb-2">
                                <h2 className="text-2xl font-bold m-0">5. Security</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                EbizMate employs strict organizational, technical, and physical security measures to protect your data. All interactions with our databases and third-party APIs occur over encrypted connections (HTTPS/TLS). Access tokens are securely encrypted at rest.
                            </p>
                        </section>

                        <section className="space-y-4 pt-6">
                            <p className="text-sm text-muted-foreground">
                                For any questions regarding this privacy policy or your rights, please reach out via our <Link href="/contact" className="text-primary hover:underline">Contact page</Link> or email us directly at privacy@ebizmate.com.
                            </p>
                        </section>
                    </div>
                </div>
            </main>

            <footer className="py-8 border-t bg-muted/20 text-center text-sm text-muted-foreground">
                <div className="flex justify-center gap-4 mb-4">
                    <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
                    <span>•</span>
                    <Link href="/about" className="hover:text-foreground">About Us</Link>
                    <span>•</span>
                    <Link href="/contact" className="hover:text-foreground">Contact</Link>
                </div>
                <p>&copy; {new Date().getFullYear()} EbizMate Inc. All rights reserved.</p>
            </footer>
        </div>
    );
}

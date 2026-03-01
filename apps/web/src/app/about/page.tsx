
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bot, Users, Target, Zap, Shield } from "lucide-react";
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "About Us",
    description: "Learn why EbizMate is democratizing enterprise-grade customer service and AI automation for every merchant and creator.",
    alternates: {
        canonical: "https://ebizmate.com/about",
    }
};

export default function AboutPage() {
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
                    <div className="flex gap-3 ml-4">
                        <Link href="/signin">
                            <Button variant="ghost" size="sm">Log In</Button>
                        </Link>
                        <Link href="/dashboard">
                            <Button size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">Get Started</Button>
                        </Link>
                    </div>
                </nav>
            </header>

            <main className="flex-1 py-20 px-6">
                <div className="max-w-4xl mx-auto space-y-12">
                    <div className="text-center space-y-6">
                        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Our Mission</h1>
                        <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                            To democratize enterprise-grade customer service for every merchant and creator.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <p className="text-muted-foreground leading-relaxed text-lg">
                                We noticed a massive gap in the market. Huge enterprise brands have armies of support agents monitoring their social media. Small businesses, boutique shops, and rising creators have... themselves, replying to DMs at 2 AM.
                                <br /><br />
                                We built EbizMate to level the playing field. It's an AI sales assistant that doesn't just "chat", but actually understands your business, replicates your brand voice, and personally guides customers to a sale.
                            </p>
                        </div>
                        <div className="bg-muted/30 p-8 rounded-3xl border shadow-sm h-full flex flex-col justify-center">
                            <ul className="space-y-8">
                                <li className="flex items-start gap-4">
                                    <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-full">
                                        <Zap className="h-6 w-6 text-violet-600 dark:text-violet-400 shrink-0" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">Instant Replies, Instant Sales</h3>
                                        <p className="text-muted-foreground leading-relaxed">Replying to a customer within 5 minutes increases conversion rates by up to 400%. EbizMate replies in seconds.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                                        <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">Custom, On-Brand Experience</h3>
                                        <p className="text-muted-foreground leading-relaxed">Whether you have 100 followers or 1,000,000. Every single comment gets a tailored, highly contextual response matching your voice.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                        <Shield className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">Accurate Prices, Every Time</h3>
                                        <p className="text-muted-foreground leading-relaxed">Our AI is strictly bound to your product catalog. It is structurally prevented from making up prices or fake promotions.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="py-8 border-t text-center text-sm text-muted-foreground">
                <div className="flex justify-center gap-4 mb-4">
                    <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
                    <span>•</span>
                    <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
                    <span>•</span>
                    <Link href="/about" className="hover:text-foreground">About Us</Link>
                    <span>•</span>
                    <Link href="/contact" className="hover:text-foreground">Contact</Link>
                </div>
                <p>&copy; {new Date().getFullYear()} EbizMate. All rights reserved.</p>
            </footer>
        </div>
    );
}

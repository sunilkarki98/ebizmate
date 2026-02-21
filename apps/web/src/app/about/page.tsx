
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bot, Users, Target, Zap } from "lucide-react";

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
                            <div className="p-3 bg-primary/10 w-fit rounded-xl text-primary">
                                <Target className="h-8 w-8" />
                            </div>
                            <h2 className="text-2xl font-bold">Why We Built EbizMate</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                We noticed a gap. Big brands have armies of support agents. Small businesses and creators have... themselves, replying at 2 AM.
                                <br /><br />
                                We built EbizMate to level the playing field. An AI that doesn't just "chat", but actually understands your inventory, your brand voice, and your goals.
                            </p>
                        </div>
                        <div className="bg-muted/30 p-8 rounded-3xl border">
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <Zap className="h-6 w-6 text-yellow-500 shrink-0" />
                                    <div>
                                        <h3 className="font-bold">Speed Matters</h3>
                                        <p className="text-sm text-muted-foreground">5 minute response times increase conversion by 400%.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Users className="h-6 w-6 text-blue-500 shrink-0" />
                                    <div>
                                        <h3 className="font-bold">Personalization at Scale</h3>
                                        <p className="text-sm text-muted-foreground">Treating 10,000 followers like 10,000 friends.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="py-8 border-t bg-muted/20 text-center text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} EbizMate Inc. All rights reserved.</p>
            </footer>
        </div>
    );
}

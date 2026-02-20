
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bot, Mail, MapPin, MessageSquare } from "lucide-react";

export default function ContactPage() {
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
                        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Contact Us</h1>
                        <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                            We'd love to hear from you.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-card border rounded-2xl p-8 space-y-6 shadow-sm">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold">Get in Touch</h3>
                                <p className="text-muted-foreground">For general inquiries and support.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-full text-primary">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <a href="mailto:support@ebizmate.com" className="font-medium hover:underline">support@ebizmate.com</a>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-full text-primary">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    <span className="text-muted-foreground">123 Innovation Drive, Tech City</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card border rounded-2xl p-8 space-y-6 shadow-sm">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold">Sales & Enterprise</h3>
                                <p className="text-muted-foreground">For custom plans and high-volume needs.</p>
                            </div>
                            <div className="space-y-4">
                                <Button className="w-full gap-2" size="lg">
                                    <MessageSquare className="h-4 w-4" /> Chat with Sales
                                </Button>
                                <p className="text-xs text-muted-foreground text-center">Typical response time: 1 hour</p>
                            </div>
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

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bot, FileText, Shield, Scale, AlertTriangle } from "lucide-react";
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Terms of Service — EbizMate",
    description: "EbizMate Terms of Service. Read our terms and conditions for using the EbizMate AI sales assistant platform.",
    alternates: {
        canonical: "https://ebizmate.com/terms",
    }
};

export default function TermsPage() {
    return (
        <div className="flex min-h-screen flex-col font-sans">
            <header className="flex h-16 items-center justify-between border-b px-6 lg:px-12 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
                    <div className="p-1.5 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg">
                        <Bot className="h-4 w-4 text-white" />
                    </div>
                    <span>EbizMate</span>
                </Link>
                <nav className="hidden md:flex items-center gap-6">
                    <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</Link>
                    <Link href="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
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

            <main className="flex-1 py-16 px-6 lg:px-12">
                <div className="max-w-4xl mx-auto space-y-12">
                    <div className="space-y-4">
                        <h1 className="text-4xl font-extrabold tracking-tight">Terms of Service</h1>
                        <p className="text-muted-foreground">Last Updated: February 2026</p>
                    </div>

                    <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 border-b pb-2">
                                <Scale className="h-6 w-6 text-violet-500" />
                                <h2 className="text-2xl font-bold m-0">1. Acceptance of Terms</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                By accessing or using EbizMate (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms. If you do not agree to these Terms, do not use the Service.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3 border-b pb-2">
                                <FileText className="h-6 w-6 text-violet-500" />
                                <h2 className="text-2xl font-bold m-0">2. Description of Service</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                EbizMate is an AI-powered sales assistant platform that integrates with social media platforms (including but not limited to Instagram, Facebook Messenger, TikTok, and WhatsApp) to automate customer interactions on your behalf. The Service includes:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                <li>Automated message responses using artificial intelligence</li>
                                <li>Product knowledge base management</li>
                                <li>Customer conversation tracking and analytics</li>
                                <li>AI-powered business coaching tools</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3 border-b pb-2">
                                <Shield className="h-6 w-6 text-violet-500" />
                                <h2 className="text-2xl font-bold m-0">3. Your Account</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                <li>Provide accurate and complete registration information</li>
                                <li>Notify us immediately of any unauthorized use of your account</li>
                                <li>Not share your account credentials with third parties</li>
                                <li>Be at least 18 years of age to create an account</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3 border-b pb-2">
                                <h2 className="text-2xl font-bold m-0">4. Acceptable Use</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                You agree not to use the Service to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                <li>Violate any applicable laws, regulations, or third-party rights</li>
                                <li>Send spam, unsolicited messages, or deceptive content</li>
                                <li>Impersonate any person or entity</li>
                                <li>Distribute malware, viruses, or other harmful software</li>
                                <li>Attempt to gain unauthorized access to our systems</li>
                                <li>Use the AI to generate illegal, harmful, or discriminatory content</li>
                                <li>Violate the terms of service of any connected social media platform</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3 border-b pb-2">
                                <h2 className="text-2xl font-bold m-0">5. AI-Generated Content</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                EbizMate uses large language models (LLMs) to generate automated responses. While we design our systems to be accurate and helpful:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                <li><strong>You are ultimately responsible</strong> for all messages sent through your connected accounts via EbizMate</li>
                                <li>AI-generated responses may occasionally contain inaccuracies. We recommend monitoring responses and maintaining human oversight</li>
                                <li>We do not guarantee that AI responses will result in sales or any specific business outcomes</li>
                                <li>You should review and update your product knowledge base regularly to ensure accuracy</li>
                            </ul>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3 border-b pb-2">
                                <h2 className="text-2xl font-bold m-0">6. Intellectual Property</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                You retain ownership of all content you upload to EbizMate (products, FAQs, brand guidelines, etc.). By using the Service, you grant us a limited license to use this content solely to provide the Service. We do not claim ownership of your data or use it to train public AI models.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3 border-b pb-2">
                                <h2 className="text-2xl font-bold m-0">7. Third-Party Platforms</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                EbizMate integrates with third-party platforms (Meta, TikTok, etc.). Your use of these platforms is governed by their respective terms of service and privacy policies. We are not responsible for changes to third-party APIs, platform policies, or service interruptions caused by external platforms.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3 border-b pb-2">
                                <AlertTriangle className="h-6 w-6 text-violet-500" />
                                <h2 className="text-2xl font-bold m-0">8. Limitation of Liability</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                TO THE MAXIMUM EXTENT PERMITTED BY LAW, EBIZMATE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR RELATING TO YOUR USE OF THE SERVICE.
                            </p>
                            <p className="text-muted-foreground leading-relaxed">
                                Our total liability for any claims arising under these Terms shall not exceed the amount you paid us in the twelve (12) months preceding the claim.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3 border-b pb-2">
                                <h2 className="text-2xl font-bold m-0">9. Termination</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                Either party may terminate your account at any time. Upon termination, your right to use the Service ceases immediately. We may retain certain data as required by law or legitimate business interests, but will delete your workspace data upon request in accordance with our <Link href="/privacy" className="text-violet-500 hover:underline">Privacy Policy</Link>.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-3 border-b pb-2">
                                <h2 className="text-2xl font-bold m-0">10. Changes to These Terms</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                We may update these Terms from time to time. We will notify you of material changes by posting the updated Terms on the Service and updating the &quot;Last Updated&quot; date. Your continued use of the Service after such changes constitutes acceptance of the revised Terms.
                            </p>
                        </section>

                        <section className="space-y-4 pt-6">
                            <p className="text-sm text-muted-foreground">
                                If you have any questions about these Terms, please contact us via our <Link href="/contact" className="text-violet-500 hover:underline">Contact page</Link> or email us at legal@ebizmate.com.
                            </p>
                        </section>
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

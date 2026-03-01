
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, MessageSquare, ShieldCheck, TrendingUp, Users, ShoppingBag, Zap, BarChart3, Clock, Star, CheckCircle2, Sparkles } from "lucide-react";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "EbizMate — Automate the Repetitive 80% of Your DMs",
  description: "EbizMate is an AI assistant that handles your repetitive Instagram, TikTok, WhatsApp, and Messenger DMs, letting you focus on the conversations that matter.",
  alternates: {
    canonical: "https://ebizmate.com",
  }
};

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "EbizMate",
    "operatingSystem": "WebBrowser",
    "applicationCategory": "BusinessApplication",
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "USD"
    },
    "description": "AI assistant for e-commerce and services. Automatically handles repetitive DMs on Instagram, TikTok, WhatsApp, and Messenger, and escalates complex queries to humans.",
    "creator": {
      "@type": "Organization",
      "name": "EbizMate",
      "url": "https://ebizmate.com"
    }
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does EbizMate work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Connect your social accounts. EbizMate reads your posts and learns your products. It then handles the repetitive FAQs instantly, while smoothly escalating complex questions to you."
        }
      },
      {
        "@type": "Question",
        "name": "Does EbizMate make up prices or product details?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. EbizMate only quotes your exact prices and product details. If a customer asks something outside its knowledge base, it won't guess—it escalates the conversation to a human."
        }
      },
      {
        "@type": "Question",
        "name": "Who is EbizMate for?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "EbizMate is built for online sellers, service providers (salons, consultants, coaches), and content creators who receive customer inquiries via social media DMs and want to respond instantly without hiring a support team."
        }
      },
      {
        "@type": "Question",
        "name": "How long does it take to set up?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "About 5 minutes. Connect your social accounts, and EbizMate automatically learns from your existing posts. No coding, no training manuals, no complex configuration required."
        }
      },
      {
        "@type": "Question",
        "name": "Is EbizMate free to try?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. EbizMate offers a free trial with no credit card required. You can start automating your DMs immediately and upgrade when you're ready to scale."
        }
      }
    ]
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "EbizMate",
    "url": "https://ebizmate.com",
    "logo": "https://ebizmate.com/og-image.png",
    "sameAs": [
      "https://twitter.com/ebizmate"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "support@ebizmate.com",
      "contactType": "customer service"
    }
  };

  return (
    <div className="flex min-h-screen flex-col font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />

      {/* Navigation */}
      <header className="flex h-16 items-center justify-between border-b border-white/10 px-6 lg:px-12 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
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
              <Button size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25">
                Start Free
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">

        {/* ── Hero Section ── */}
        <section className="relative py-20 lg:py-28 px-6 text-center overflow-hidden">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-violet-50/50 via-transparent to-transparent dark:from-violet-950/20 dark:via-transparent" />
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-400/10 rounded-full blur-3xl" />

          <div className="relative space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 dark:bg-violet-900/30 px-4 py-1.5 text-sm text-violet-700 dark:text-violet-300 font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              Built for high-volume Instagram & WhatsApp Accounts
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl text-balance leading-[1.1]">
              Automate the repetitive 80%,{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                ping your phone for the rest.
              </span>
            </h1>

            <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed">
              EbizMate handles the FAQs instantly, capturing leads while you sleep, and smoothly hands off the chat to you the second things get complex.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              <Link href="/dashboard">
                <Button size="lg" className="h-12 px-8 text-base gap-2 w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25">
                  Start for Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base w-full sm:w-auto">
                  See How It Works
                </Button>
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex flex-wrap justify-center gap-8 pt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Set up in 5 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Works on 5 platforms</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── The Problem / Solution ── */}
        <section className="py-16 px-6 border-y bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-3">
                Stop drowning in repetitive messages
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Customers ask the same five questions every day. EbizMate handles the noise so you only step in when your personal touch is actually needed.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <ProblemSolutionCard
                problem="Delayed Replies"
                solution="Instant AI screening 24/7"
                description="EbizMate answers basic questions instantly, sharing details and links, and prepares the customer for a human if things get complex."
                icon={<Clock className="h-6 w-6" />}
                gradient="from-rose-500 to-orange-500"
              />
              <ProblemSolutionCard
                problem="Endless Data Entry"
                solution="Learns from your posts"
                description="We don't ask you to build complex decision trees. EbizMate securely learns from your existing Instagram and TikTok posts to build its knowledge."
                icon={<Zap className="h-6 w-6" />}
                gradient="from-violet-500 to-indigo-500"
              />
              <ProblemSolutionCard
                problem="Bot Frustration"
                solution="Flawless human handoff"
                description="We know AI isn't perfect. When a conversation gets nuanced or an edge-case arises, EbizMate smoothly escalates the chat directly to you."
                icon={<TrendingUp className="h-6 w-6" />}
                gradient="from-emerald-500 to-teal-500"
              />
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-3">
                Up and running in 3 simple steps
              </h2>
              <p className="text-muted-foreground text-lg">No code. No hiring. No training manuals.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <StepCard
                step={1}
                title="Connect your accounts"
                description="Link your Instagram, TikTok, WhatsApp, or Messenger in one click. We handle all the technical stuff."
              />
              <StepCard
                step={2}
                title="It learns automatically"
                description="EbizMate reads your posts and extracts everything — products, services, prices, offers. It builds its own knowledge base from your content."
              />
              <StepCard
                step={3}
                title="Only step in when needed"
                description="We ping you the exact moment the conversation requires a human—you take over gracefully without missing a beat."
              />
            </div>
          </div>
        </section>

        {/* ── What Makes Us Different ── */}
        <section className="py-16 px-6 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-3">Built for the reality of social commerce</h2>
              <p className="text-muted-foreground text-lg">We don't overpromise. Here is exactly what our AI is built to do securely.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ValueCard
                icon={<ShoppingBag className="h-5 w-5" />}
                title="Shares what you sell"
                description="Products, services, pricing — shared directly in the conversation like a virtual sales assistant who knows your catalog."
                accentColor="text-violet-500"
              />
              <ValueCard
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Strict knowledge limits"
                description="Only quotes your exact prices and product details. If it doesn&apos;t explicitly know the answer, it escalates to you. It does not guess."
                accentColor="text-emerald-500"
              />
              <ValueCard
                icon={<MessageSquare className="h-5 w-5" />}
                title="Consistent, not magical"
                description="Provides polite, consistent, and accurate responses. We focus on utility over pretending to be a human."
                accentColor="text-blue-500"
              />
              <ValueCard
                icon={<Users className="h-5 w-5" />}
                title="Remembers every customer"
                description="Tracks conversations, purchase history, and preferences to personalize every interaction."
                accentColor="text-amber-500"
              />
              <ValueCard
                icon={<BarChart3 className="h-5 w-5" />}
                title="Smart escalation"
                description="Recognizes when it's out of its depth. Automatically routes complex questions to you with full context."
                accentColor="text-rose-500"
              />
              <ValueCard
                icon={<Bot className="h-5 w-5" />}
                title="Your private AI coach"
                description="Get strategic advice, campaign ideas, and business insights from your personal AI coach in the dashboard."
                accentColor="text-indigo-500"
              />
            </div>
          </div>
        </section>

        {/* ── Who It's For ── */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-3">Perfect for</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <AudienceCard
                emoji="🛍️"
                title="E-commerce Brands"
                description="Stop losing sales because nobody was awake to answer 'how long is shipping to Texas?' at 2 AM."
              />
              <AudienceCard
                emoji="✂️"
                title="Salons & Services"
                description="Let EbizMate answer 'how much is a balayage?' and 'are you open on Sunday?' while your hands are full with a client."
              />
              <AudienceCard
                emoji="📱"
                title="Agencies"
                description="Handle the Level 1 DMs for your entire client roster from a single dashboard, scaling your offer overnight."
              />
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="py-16 px-6 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-3">Businesses love EbizMate</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <TestimonialCard
                quote="I used to spend 3 hours a day replying to 'Price?' comments. Now I just look at the dashboard and jump in when someone is actually ready to buy."
                author="Sarah J."
                role="Boutique Owner"
              />
              <TestimonialCard
                quote="The handoff feature is what sold us. Our clients were terrified of bots ruining their brand image, but the AI stops right when it's supposed to."
                author="Elena R."
                role="Agency Director"
              />
              <TestimonialCard
                quote="I'm a photographer and I can't reply to DMs during a shoot. EbizMate screens the tire-kickers and sends the hot leads straight to my WhatsApp."
                author="Mike T."
                role="Wedding Photographer"
              />
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
          <div className="relative max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Take back control of your DMs
            </h2>
            <p className="text-xl text-white/80">
              Start your free trial today. No credit card. No contracts.
            </p>
            <div className="flex justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="h-12 px-10 text-base font-semibold bg-white text-violet-700 hover:bg-white/90 shadow-xl">
                  Get Started Free <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="py-10 border-t bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <div className="flex items-center gap-2 font-bold text-lg mb-2">
                <div className="p-1.5 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <span>EbizMate</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                The AI assistant that handles your repetitive DMs so you can focus on the business.
              </p>
            </div>
            <div className="flex gap-12">
              <div>
                <p className="font-semibold text-sm mb-3">Product</p>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
                  <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
                  <Link href="/signin" className="hover:text-foreground transition-colors">Log In</Link>
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm mb-3">Legal</p>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                  <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} EbizMate. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Component Definitions ── */

function ProblemSolutionCard({ problem, solution, description, icon, gradient }: {
  problem: string; solution: string; description: string; icon: React.ReactNode; gradient: string;
}) {
  return (
    <div className="relative p-6 rounded-2xl bg-background border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
      <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white mb-4`}>
        {icon}
      </div>
      <p className="text-sm font-medium text-muted-foreground line-through decoration-rose-400 mb-1">{problem}</p>
      <h3 className="text-lg font-bold mb-2">{solution}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="relative p-6 rounded-2xl bg-background border shadow-sm text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-bold text-sm mb-4">
        {step}
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function ValueCard({ icon, title, description, accentColor }: {
  icon: React.ReactNode; title: string; description: string; accentColor: string;
}) {
  return (
    <div className="p-5 rounded-xl border bg-card hover:border-violet-200 dark:hover:border-violet-800 transition-all duration-300 hover:shadow-sm group">
      <div className={`p-2 rounded-lg bg-muted w-fit mb-3 ${accentColor} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="font-bold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function AudienceCard({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div className="p-5 rounded-xl border bg-card text-center hover:border-violet-200 dark:hover:border-violet-800 transition-all duration-300 hover:shadow-sm">
      <div className="text-3xl mb-3">{emoji}</div>
      <h3 className="font-bold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function TestimonialCard({ quote, author, role }: { quote: string; author: string; role: string }) {
  return (
    <div className="p-6 rounded-2xl bg-card border shadow-sm">
      <div className="flex gap-1 mb-4 text-amber-500">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-current" />
        ))}
      </div>
      <p className="text-muted-foreground mb-6 leading-relaxed text-sm">&quot;{quote}&quot;</p>
      <div>
        <p className="font-bold text-sm">{author}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}


import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, MessageSquare, ShieldCheck, TrendingUp, Users, ShoppingBag, Mail, MapPin, Star } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col font-sans">
      {/* Navigation */}
      <header className="flex h-16 items-center justify-between border-b px-6 lg:px-12 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <Bot className="h-6 w-6 text-primary" />
          <span>EbizMate</span>
        </div>
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

      <main className="flex-1">
        {/* Hero Section - Compact Spacing */}
        <section className="relative py-12 lg:py-20 px-6 text-center space-y-6 max-w-5xl mx-auto overflow-hidden">
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm text-primary font-medium mb-2">
              New: AI-Powered CSR 🚀
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl text-balance leading-tight">
              The AI Partner for <br />
              <span className="text-primary bg-clip-text">Modern E-Business</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              <span className="text-primary font-bold">EbizMate</span> isn't just a chatbot. It's a CSR, sales rep, and brand ambassador—working 24/7 on social media.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <Link href="/dashboard">
              <Button size="lg" className="h-12 px-8 text-lg gap-2 w-full sm:w-auto shadow-lg shadow-primary/20">
                Start Your Free Trial <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="h-12 px-8 text-lg w-full sm:w-auto">
                See How It Works
              </Button>
            </Link>
          </div>
        </section>

        {/* Benefits / Differentiators - Reduced Height */}
        <section id="features" className="py-12 px-6 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight mb-2">Why Businesses Trust EbizMate</h2>
              <p className="text-muted-foreground text-lg">We don't just reply. We sell, schedule, and solve.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <FeatureCard
                icon={<ShoppingBag className="h-8 w-8 text-blue-500" />}
                title="Context-Aware Sales"
                description="Post a video of your product and service you offer and EbizMate will handle your customers queries and sales."
              />
              <FeatureCard
                icon={<TrendingUp className="h-8 w-8 text-green-500" />}
                title="Viral Growth Engine"
                description="The algorithm loves engagement. EbizMate replies to thousands of comments instantly, keeping your content at the top of the feed."
              />
              <FeatureCard
                icon={<ShieldCheck className="h-8 w-8 text-purple-500" />}
                title="Brand Voice Guardian"
                description="Define your specific Tone of Voice (e.g., 'Luxury', 'Friendly'). EbizMate ensures every reply perfectly matches your brand identity."
              />
            </div>
          </div>
        </section>

        {/* Use Cases - Compact Grid */}
        <section className="py-12 px-6 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Who is EbizMate For?</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <UseCaseCard
                title="Merchants"
                icon={<ShoppingBag className="h-5 w-5" />}
                items={["Auto-reply to price inquiries", "Recover abandoned carts via DM", "24/7 Order status support"]}
              />
              <UseCaseCard
                title="Creators"
                icon={<Users className="h-5 w-5" />}
                items={["Engage with every fan", "Filter spam & hate comments", "Boost algorithm visibility"]}
              />
              <UseCaseCard
                title="Service Pros"
                icon={<MessageSquare className="h-5 w-5" />}
                items={["Book appointments via DM", "Answer 'Where are you located?'", "Qualify leads automatically"]}
              />
            </div>
          </div>
        </section>

        {/* CTA - Condensed */}
        <section className="py-16 px-6 bg-primary text-primary-foreground text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Ready to Automate Your Growth?</h2>
            <p className="text-xl opacity-90">Join the smart businesses using EbizMate to scale your social presence.</p>
            <div className="flex justify-center">
              <Link href="/dashboard">
                <Button size="lg" variant="secondary" className="h-12 px-10 text-lg font-semibold text-primary">
                  Get Started Now
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight mb-2">Loved by Merchants & Creators</h2>
              <p className="text-muted-foreground text-lg">See how EbizMate helps businesses grow.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <TestimonialCard
                quote="I used to spend 3 hours a day replying to 'Price?' comments. EbizMate does it instantly and actually closes sales."
                author="Sarah J."
                role="Boutique Owner"
              />
              <TestimonialCard
                quote="The engagement boost is insane. My videos are hitting the For You page way more often because the comments are active 24/7."
                author="Mike T."
                role="Content Creator (500k+)"
              />
              <TestimonialCard
                quote="Finally, an AI that doesn't sound like a robot. It learned our brand voice perfectly. Highly recommended for agencies."
                author="Elena R."
                role="Marketing Director"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t bg-background">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Bot className="h-5 w-5 text-primary" />
            <span>EbizMate</span>
          </div>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} EbizMate Inc. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-primary">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-background border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      <div className="mb-4 p-2.5 bg-muted/50 rounded-xl w-fit">{icon}</div>
      <h3 className="text-xl font-bold mb-2 tracking-tight">{title}</h3>
      <p className="text-muted-foreground leading-relaxed text-sm">{description}</p>
    </div>
  );
}

function UseCaseCard({ title, icon, items }: { title: string, icon: React.ReactNode, items: string[] }) {
  return (
    <div className="p-6 rounded-xl border bg-card text-card-foreground hover:border-primary/50 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-muted-foreground text-sm">
            <ArrowRight className="h-3.5 w-3.5 mt-1 text-primary shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TestimonialCard({ quote, author, role }: { quote: string, author: string, role: string }) {
  return (
    <div className="p-6 rounded-2xl bg-card border shadow-sm">
      <div className="flex gap-1 mb-4 text-amber-500">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-current" />
        ))}
      </div>
      <p className="text-muted-foreground mb-6 leading-relaxed">"{quote}"</p>
      <div>
        <p className="font-bold">{author}</p>
        <p className="text-sm text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}

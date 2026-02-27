
import Link from "next/link";
import { LayoutDashboard, Users, MessageSquare, BookOpen, Settings, ArrowRight, Sparkles, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";

const userLinks = [
    { href: "/dashboard/coach", label: "AI Coach", icon: Sparkles },
    { href: "/dashboard/knowledge", label: "Knowledge Base", icon: BookOpen },
    { href: "/dashboard/interactions", label: "Interactions", icon: MessageSquare },
    { href: "/dashboard/customers", label: "Customers", icon: Users },
    { href: "/dashboard/connect", label: "Connect Social", icon: Share2 },
    { href: "/dashboard/overview", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export async function SidebarUser({ className }: { className?: string }) {
    const session = await auth();

    return (
        <div className={cn("pb-12 w-64 border-r min-h-screen bg-background", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-bold tracking-tight text-primary flex items-center gap-2">
                        <Sparkles className="h-4 w-4" /> EbizMate
                    </h2>
                    <div className="space-y-1">
                        {userLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-accent hover:text-accent-foreground"
                                )}
                            >
                                <link.icon className="h-4 w-4" />
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

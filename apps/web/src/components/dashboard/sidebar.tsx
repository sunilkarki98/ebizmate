
import Link from "next/link";
import { Package, MessageSquare, Settings, LayoutDashboard, Users, BarChart3, Building2, AlertTriangle, Webhook, ScrollText, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";

const userLinks = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/items", label: "Items", icon: Package },
    { href: "/dashboard/interactions", label: "Interactions", icon: MessageSquare },
    { href: "/dashboard/customers", label: "Customers", icon: Users },
];

const adminLinks = [
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/users", label: "Users", icon: Shield },
    { href: "/dashboard/workspaces", label: "Workspaces", icon: Building2 },
    { href: "/dashboard/escalations", label: "Escalations", icon: AlertTriangle },
    { href: "/dashboard/webhooks", label: "Webhooks", icon: Webhook },
    { href: "/dashboard/audit", label: "Audit Log", icon: ScrollText },
    { href: "/dashboard/settings", label: "AI Settings", icon: Settings },
];

export async function Sidebar({ className }: { className?: string }) {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    const isAdmin = role === "admin";

    return (
        <div className={cn("pb-12 w-64 border-r min-h-screen", className)}>
            <div className="space-y-4 py-4">
                {isAdmin && (
                    <div className="px-3 py-2">
                        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                            Platform Admin
                        </h2>
                        <div className="space-y-1">
                            {adminLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="flex items-center rounded-md px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                                >
                                    <link.icon className="mr-2 h-4 w-4" />
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <div className="px-3 py-2">
                    <h2 className={`mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${isAdmin ? "mt-4" : ""}`}>
                        {isAdmin ? "My Workspace" : "SaaS Bot"}
                    </h2>
                    <div className="space-y-1">
                        {userLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="flex items-center rounded-md px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                            >
                                <link.icon className="mr-2 h-4 w-4" />
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

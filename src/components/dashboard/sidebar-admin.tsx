
import Link from "next/link";
import { Settings, BarChart3, Building2, AlertTriangle, Webhook, ScrollText, Shield, ArrowLeft, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const adminLinks = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Shield },
    { href: "/admin/workspaces", label: "Workspaces", icon: Building2 },
    { href: "/admin/escalations", label: "Escalations", icon: AlertTriangle },
    { href: "/admin/webhooks", label: "Webhooks", icon: Webhook },
    { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
    { href: "/admin/settings", label: "AI Settings", icon: Settings },
];

export function SidebarAdmin({ className }: { className?: string }) {
    return (
        <div className={cn("pb-12 w-64 border-r min-h-screen bg-background", className)}>
            <div className="space-y-4 py-4">
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


            </div>
        </div>
    );
}

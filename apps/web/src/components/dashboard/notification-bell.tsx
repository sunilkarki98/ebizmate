"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Package, AlertTriangle, Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { getNotificationsAction, type SystemNotification } from "@/lib/notification-actions";
import Link from "next/link";
import { toast } from "sonner";

function timeAgo(date: Date | null): string {
    if (!date) return "";
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

const typeIcons: Record<string, typeof Bell> = {
    ingestion: Package,
    escalation: AlertTriangle,
    system: Info,
};

const typeColors: Record<string, string> = {
    ingestion: "text-blue-500",
    escalation: "text-amber-500",
    system: "text-muted-foreground",
};

export function NotificationBell() {
    const [notifications, setNotifications] = useState<SystemNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const result = await getNotificationsAction(15);
            setNotifications(result.notifications);

            // If we have more unread notifications than before, trigger a toast!
            if (result.unreadCount > unreadCount && result.notifications.length > 0) {
                const latest = result.notifications[0];
                if (latest) {
                    toast(latest.title, {
                        description: latest.message.substring(0, 100) + "...",
                        icon: latest.type === "escalation" ? "🚨" : "🔔",
                    });
                }
            }

            setUnreadCount(result.unreadCount);
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        }
    }, [unreadCount]);

    // Set up Server-Sent Events (SSE) for real-time push notifications
    useEffect(() => {
        let eventSource: EventSource | null = null;
        let reconnectDelay = 5000; // Start at 5s, grow to 30s max
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

        const connectSSE = async () => {
            try {
                const apiUrl = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';

                // Fetch JWT for SSE authentication
                const tokenRes = await fetch('/api/auth/token');
                if (!tokenRes.ok) {
                    console.warn("[SSE] Could not fetch auth token, skipping SSE connection");
                    // Retry with backoff
                    reconnectTimer = setTimeout(connectSSE, reconnectDelay);
                    reconnectDelay = Math.min(reconnectDelay * 2, 30000);
                    return;
                }
                const { token } = await tokenRes.json();

                eventSource = new EventSource(`${apiUrl}/notifications/stream?token=${token}`);

                eventSource.onopen = () => {
                    // Reset backoff on successful connection
                    reconnectDelay = 5000;
                };

                eventSource.onmessage = (event) => {
                    fetchNotifications();
                };

                eventSource.onerror = () => {
                    eventSource?.close();
                    eventSource = null;
                    // Reconnect with exponential backoff
                    reconnectTimer = setTimeout(connectSSE, reconnectDelay);
                    reconnectDelay = Math.min(reconnectDelay * 2, 30000);
                };
            } catch (err) {
                console.error("[SSE] Failed to setup:", err);
                reconnectTimer = setTimeout(connectSSE, reconnectDelay);
                reconnectDelay = Math.min(reconnectDelay * 2, 30000);
            }
        };

        connectSSE();

        return () => {
            if (eventSource) eventSource.close();
            if (reconnectTimer) clearTimeout(reconnectTimer);
        };
    }, [fetchNotifications]);

    // Fetch on mount and poll every 30 seconds as an offline fallback
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Mark as "seen" when dropdown opens
    const handleOpen = (open: boolean) => {
        setIsOpen(open);
        if (open) {
            // Clear unread badge when user opens the panel
            setUnreadCount(0);
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={handleOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold rounded-full"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {notifications.length > 0 && (
                        <Link
                            href="/dashboard/interactions"
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                        >
                            View all <ExternalLink className="h-3 w-3" />
                        </Link>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="max-h-[400px]">
                    {notifications.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            No notifications yet
                        </div>
                    ) : (
                        notifications.map((notification) => {
                            const Icon = typeIcons[notification.type] || Info;
                            const colorClass = typeColors[notification.type] || "";

                            // Extract a clean preview from the markdown response
                            const preview = notification.message
                                .replace(/\*\*/g, "")
                                .replace(/\n/g, " ")
                                .substring(0, 120);

                            return (
                                <DropdownMenuItem
                                    key={notification.id}
                                    className="flex items-start gap-3 p-3 cursor-pointer focus:bg-accent"
                                    asChild
                                >
                                    <Link
                                        href={
                                            notification.type === "escalation"
                                                ? `/dashboard/interactions${notification.originalInteractionId ? `?highlight=${notification.originalInteractionId}` : ""}`
                                                : "/dashboard/knowledge"
                                        }
                                    >
                                        <div className={`mt-0.5 shrink-0 ${colorClass}`}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-medium truncate">
                                                    {notification.title}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                                    {timeAgo(notification.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                {preview}...
                                            </p>
                                        </div>
                                    </Link>
                                </DropdownMenuItem>
                            );
                        })
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

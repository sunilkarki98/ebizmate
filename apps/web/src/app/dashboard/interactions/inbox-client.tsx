"use client";

import { useState, useRef, useEffect } from "react";
import { PlatformIcon } from "@/components/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
    MessageSquare, User, Bot, AlertTriangle, Archive, Send, Loader2, Sparkles, Image as ImageIcon, ExternalLink, Inbox
} from "lucide-react";

// Generates a beautiful, deterministic CSS gradient based on a string (customer name)
function stringToGradient(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c1 = `hsl(${hash % 360}, 80%, 75%)`;
    const c2 = `hsl(${(hash + 40) % 360}, 90%, 65%)`;
    return `linear-gradient(135deg, ${c1}, ${c2})`;
}

// Utility to safely extract thumbnail from webhook payload
function getPostThumbnailUrl(post: any) {
    if (!post || !post.meta) return null;
    return post.meta.cover_url || post.meta.thumbnail_url || post.meta.media_url || post.meta.image_url || post.meta.originalMediaUrl || null;
}

export default function InboxClient({ initialCustomers, workspace, backendToken }: any) {
    const [customers, setCustomers] = useState(initialCustomers);
    const [activeCustomer, setActiveCustomer] = useState<any | null>(null);
    const [loadingThread, setLoadingThread] = useState(false);
    const [thread, setThread] = useState<any[]>([]);
    const [replyText, setReplyText] = useState("");
    const [sending, setSending] = useState(false);
    const [filter, setFilter] = useState<"all" | "dms" | "comments" | "escalated">("all");

    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [thread]);

    const escalatedCount = customers.filter((c: any) => c.needsReviewCount > 0).length;

    const filteredCustomers = customers.filter((c: any) => {
        if (filter === "escalated") return c.needsReviewCount > 0;
        if (filter === "dms") return !c.latestMessagePreview?.toLowerCase().includes("comment");
        if (filter === "comments") return c.latestMessagePreview?.toLowerCase().includes("comment");
        return true;
    });

    const loadThread = async (c: any) => {
        setActiveCustomer(c);
        setLoadingThread(true);
        try {
            const res = await fetch(`${process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001'}/inbox/customer/${c.platformId}/conversation`, {
                headers: { "Authorization": `Bearer ${backendToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setThread(data.messages || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingThread(false);
        }
    };

    const toggleAiPause = async () => {
        if (!activeCustomer) return;
        const isCurrentlyPaused = activeCustomer.aiPaused;
        const action = isCurrentlyPaused ? "resume" : "pause";

        try {
            // Optimistic update
            setActiveCustomer({ ...activeCustomer, aiPaused: !isCurrentlyPaused });
            setCustomers(customers.map((c: any) => c.id === activeCustomer.id ? { ...c, aiPaused: !isCurrentlyPaused } : c));

            const res = await fetch(`${process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001'}/inbox/customer/${activeCustomer.id}/${action}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${backendToken}` }
            });

            // Reload thread to show the system interaction
            await loadThread(activeCustomer);
        } catch (e) {
            toast.error("Failed to toggle AI");
        }
    };

    const archiveCustomer = async () => {
        if (!activeCustomer) return;
        try {
            setCustomers(customers.filter((c: any) => c.id !== activeCustomer.id));
            setActiveCustomer(null);

            await fetch(`${process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001'}/inbox/customer/${activeCustomer.id}/archive`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${backendToken}` }
            });
            toast.success("Conversation archived");
        } catch (e) {
            toast.error("Failed to archive");
        }
    };

    const sendManualReply = async () => {
        if (!replyText.trim() || !activeCustomer) return;

        setSending(true);
        try {
            const res = await fetch(`${process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001'}/inbox/customer/${activeCustomer.id}/message`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${backendToken}` },
                body: JSON.stringify({ text: replyText })
            });

            if (res.ok) {
                setReplyText("");
                // Clear escalating state if any
                setCustomers(customers.map((c: any) => c.id === activeCustomer.id ? { ...c, needsReviewCount: 0 } : c));
                await loadThread(activeCustomer);
            } else {
                toast.error("Failed to send message");
            }
        } catch (e) {
            toast.error("Network error");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex h-full w-full bg-background/50 backdrop-blur-3xl">
            {/* LEFT SIDEBAR: Inboxes */}
            <div className="w-[320px] lg:w-[360px] xl:w-[400px] border-r border-border/40 flex flex-col bg-muted/5 shrink-0 transition-all duration-300">
                <div className="p-5 border-b border-border/40 bg-background/60 backdrop-blur-md sticky top-0 z-20">
                    <h2 className="font-bold text-xl flex items-center justify-between tracking-tight">
                        Interactions
                        <Badge variant="secondary" className="rounded-md px-2 py-0.5">{filteredCustomers.length}</Badge>
                    </h2>
                    <div className="flex gap-2 mt-4 bg-background p-1 rounded-lg border">
                        <Button
                            variant={filter === "all" ? "secondary" : "ghost"}
                            size="sm"
                            className="flex-1 text-sm h-8"
                            onClick={() => setFilter("all")}
                        >
                            All
                        </Button>
                        <Button
                            variant={filter === "dms" ? "secondary" : "ghost"}
                            size="sm"
                            className="flex-1 text-sm h-8"
                            onClick={() => setFilter("dms")}
                        >
                            DMs
                        </Button>
                        <Button
                            variant={filter === "comments" ? "secondary" : "ghost"}
                            size="sm"
                            className="flex-1 text-sm h-8"
                            onClick={() => setFilter("comments")}
                        >
                            Comments
                        </Button>
                    </div>
                    <div className="mt-2 text-right">
                        <Button
                            variant={filter === "escalated" ? "secondary" : "ghost"}
                            size="sm"
                            className={`text-sm h-8 ${escalatedCount > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}
                            onClick={() => setFilter("escalated")}
                        >
                            <AlertTriangle className="h-4 w-4 mr-1.5" /> Requires Action {escalatedCount > 0 && `(${escalatedCount})`}
                        </Button>
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    {filteredCustomers.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 opacity-70">
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <Inbox className="h-8 w-8 text-primary/60" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">You're all caught up! 🎉</h3>
                                <p className="text-xs text-muted-foreground mt-1">No pending customers in this view.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {filteredCustomers.map((c: any) => (
                                <button
                                    key={c.id}
                                    onClick={() => loadThread(c)}
                                    className={`w-full text-left p-4 hover:bg-muted/60 transition-all duration-200 border-l-[3px] ${activeCustomer?.id === c.id ? 'bg-muted/80 border-primary shadow-inner' : 'border-transparent'}`}
                                >
                                    <div className="flex gap-3 items-start mb-2">
                                        <div
                                            className="h-10 w-10 rounded-full flex flex-shrink-0 items-center justify-center text-sm font-bold text-white shadow-sm uppercase"
                                            style={{ background: stringToGradient(c.name || c.platformHandle || "Anonymous") }}
                                        >
                                            {(c.name || c.platformHandle || "?").substring(0, 2)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div className="font-semibold text-lg truncate flex items-center justify-between w-full">
                                                    <span className="truncate">{c.name || c.platformHandle || "Anonymous User"}</span>
                                                    <div className="text-xs text-muted-foreground font-medium whitespace-nowrap ml-2">
                                                        {new Date(c.lastInteractionAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <PlatformIcon platform={c.platform || workspace.platform} className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground truncate">@{c.platformHandle}</span>
                                                {c.needsReviewCount > 0 && (
                                                    <span className="flex items-center gap-1.5 ml-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 text-[10px] font-bold tracking-wide border border-red-500/20 w-fit">
                                                        <span className="relative flex h-1.5 w-1.5">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-600"></span>
                                                        </span>
                                                        ESCALATED
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed ml-13">
                                        {c.latestMessagePreview || "No message preview available..."}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* RIGHT SIDEBAR: Thread Viewer */}
            <div className="flex-1 flex flex-col bg-background/20 relative">
                {!activeCustomer ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-50">
                        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center">
                            <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium">Select a conversation from the sidebar</p>
                    </div>
                ) : (
                    <>
                        {/* Upper Header Nav */}
                        <div className="flex items-center justify-between p-4 px-6 border-b border-border/50 bg-background/60 backdrop-blur-md h-[80px] sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div
                                    className="h-11 w-11 rounded-full flex flex-shrink-0 items-center justify-center text-sm font-bold text-white shadow-sm uppercase"
                                    style={{ background: stringToGradient(activeCustomer.name || activeCustomer.platformHandle || "Anonymous") }}
                                >
                                    {(activeCustomer.name || activeCustomer.platformHandle || "?").substring(0, 2)}
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-base">{activeCustomer.name || activeCustomer.platformHandle || "Anonymous User"}</h3>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                                        <PlatformIcon platform={activeCustomer.platform || workspace.platform} className="h-3.5 w-3.5" />
                                        <span>@{activeCustomer.platformHandle}</span>
                                        <span className="opacity-50">•</span>
                                        <span className="font-mono">{activeCustomer.platformId}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 border px-3 py-1.5 rounded-md">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${activeCustomer.aiPaused ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        {activeCustomer.aiPaused ? "AI PAUSED" : "AI ACTIVE"}
                                    </span>
                                    <Switch checked={!activeCustomer.aiPaused} onCheckedChange={toggleAiPause} className="data-[state=checked]:bg-emerald-500" />
                                </div>

                                <Button variant="outline" size="sm" onClick={archiveCustomer}>
                                    <Archive className="h-4 w-4 mr-2" /> Archive
                                </Button>
                            </div>
                        </div>

                        {/* Thread Scroll */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8" ref={scrollRef}>
                            {loadingThread ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : thread.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm opacity-50 space-y-3">
                                    <MessageSquare className="h-8 w-8 opacity-40" />
                                    <span>No messages found in the last 7 days.</span>
                                </div>
                            ) : (
                                thread.map((msg: any, i: number) => {
                                    // Check if we should render the Post Context (only for the first message of a specific post in a sequence)
                                    const showPostContext = msg.post && (i === 0 || thread[i - 1].postId !== msg.postId);
                                    const thumbnailUrl = showPostContext ? getPostThumbnailUrl(msg.post) : null;
                                    const postLink = msg.post ? (workspace.platform === 'tiktok' ? `https://www.tiktok.com/@${workspace.platformHandle}/video/${msg.post.platformId}` : `https://www.instagram.com/p/${msg.post.platformId}`) : "#";

                                    return (
                                        <div key={msg.id} className="space-y-6">
                                            {/* User Message (Left) */}
                                            <div className="flex gap-3 justify-start max-w-[85%]">
                                                <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm text-white text-xs font-bold mt-1" style={{ background: stringToGradient(activeCustomer.name || activeCustomer.platformHandle || "User") }}>
                                                    {(activeCustomer.name || activeCustomer.platformHandle || "?").substring(0, 2)}
                                                </div>
                                                <div className="space-y-1.5 w-full relative group">

                                                    {/* Post Context Card (Rendered above the chat bubble) */}
                                                    {showPostContext && (
                                                        <a href={postLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-muted/40 p-2 rounded-xl rounded-tl-sm border hover:bg-muted/70 hover:border-primary/30 transition-all mb-2 w-fit max-w-sm group/link shadow-sm backdrop-blur-sm">
                                                            {thumbnailUrl ? (
                                                                <img src={thumbnailUrl} alt="Post thumbnail" className="h-12 w-12 rounded object-cover border border-border/50 shrink-0 bg-secondary" />
                                                            ) : (
                                                                <div className="h-12 w-12 rounded border border-border/50 shrink-0 bg-secondary flex items-center justify-center">
                                                                    <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col min-w-0 pr-2 py-0.5">
                                                                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 group-hover/link:text-primary transition-colors">
                                                                    <ExternalLink className="h-3 w-3" /> View Original Post
                                                                </span>
                                                                <span className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">
                                                                    {msg.post.content || "No caption available"}
                                                                </span>
                                                            </div>
                                                        </a>
                                                    )}

                                                    <div className={`p-4 rounded-2xl ${showPostContext ? 'rounded-tl-2xl' : 'rounded-tl-sm'} text-sm leading-relaxed shadow-sm border ${showPostContext ? 'bg-secondary border-border/40 text-secondary-foreground' : 'bg-secondary/70 backdrop-blur-sm text-secondary-foreground border-border/20'}`}>
                                                        {msg.content}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground pl-1.5 font-medium opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-5 left-0">
                                                        {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bot / Human Reply (Right) */}
                                            {msg.response && (
                                                <div className="flex gap-3 justify-end max-w-[85%] ml-auto mt-4">
                                                    <div className="space-y-1 text-right flex flex-col items-end w-full relative group">
                                                        <div className={`p-4 rounded-2xl rounded-tr-sm text-sm text-left leading-relaxed shadow-sm border ${msg.authorName === 'Human Agent' ? 'bg-blue-600 text-white border-blue-500/80 shadow-blue-500/10 text-shadow-sm' : 'bg-primary text-primary-foreground border-primary/90 shadow-primary/10'}`}>
                                                            {msg.response}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground pr-1.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-5 right-0 whitespace-nowrap font-medium">
                                                            {msg.status === "NEEDS_REVIEW" && (
                                                                <span className="text-red-500 flex items-center gap-1 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100 dark:bg-red-500/10 dark:border-red-500/20">
                                                                    <AlertTriangle className="h-3 w-3" /> Needs Review
                                                                </span>
                                                            )}
                                                            {msg.authorName === 'Human Agent' ? 'Sent by You' : 'Sent by AI'} • {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                    <div className={`h-8 w-8 mt-1 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-sm ${msg.authorName === 'Human Agent' ? 'bg-blue-700' : 'bg-primary/90'}`}>
                                                        {msg.authorName === 'Human Agent' ? (
                                                            <User className="h-4 w-4 text-white" />
                                                        ) : (
                                                            <Sparkles className="h-4 w-4 text-primary-foreground" />
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Bottom Composer */}
                        <div className="p-4 bg-background border-t">
                            <div className="flex gap-2">
                                <Input
                                    className="flex-1"
                                    placeholder={activeCustomer.aiPaused ? "Type your reply..." : "Pause AI to type a manual reply..."}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendManualReply()}
                                />
                                <Button onClick={sendManualReply} disabled={sending || !replyText.trim() || !activeCustomer.aiPaused}>
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                    Send
                                </Button>
                            </div>
                            {!activeCustomer.aiPaused && (
                                <p className="text-xs text-muted-foreground mt-2 text-center">
                                    The AI is currently managing this conversation. Toggle the switch top right to take over.
                                </p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

"use client";

import { useState, useTransition } from "react";
import { interactWithCoach } from "@/lib/coach-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, Bot, Sparkles, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
    id: string;
    role: "user" | "coach";
    content: string;
}

interface CoachClientProps {
    initialMessages: Message[];
    userImage?: string | null;
    userName?: string | null;
}

export default function CoachClient({ initialMessages, userImage, userName }: CoachClientProps) {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [isPending, startTransition] = useTransition();

    const handleSend = () => {
        if (!input.trim()) return;

        const newMsg: Message = { id: Date.now().toString(), role: "user", content: input };
        setMessages(prev => [...prev, newMsg]);
        setInput("");

        startTransition(async () => {
            const history = messages.map(m => ({ role: m.role, content: m.content }));
            const result = await interactWithCoach(newMsg.content, history);

            if (result.success) {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: "coach", content: result.reply! }]);
            } else {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: "coach", content: `⚠️ ${result.error || "I'm having trouble connecting. Please try again."}` }]);
            }
        });
    };

    return (
        <div className="relative container mx-auto p-4 lg:p-6 h-[calc(100vh-4rem)] max-w-[1600px] overflow-hidden z-0">
            {/* Decorative background gradients */}
            <div className="absolute top-10 -left-10 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob pointer-events-none" />
            <div className="absolute top-10 -right-10 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob animation-delay-2000 pointer-events-none" />
            <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob animation-delay-4000 pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full relative z-10">

                {/* LEFT COLUMN: Main Chat Interface (3/4 width) */}
                <Card className="lg:col-span-3 flex flex-col shadow-2xl border border-primary/20 bg-background/40 backdrop-blur-2xl overflow-hidden relative rounded-2xl">
                    <CardHeader className="border-b border-border/50 bg-background/60 backdrop-blur-md pb-4 shrink-0 z-10">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Avatar className="h-14 w-14 border border-primary/30 shadow-lg shadow-primary/20 overflow-visible relative">
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary to-purple-500 opacity-20 blur-md pointer-events-none" />
                                    <AvatarImage src="/dashboard/bot-avatar.png" alt="AI Coach" className="relative z-10 rounded-full object-cover" />
                                    <AvatarFallback className="bg-gradient-to-tr from-primary/10 to-purple-500/10 text-primary relative z-10"><Sparkles size={28} /></AvatarFallback>
                                </Avatar>
                                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-background rounded-full shadow-sm z-20"></span>
                            </div>
                            <div>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    AI Systems Coach
                                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Online</span>
                                </CardTitle>
                                <CardDescription>Your intelligent command center for automation.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 overflow-hidden relative bg-gradient-to-b from-background to-muted/20">
                        <ScrollArea className="h-full p-4 md:p-8">
                            <div className="space-y-6">
                                {messages.map((m) => (
                                    <div key={m.id} className={`flex gap-4 group ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                        <Avatar className={`h-10 w-10 shrink-0 shadow-sm ${m.role === "coach" ? "bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20" : "bg-gradient-to-br from-blue-500 to-cyan-500 text-white"}`}>
                                            {m.role === "user" && userImage && <AvatarImage src={userImage} alt={userName || "User"} />}
                                            <AvatarFallback className="bg-transparent">{m.role === "coach" ? <Sparkles size={20} className="text-primary" /> : <User size={20} className="text-white" />}</AvatarFallback>
                                        </Avatar>
                                        <div className={`flex flex-col gap-1 max-w-[85%] relative ${m.role === "user" ? "items-end" : "items-start"}`}>
                                            <div className={`rounded-2xl px-5 py-3.5 text-sm shadow-sm leading-relaxed ${m.role === "user"
                                                ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm shadow-primary/20"
                                                : "bg-background/80 backdrop-blur-lg border border-border/50 text-foreground rounded-tl-sm"
                                                }`}>
                                                {m.content}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground px-2 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-5">
                                                {!isNaN(parseInt(m.id))
                                                    ? new Date(parseInt(m.id)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : "Just now"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {isPending && (
                                    <div className="flex gap-4">
                                        <Avatar className="h-9 w-9 bg-primary/10"><AvatarFallback><Bot size={18} /></AvatarFallback></Avatar>
                                        <div className="flex items-center gap-2 bg-muted/50 rounded-2xl px-4 py-3 rounded-tl-none">
                                            <span className="flex gap-1">
                                                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></span>
                                            </span>
                                            <span className="text-xs text-muted-foreground font-medium">Processing...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>

                    <div className="p-4 md:p-6 border-t bg-background/80 backdrop-blur-sm shrink-0">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            className="flex gap-3 relative"
                        >
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask me to change settings, add products, or explain a feature..."
                                disabled={isPending}
                                className="flex-1 py-6 pl-4 pr-12 text-base shadow-sm border-muted-foreground/20 focus-visible:ring-primary/30"
                            />
                            {/* File Upload Trigger */}
                            <label
                                htmlFor="file-upload"
                                className="absolute right-[4.5rem] top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                                title="Upload Image or CSV"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                            </label>

                            <Button type="submit" size="icon" className="h-12 w-12 shrink-0 shadow-md transition-all hover:scale-105" disabled={isPending || !input.trim()}>
                                <Send size={20} />
                            </Button>
                        </form>

                        {/* File Upload Hidden Input */}
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            accept="image/*,.csv"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                const newMsg: Message = {
                                    id: Date.now().toString(),
                                    role: "user",
                                    content: `[Uploading ${file.name}...]`
                                };
                                setMessages(prev => [...prev, newMsg]);

                                startTransition(async () => {
                                    const formData = new FormData();
                                    formData.append("file", file);

                                    const { uploadFileForIngestion } = await import("@/lib/upload-actions");
                                    const result = await uploadFileForIngestion(formData);

                                    if (result.success) {
                                        setMessages(prev => [...prev, {
                                            id: Date.now().toString(),
                                            role: "coach",
                                            content: `✅ I've analyzed **${file.name}** and added **${result.count}** new items to your Knowledge Base!`
                                        }]);
                                    } else {
                                        setMessages(prev => [...prev, {
                                            id: Date.now().toString(),
                                            role: "coach",
                                            content: `⚠️ Failed to process file: ${result.error}`
                                        }]);
                                    }
                                });
                                e.target.value = "";
                            }}
                        />
                        <div className="mt-2 pl-1 text-xs text-muted-foreground">
                            Pro Tip: Upload a <strong>Photo of your Menu</strong> or a <strong>Product CSV</strong> to instantly train me.
                        </div>
                    </div>
                </Card>

                {/* RIGHT COLUMN: Sidebar / Alerts (1/4 width) */}
                <div className="flex flex-col gap-4 lg:col-span-1 h-full">
                    {/* Stuck Alerts Panel */}
                    <Card className="flex flex-col h-full shadow-lg border-amber-500/20 bg-amber-500/5">
                        <CardHeader className="py-4 border-b border-amber-500/10 bg-amber-500/10">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700">
                                <AlertTriangle size={16} className="fill-amber-500/20" />
                                Action Required
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 p-4 overflow-y-auto">
                            <div className="text-sm text-muted-foreground text-center py-8">
                                <div className="bg-background rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center shadow-sm">
                                    <span className="text-xl">✅</span>
                                </div>
                                <p>No active alerts.</p>
                                <p className="text-xs opacity-70 mt-1">Your bot is running smoothly.</p>
                            </div>
                        </CardContent>
                        <div className="p-3 bg-amber-500/10 text-[10px] text-amber-800/60 text-center font-medium">
                            Auto-Learning Active
                        </div>
                    </Card>

                    {/* Quick Stats or Tips (Placeholder for future) */}
                    <Card className="shadow-md border-primary/10">
                        <CardContent className="p-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">System Status</h3>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <span>All Systems Operational</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

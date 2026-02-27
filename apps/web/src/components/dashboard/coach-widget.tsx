"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Bot } from "lucide-react";
import dynamic from 'next/dynamic';

const CoachClient = dynamic(() => import("@/app/dashboard/coach/coach-client"), {
    ssr: false,
    loading: () => (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 h-full">
            <Bot className="h-12 w-12 text-primary/50 animate-bounce" />
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Loading interface...</p>
        </div>
    )
});
import { usePathname } from "next/navigation";
import { getCoachHistoryAction } from "@/lib/coach-actions";
import { useSession } from "next-auth/react";

export function CoachWidget() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const pathname = usePathname();
    const { data: session } = useSession();

    // Hide the widget if entirely on the dedicated coach page
    if (pathname === '/dashboard/coach') {
        return null;
    }

    const openWidget = async () => {
        setOpen(true);
        if (!hasLoaded) {
            setLoading(true);
            try {
                const history = await getCoachHistoryAction();
                if (Array.isArray(history) && history.length > 0) {
                    setMessages(history);
                } else {
                    setMessages([{
                        id: "intro",
                        role: "coach",
                        content: "Hello! I'm your AI Coach. I'm here to help you manage your store, troubleshoot issues, scale your knowledge base, and answer questions. How can I help today?"
                    }]);
                }
                setHasLoaded(true);
            } catch (err) {
                console.error("Failed to load coach history:", err);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <>
            <Button
                onClick={openWidget}
                size="icon"
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl shadow-primary/30 z-[49] hover:scale-105 transition-all duration-300 group overflow-hidden"
            >
                {/* Background pulse effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity blur-md pointer-events-none" />

                <Sparkles className="h-6 w-6 relative z-10" />
                <span className="sr-only">Open AI Coach</span>
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-background rounded-full shadow-sm z-20 animate-pulse" />
            </Button>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="right" className="w-[95vw] sm:max-w-[450px] lg:max-w-[500px] p-0 border-l shadow-2xl z-[100] flex flex-col pt-12 overflow-hidden bg-muted/20">
                    <SheetTitle className="sr-only">AI Coach Chat</SheetTitle>
                    <SheetDescription className="sr-only">Conversational interface for your AI system manager.</SheetDescription>

                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                            <Bot className="h-12 w-12 text-primary/50 animate-bounce" />
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <p className="text-sm font-medium text-muted-foreground">Connecting to Coach...</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-hidden relative pb-4 w-full h-[calc(100vh-3rem)] [&_.container]:p-2 [&_.container]:lg:p-4 [&_.container]:h-full [&>div]:max-h-full">
                            <CoachClient
                                initialMessages={messages}
                                userImage={session?.user?.image ?? null}
                                userName={session?.user?.name ?? null}
                            />
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </>
    );
}

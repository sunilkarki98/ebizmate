import { getConversationAction } from "@/lib/chat-actions";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, User, Bot } from "lucide-react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlatformIcon } from "@/components/platform-icon";

export default async function ChatPage({ params }: { params: Promise<{ platformId: string }> }) {
    const { platformId } = await params;
    // Decode if needed, though usually platform IDs are safe. 
    // If it was a handle (string), we might need decoding, but platformId is usually numeric or safe string.
    const decodedId = decodeURIComponent(platformId);

    const data = await getConversationAction(decodedId);

    if (data.error || !data.success || !data.customer) {
        // If customer not found or unauthorized
        return notFound();
    }

    const { customer, messages } = data;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] gap-4">
            {/* Header */}
            <div className="flex items-center gap-4 border-b pb-4">
                <Link href="/dashboard/interactions">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>


                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        {customer.name}
                        <Badge variant="outline" className="text-xs font-normal gap-1">
                            <PlatformIcon platform={customer.platform} className="h-3 w-3" />
                            {customer.platform}
                        </Badge>
                    </h1>
                    <p className="text-xs text-muted-foreground font-mono">
                        {customer.handle || customer.platformId}
                    </p>
                </div>
            </div>

            {/* Chat Area */}
            <Card className="flex-1 overflow-hidden flex flex-col shadow-none border-0 bg-transparent">
                <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-6 pb-4">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 space-y-2 py-20">
                                <MessageSquare className="h-10 w-10" />
                                <p>No message history found.</p>
                            </div>
                        ) : (
                            messages.map((msg: any) => (
                                <div key={msg.id} className="space-y-4">
                                    {/* User Message (Left) */}
                                    <div className="flex gap-3 justify-start max-w-[85%]">
                                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                                            <User className="h-4 w-4 text-secondary-foreground" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="bg-secondary/50 p-3 rounded-2xl rounded-tl-none text-sm">
                                                {msg.content}
                                            </div>
                                            {msg.post && (
                                                <div className="text-[10px] text-muted-foreground flex items-center gap-1 pl-1">
                                                    <span>Commented on verified post</span>
                                                </div>
                                            )}
                                            <div className="text-[10px] text-muted-foreground pl-1">
                                                {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bot Response (Right) */}
                                    {msg.response && (
                                        <div className="flex gap-3 justify-end max-w-[85%] ml-auto">
                                            <div className="space-y-1 text-right">
                                                <div className="bg-primary p-3 rounded-2xl rounded-tr-none text-sm text-primary-foreground text-left">
                                                    {msg.response}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground pr-1">
                                                    {msg.status === "PENDING" ? "Sending..." : "Sent by AI"}
                                                </div>
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                                                <Bot className="h-4 w-4 text-primary-foreground" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                {/* Input Placeholder (Future: Live Chat) */}
                <div className="pt-4 border-t">
                    <div className="bg-muted/30 p-4 rounded-lg text-center text-sm text-muted-foreground">
                        This is a read-only view of the conversation history.
                        To reply manually, use the platform's native app.
                    </div>
                </div>
            </Card>
        </div>
    );
}

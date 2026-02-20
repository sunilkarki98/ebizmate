"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ExternalLink, MessageSquare, GraduationCap, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { PlatformIcon } from "@/components/platform-icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { teachAndReplyAction } from "@/lib/learning-actions";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner"; // Assuming sonner is set up, or use a simple alert

type Interaction = {
    id: string;
    status: string | null;
    content: string;
    response: string | null;
    createdAt: Date | null;
    authorId: string | null;
    authorName: string | null;
    post?: {
        platformId: string;
        content: string | null;
    } | null;
    workspace?: {
        platform: string | null;
        platformHandle: string | null;
    } | null;
};

export default function InteractionsClient({ initialLogs, workspace }: { initialLogs: any[], workspace: any }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState("all");
    const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
    const [teachResponse, setTeachResponse] = useState("");
    const [isTeachOpen, setIsTeachOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const highlightId = searchParams.get("highlight");
        if (highlightId && initialLogs.length > 0) {
            const ix = initialLogs.find(l => l.id === highlightId);
            if (ix) {
                if (ix.status === "NEEDS_REVIEW") {
                    setActiveTab("needs_review");
                    setTimeout(() => {
                        setSelectedInteraction(ix);
                        setTeachResponse("");
                        setIsTeachOpen(true);
                    }, 50);
                } else {
                    setActiveTab("all");
                }

                // Clear the URL param cleanly
                router.replace("/dashboard/interactions", { scroll: false });
            }
        }
    }, [searchParams, initialLogs, router]);

    const filteredLogs = activeTab === "needs_review"
        ? initialLogs.filter(log => log.status === "NEEDS_REVIEW")
        : initialLogs;

    // Helper to open teach modal
    const handleOpenTeach = (interaction: Interaction) => {
        setSelectedInteraction(interaction);
        setTeachResponse(""); // Start empty, user writes the answer
        setIsTeachOpen(true);
    };

    // Handle Teach Submission
    const handleTeachSubmit = async () => {
        if (!selectedInteraction || !teachResponse.trim()) return;

        setIsSubmitting(true);
        try {
            await teachAndReplyAction(selectedInteraction.id, teachResponse);
            toast.success("Replied & Learned!");
            setIsTeachOpen(false);
            router.refresh(); // Refresh data to show updated status
        } catch (error) {
            console.error(error);
            toast.error("Failed to process.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="all">All Interactions</TabsTrigger>
                        <TabsTrigger value="needs_review" className="relative group">
                            Needs Review
                            {initialLogs.filter(l => l.status === "NEEDS_REVIEW").length > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full group-data-[state=active]:bg-red-600 transition-colors">
                                    {initialLogs.filter(l => l.status === "NEEDS_REVIEW").length}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="mt-4 rounded-md border shadow-sm bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Status</TableHead>
                                <TableHead className="w-[250px]">User</TableHead>
                                <TableHead className="w-[200px]">Context</TableHead>
                                <TableHead className="min-w-[300px]">Conversation</TableHead>
                                <TableHead className="text-right w-[150px]">Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <MessageSquare className="h-8 w-8 opacity-20" />
                                            <span>No interactions found.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => (
                                    <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={`
                                                    ${log.status === "NEEDS_REVIEW" ? "border-amber-500 text-amber-600 bg-amber-50" : ""}
                                                    ${log.status === "ACTION_REQUIRED" ? "border-red-500 text-red-600 bg-red-50" : ""}
                                                    ${log.status === "PROCESSED" ? "border-emerald-500 text-emerald-600 bg-emerald-50" : ""}
                                                    font-medium whitespace-nowrap
                                                `}
                                            >
                                                {log.status === "NEEDS_REVIEW" ? "Needs Review" :
                                                    log.status === "ACTION_REQUIRED" ? "Attention" :
                                                        log.status === "PROCESSED" ? "Replied" :
                                                            log.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 uppercase">
                                                    {(log.authorName || "?").substring(0, 2)}
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <PlatformIcon platform={workspace.platform} className="h-3 w-3 text-muted-foreground shrink-0" />
                                                        <span className="font-medium text-sm truncate" title={log.authorName || "Unknown"}>
                                                            {log.authorName || "Unknown User"}
                                                        </span>
                                                    </div>
                                                    {log.authorId && (
                                                        <Link
                                                            href={`/dashboard/chat/${log.authorId}`}
                                                            className="text-xs text-muted-foreground hover:text-primary hover:underline truncate"
                                                            title={log.authorId}
                                                        >
                                                            @{log.authorId}
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {/* Context Links */}
                                            {log.post ? (
                                                <div className="flex flex-col gap-1">
                                                    <a
                                                        href={
                                                            workspace.platform === "tiktok" ? `https://www.tiktok.com/@${workspace.platformHandle}/video/${log.post.platformId}` :
                                                                workspace.platform === "instagram" ? `https://www.instagram.com/p/${log.post.platformId}` :
                                                                    "#"
                                                        }
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline w-fit bg-blue-50 px-2 py-0.5 rounded-md"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                        View Post
                                                    </a>
                                                    {log.post.content && (
                                                        <span className="text-xs text-muted-foreground line-clamp-1 border-l-2 pl-2 border-muted" title={log.post.content}>
                                                            "{log.post.content}"
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <Badge variant="secondary" className="w-fit text-[10px] font-normal text-muted-foreground">
                                                    Direct Message
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-2 py-1">
                                                <div className="bg-muted/30 p-2 rounded-md text-sm text-foreground/90 border border-transparent hover:border-border transition-colors">
                                                    "{log.content}"
                                                </div>

                                                {log.status === "NEEDS_REVIEW" ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleOpenTeach(log as Interaction)}
                                                        className="w-full text-xs h-7 bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 shadow-sm"
                                                    >
                                                        <GraduationCap className="h-3 w-3 mr-1.5" />
                                                        Teach & Reply
                                                    </Button>
                                                ) : (
                                                    <div className="flex items-start gap-2 pl-2 border-l-2 border-emerald-100">
                                                        <CheckCircle className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                                                        <span className="text-xs text-muted-foreground italic line-clamp-2">
                                                            {log.response || "No response recorded"}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right align-top pt-4">
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : ""}
                                                <br />
                                                {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Tabs>

            {/* Teach Dialog - UI Polish */}
            <Dialog open={isTeachOpen} onOpenChange={setIsTeachOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-600">
                            <GraduationCap className="h-5 w-5" />
                            Teach Your Assistant
                        </DialogTitle>
                        <DialogDescription>
                            Teach the bot how to answer this query. It will remember this concept for future similar questions.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="bg-secondary/50 p-3 rounded-lg border border-border/50">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">USER ASKED</span>
                            <p className="text-sm font-medium text-foreground">"{selectedInteraction?.content}"</p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">YOUR ANSWER</span>
                            </div>
                            <Textarea
                                value={teachResponse}
                                onChange={(e) => setTeachResponse(e.target.value)}
                                placeholder="Type the correct response here..."
                                className="min-h-[120px] resize-none focus-visible:ring-amber-500"
                            />
                            <p className="text-[10px] text-muted-foreground text-right">
                                This will reply to the user AND save to knowledge base.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsTeachOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleTeachSubmit}
                            disabled={!teachResponse.trim() || isSubmitting}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                            Reply & Teach
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

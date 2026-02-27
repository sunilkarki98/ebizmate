import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardOverviewAction } from "@/lib/dashboard-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Bot, BookOpen, Activity, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

function formatRelativeTime(dateString: string | Date) {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const daysDifference = Math.round((new Date(dateString).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference === 0) {
        const hoursDifference = Math.round((new Date(dateString).getTime() - new Date().getTime()) / (1000 * 60 * 60));
        if (hoursDifference === 0) return "just now";
        return rtf.format(hoursDifference, 'hour');
    }
    return rtf.format(daysDifference, 'day');
}

export default async function DashboardPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/signin");

    const data = await getDashboardOverviewAction();
    if (!data || !data.success) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center p-8 text-center bg-card rounded-xl border mt-8">
                <Bot className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h2 className="text-xl font-semibold mb-2 text-foreground">Error Loading Metrics</h2>
                <p className="text-muted-foreground text-sm max-w-sm">We couldn't fetch your overview stats at this time. Please ensure the backend is running.</p>
            </div>
        );
    }

    const { counts, recentInteractions } = data;

    return (
        <div className="flex-1 space-y-8 lg:p-4">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Workspace Overview</h1>
                <p className="text-muted-foreground">High-level insights into your AI automation performance.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{counts.customers.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1 text-emerald-500 font-medium">
                            + Active interactions
                        </p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">AI Replies Handled</CardTitle>
                        <Bot className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{counts.interactions.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Saving time 24/7
                        </p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Knowledge Base Size</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{counts.items.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Learned facts & policies
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 border-t border-border/50 pt-8 mt-4">
                <Card className="col-span-1 md:col-span-2 lg:col-span-4 shadow-sm border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/20 border-b rounded-t-xl mb-4">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Recent AI Activity
                        </CardTitle>
                        <Link href="/dashboard/interactions" className="text-sm text-primary hover:underline font-medium">
                            View All →
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {recentInteractions && recentInteractions.length > 0 ? (
                            <div className="space-y-6">
                                {recentInteractions.map((interaction: any) => (
                                    <div key={interaction.id} className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="font-semibold text-sm">{interaction.authorName || interaction.authorId}</div>
                                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{interaction.sourceId.substring(0, 10)}...</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {formatRelativeTime(interaction.createdAt || new Date())}
                                            </div>
                                        </div>
                                        <div className="bg-muted/50 p-3 rounded-md text-sm italic text-foreground/80 border-l-2 border-primary/40">
                                            "{interaction.content}"
                                        </div>
                                        <div className="text-sm pl-4 flex items-center justify-between mt-1">
                                            <div className="flex items-start gap-2">
                                                <span className="text-lg">🤖</span>
                                                <span className="text-muted-foreground line-clamp-2 leading-relaxed">
                                                    {interaction.response || "No response generated (Failed or Pending)"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex justify-end mt-1">
                                            <Badge variant={
                                                interaction.status === "PROCESSED" ? "secondary" :
                                                    interaction.status === "NEEDS_REVIEW" ? "destructive" :
                                                        interaction.status === "FAILED" ? "destructive" : "outline"
                                            } className="text-[10px] lowercase tracking-wide font-medium">
                                                {interaction.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                <Activity className="h-8 w-8 mb-3 opacity-20" />
                                <p className="text-sm">No recent interactions yet.</p>
                                <p className="text-xs mt-1">Connect your social accounts to start automating.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-1 md:col-span-2 lg:col-span-3 shadow-sm border bg-muted/10">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 flex flex-col pt-0">
                        <Link href="/dashboard/coach" className="flex items-center gap-3 p-4 rounded-xl relative overflow-hidden group border border-border/50 bg-background hover:border-primary/50 transition-colors shadow-sm">
                            <div className="bg-primary/10 p-2.5 rounded-lg text-primary">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-sm">Train AI Coach</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Teach your bot new policies.</p>
                            </div>
                            <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:right-4 transition-all text-primary">
                                →
                            </div>
                        </Link>

                        <Link href="/dashboard/knowledge" className="flex items-center gap-3 p-4 rounded-xl relative overflow-hidden group border border-border/50 bg-background hover:border-primary/50 transition-colors shadow-sm">
                            <div className="bg-emerald-500/10 p-2.5 rounded-lg text-emerald-500">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-sm">Manage Knowledge</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Upload PDFs or Products.</p>
                            </div>
                            <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:right-4 transition-all text-emerald-500">
                                →
                            </div>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

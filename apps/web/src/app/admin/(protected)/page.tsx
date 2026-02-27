
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, MessageSquare, AlertTriangle, Users, Building2, Zap, Brain } from "lucide-react";
import { getAdminOverviewAction } from "@/lib/admin-actions";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle, Database, Server, Bot } from "lucide-react";

export default async function AdminDashboardPage() {
    const session = await auth('admin');
    if (!session?.user) redirect("/signin");

    const role = (session.user as { role?: string }).role;
    if (role !== "admin") redirect("/dashboard");

    const stats = await getAdminOverviewAction();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Platform Overview</h2>
                    <p className="text-muted-foreground">Admin view — platform-wide statistics</p>
                </div>
                {/* Connection Status Indicators */}
                <div className="flex gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${stats.health.db ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-red-500/10 border-red-500/20 text-red-600"}`}>
                        {stats.health.db ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        <span className="text-sm font-medium flex items-center gap-1"><Database className="h-3 w-3" /> Database</span>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${stats.health.dragonfly ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-orange-500/10 border-orange-500/20 text-orange-600"}`}>
                        {stats.health.dragonfly ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        <span className="text-sm font-medium flex items-center gap-1"><Server className="h-3 w-3" /> Dragonfly</span>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${stats.health.ai ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-red-500/10 border-red-500/20 text-red-600"}`}>
                        {stats.health.ai ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        <span className="text-sm font-medium flex items-center gap-1"><Bot className="h-3 w-3" /> AI Service</span>
                    </div>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className={stats.escalations > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Escalations</CardTitle>
                        <AlertTriangle className={`h-4 w-4 ${stats.escalations > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats.escalations > 0 ? "text-destructive" : ""}`}>{stats.escalations}</div>
                        <p className="text-xs text-muted-foreground">Across all workspaces</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.users}</div>
                        <p className="text-xs text-muted-foreground">Registered accounts</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.workspaces}</div>
                        <p className="text-xs text-muted-foreground">Active tenants</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Interactions</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.interactions.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Total conversations</p>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Knowledge Items</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.items}</div>
                        <p className="text-xs text-muted-foreground">Across all workspaces</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Customer Bot Calls</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.botCalls.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Automated customer replies</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Coach Chats</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.coachCalls.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Internal admin assistance</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                        <Brain className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">All-time token usage</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

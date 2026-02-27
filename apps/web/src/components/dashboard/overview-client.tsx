"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ArrowUpRight, MessageSquare, Users, Zap } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface OverviewProps {
    metrics: {
        totalInteractions: number;
        activeCustomers: number;
        aiResponseRate: number;
        pendingActions: number;
    };
    chartData: {
        date: string;
        interactions: number;
    }[];
    recentActivity: {
        id: string;
        description: string;
        status: string;
        date: string;
        platform: string;
    }[];
}

export function OverviewClient({ metrics, chartData, recentActivity }: OverviewProps) {
    return (
        <div className="space-y-6">
            {/* Header / Command Center */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Command Center</h2>
                    <p className="text-muted-foreground">Real-time overview of your AI agent performance.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/items/new">
                        <Button variant="outline">Add Knowledge</Button>
                    </Link>
                    <Link href="/dashboard/settings">
                        <Button>Connect Account</Button>
                    </Link>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Total Interactions"
                    value={metrics.totalInteractions.toLocaleString()}
                    icon={MessageSquare}
                    description="Messages processed"
                />
                <MetricCard
                    title="Active Customers"
                    value={metrics.activeCustomers.toLocaleString()}
                    icon={Users}
                    description="Unique users engaged"
                />
                <MetricCard
                    title="AI Response Rate"
                    value={`${metrics.aiResponseRate}%`}
                    icon={Zap}
                    description="Automated replies"
                />
                <MetricCard
                    title="Pending Actions"
                    value={metrics.pendingActions.toString()}
                    icon={Activity}
                    description="Requires human review"
                    highlight={metrics.pendingActions > 0}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Main Chart */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Interaction Volume</CardTitle>
                        <CardDescription>
                            Message traffic over the last 7 days.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div style={{ width: "100%", height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis
                                        dataKey="date"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                                        labelStyle={{ color: "hsl(var(--foreground))" }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="interactions"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity Feed */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>
                            Latest actions performed by your bot.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {recentActivity.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
                            ) : (
                                recentActivity.map((activity) => (
                                    <div key={activity.id} className="flex items-center">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {activity.description}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {activity.platform} • {activity.date}
                                            </p>
                                        </div>
                                        <div className="ml-auto font-medium">
                                            <Badge variant={activity.status === "PROCESSED" ? "secondary" : "outline"}>
                                                {activity.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

interface MetricCardProps {
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    highlight?: boolean;
}

function MetricCard({ title, value, icon: Icon, description, highlight }: MetricCardProps) {
    return (
        <Card className={highlight ? "border-destructive/50 bg-destructive/5" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${highlight ? "text-destructive" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${highlight ? "text-destructive" : ""}`}>{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}

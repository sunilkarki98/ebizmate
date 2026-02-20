import { getAnalyticsAction } from "@/lib/admin-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Zap, Clock, AlertTriangle } from "lucide-react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default async function AnalyticsPage() {
    const data = await getAnalyticsAction();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
                <p className="text-muted-foreground">Platform-wide AI usage and performance metrics.</p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totals.totalCalls.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totals.totalTokens.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Error Count</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totals.totalErrors}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Workspaces</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.topWorkspaces.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Provider Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Provider Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    {data.providerBreakdown.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No usage data yet</p>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Provider</TableHead>
                                        <TableHead>Operation</TableHead>
                                        <TableHead className="text-right">Calls</TableHead>
                                        <TableHead className="text-right">Tokens</TableHead>
                                        <TableHead className="text-right">Avg Latency</TableHead>
                                        <TableHead className="text-right">Error Rate</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.providerBreakdown.map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <Badge variant="outline">{row.provider}</Badge>
                                            </TableCell>
                                            <TableCell>{row.operation}</TableCell>
                                            <TableCell className="text-right">{row.totalCalls.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{row.totalTokens.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{row.avgLatency}ms</TableCell>
                                            <TableCell className="text-right">
                                                <span className={Number(row.errorRate) > 5 ? "text-destructive font-medium" : ""}>
                                                    {row.errorRate ?? 0}%
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Daily Usage (last 30 days) */}
            <Card>
                <CardHeader>
                    <CardTitle>Daily Usage (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                    {data.dailyUsage.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No usage data yet</p>
                    ) : (
                        <div className="rounded-md border max-h-[400px] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Provider</TableHead>
                                        <TableHead className="text-right">Calls</TableHead>
                                        <TableHead className="text-right">Tokens</TableHead>
                                        <TableHead className="text-right">Avg Latency</TableHead>
                                        <TableHead className="text-right">Errors</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.dailyUsage.map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-mono text-sm">{row.date}</TableCell>
                                            <TableCell><Badge variant="outline">{row.provider}</Badge></TableCell>
                                            <TableCell className="text-right">{row.calls}</TableCell>
                                            <TableCell className="text-right">{row.tokens.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{row.avgLatency}ms</TableCell>
                                            <TableCell className="text-right">
                                                <span className={row.errors > 0 ? "text-destructive font-medium" : ""}>
                                                    {row.errors}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Top Workspaces by Usage */}
            <Card>
                <CardHeader>
                    <CardTitle>Top Workspaces by Usage</CardTitle>
                </CardHeader>
                <CardContent>
                    {data.topWorkspaces.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No usage data yet</p>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Workspace</TableHead>
                                        <TableHead className="text-right">API Calls</TableHead>
                                        <TableHead className="text-right">Tokens</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.topWorkspaces.map((ws, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{ws.workspaceName || ws.workspaceId}</TableCell>
                                            <TableCell className="text-right">{ws.totalCalls.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{ws.totalTokens.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

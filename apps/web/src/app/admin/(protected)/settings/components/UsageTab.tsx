import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export function UsageTab({ usage }: { usage: any }) {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Total Usage</CardTitle>
                    <CardDescription>Lifetime token consumption stats.</CardDescription>
                </CardHeader>
                <CardContent>
                    {usage ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                                <div className="text-3xl font-bold text-primary">{(usage.allTime.totalCalls).toLocaleString()}</div>
                                <div className="text-sm font-medium text-muted-foreground mt-1">Total Calls</div>
                            </div>
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                                <div className="text-3xl font-bold text-primary">{(usage.allTime.totalTokens).toLocaleString()}</div>
                                <div className="text-sm font-medium text-muted-foreground mt-1">Total Tokens</div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-24 flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
                    <CardDescription>Usage over the last 7 days.</CardDescription>
                </CardHeader>
                <CardContent>
                    {usage?.last7Days && usage.last7Days.length > 0 ? (
                        <div className="space-y-3">
                            {usage.last7Days.map((row: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-sm p-3 rounded-md bg-muted/40">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="text-xs capitalize">{String(row.provider)}</Badge>
                                        <span className="font-medium">{String(row.operation)}</span>
                                    </div>
                                    <div className="text-muted-foreground text-right">
                                        <div className="font-medium text-foreground">{Number(row.totalCalls)} calls</div>
                                        <div className="text-xs">{Number(row.totalTokens).toLocaleString()} tokens</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-6">No recent activity detected.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

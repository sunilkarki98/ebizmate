import { getAuditLogsAction } from "@/lib/admin-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText } from "lucide-react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const actionLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    "settings.updated": { label: "Settings Updated", variant: "default" },
    "user.role_changed": { label: "Role Changed", variant: "secondary" },
    "escalation.resolved": { label: "Escalation Resolved", variant: "outline" },
};

export default async function AuditPage() {
    const logs = await getAuditLogsAction();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
                    <p className="text-muted-foreground">Chronological record of admin actions.</p>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground bg-secondary/50 px-3 py-1 rounded-md">
                    <ScrollText className="h-4 w-4" />
                    <span className="text-sm font-medium">{logs.length} Entries</span>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Action</TableHead>
                                    <TableHead>By</TableHead>
                                    <TableHead>Target</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead className="text-right">When</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No audit entries yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map((log: any) => {
                                        const actionInfo = actionLabels[log.action] || { label: log.action, variant: "outline" as const };
                                        const details = log.details as Record<string, unknown> | null;

                                        return (
                                            <TableRow key={log.id}>
                                                <TableCell>
                                                    <Badge variant={actionInfo.variant}>
                                                        {actionInfo.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    <div className="font-medium">{log.userName || "—"}</div>
                                                    <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {log.targetType && (
                                                        <span className="capitalize">{log.targetType}</span>
                                                    )}
                                                    {log.targetId && (
                                                        <div className="text-xs font-mono truncate max-w-[150px]" title={log.targetId}>
                                                            {log.targetId}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                                                    {details ? (
                                                        <div className="space-y-0.5">
                                                            {Object.entries(details).slice(0, 3).map(([k, v]) => (
                                                                <div key={k}>
                                                                    <span className="font-medium">{k}:</span> {String(v)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : "—"}
                                                </TableCell>
                                                <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                                                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { getEscalationsAction, resolveEscalationAction, toggleAiPauseAction } from "@/lib/admin-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Escalation = {
    id: string;
    content: string;
    response: string | null;
    authorName: string | null;
    authorId: string | null;
    status: string | null;
    createdAt: Date | null;
    workspaceId: string;
    workspaceName: string | null;
};

export default function EscalationsPage() {
    const [escalations, setEscalations] = useState<Escalation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const data = await getEscalationsAction();
            setEscalations(data);
        } finally {
            setLoading(false);
        }
    }

    function handleResolve(id: string) {
        startTransition(async () => {
            await resolveEscalationAction(id);
            loadData();
        });
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Escalations</h1>
                    <p className="text-muted-foreground">Conversations that need human attention.</p>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground bg-destructive/10 text-destructive px-3 py-1 rounded-md">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">{escalations.length} Pending</span>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Escalations (All Workspaces)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Workspace</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead className="w-[250px]">Message</TableHead>
                                    <TableHead className="w-[250px]">Bot Response</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {escalations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <CheckCircle className="h-8 w-8 text-emerald-500" />
                                                <span>No pending escalations. All clear!</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    escalations.map((esc) => (
                                        <TableRow key={esc.id}>
                                            <TableCell>
                                                <Badge variant="outline">{esc.workspaceName || "—"}</Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {esc.authorName || esc.authorId || "Unknown"}
                                            </TableCell>
                                            <TableCell className="break-words max-w-[250px] text-sm">
                                                {esc.content}
                                            </TableCell>
                                            <TableCell className="break-words max-w-[250px] text-sm text-muted-foreground italic">
                                                {esc.response || "—"}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                {esc.createdAt ? new Date(esc.createdAt).toLocaleString() : "—"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isPending}
                                                    onClick={() => handleResolve(esc.id)}
                                                    className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                                >
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Resolve
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={isPending}
                                                    onClick={() => {
                                                        if (esc.authorId) toggleAiPauseAction(esc.workspaceId, esc.authorId);
                                                    }}
                                                    className="text-amber-600 hover:bg-amber-50 hover:text-amber-700 ml-2"
                                                >
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    Pause AI
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

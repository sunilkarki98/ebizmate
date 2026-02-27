"use client";

import { useEffect, useState, useTransition } from "react";
import { toggleGlobalAiAccessAction, updateWorkspacePlanAction } from "@/lib/admin-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Store, Loader2, Edit, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Workspace = {
    id: string;
    name: string;
    platform: string | null;
    platformHandle: string | null;
    ownerName: string | null;
    ownerEmail: string | null;
    allowGlobalAi: boolean | null;
    plan: string | null;
    status: string | null;
    trialEndsAt: Date | null;
    customUsageLimit: number | null;
    interactionCount: number;
    itemCount: number;
    createdAt: Date | null;
    currentMonthUsage?: number;
};

export function WorkspacesClient({ initialWorkspaces }: { initialWorkspaces: any[] }) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
    // Sync local state when props change (after server revalidation)
    useEffect(() => {
        setWorkspaces(initialWorkspaces);
    }, [initialWorkspaces]);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isPending, startTransition] = useTransition();
    const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form State for Edit Dialog
    const [formData, setFormData] = useState({
        plan: "free",
        status: "active",
        customLimit: "",
        trialDays: "0",
    });

    useEffect(() => {
        if (editingWorkspace) {
            setFormData({
                plan: editingWorkspace.plan || "free",
                status: editingWorkspace.status || "active",
                customLimit: editingWorkspace.customUsageLimit?.toString() || "",
                trialDays: "0", // Default to no change
            });
        }
    }, [editingWorkspace]);

    function handleToggleGlobalAi(id: string, checked: boolean) {
        // Optimistic update
        setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, allowGlobalAi: checked } : w));

        startTransition(async () => {
            try {
                const result = await toggleGlobalAiAccessAction(id, checked);
                if (result.success) {
                    toast.success(`AI access ${checked ? 'allowed' : 'blocked'}`);
                } else if ('error' in result) {
                    toast.error(result.error);
                    // Rollback
                    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, allowGlobalAi: !checked } : w));
                }
            } catch (error) {
                toast.error("Failed to update AI access");
                // Rollback
                setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, allowGlobalAi: !checked } : w));
            }
        });
    }

    async function handleSavePlan() {
        if (!editingWorkspace) return;
        setIsSaving(true);

        try {
            // Calculate new trial date if days added
            let newTrialDate = editingWorkspace.trialEndsAt;
            const daysToAdd = parseInt(formData.trialDays);
            if (daysToAdd > 0) {
                const baseDate = newTrialDate && new Date(newTrialDate) > new Date() ? new Date(newTrialDate) : new Date();
                baseDate.setDate(baseDate.getDate() + daysToAdd);
                newTrialDate = baseDate;
            }

            const payload: any = {
                plan: formData.plan,
                status: formData.status,
            };
            if (formData.customLimit) {
                payload.customUsageLimit = parseInt(formData.customLimit);
            }
            if (newTrialDate) {
                payload.trialEndsAt = newTrialDate;
            }

            const result = await updateWorkspacePlanAction(editingWorkspace.id, payload);

            if (result.success) {
                toast.success("Workspace updated successfully");
                // Update local state partially (full refresh will happen on revalidate)
                setWorkspaces(prev => prev.map(w => w.id === editingWorkspace.id ? { ...w, ...payload } : w));
                setEditingWorkspace(null);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to update workspace");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
                    <p className="text-muted-foreground">Manage client environments, plans, and AI access.</p>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground bg-secondary/50 px-3 py-1 rounded-md">
                    <Store className="h-4 w-4" />
                    <span className="text-sm font-medium">{workspaces.length} Active</span>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Workspaces</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Workspace</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Plan & Status</TableHead>
                                    <TableHead>Usage (Mo)</TableHead>
                                    <TableHead>Global AI</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {workspaces.map((ws: any) => {
                                    const isTrialActive = ws.plan === "free" && ws.trialEndsAt && new Date(ws.trialEndsAt) > new Date();
                                    const limit = ws.customUsageLimit || (ws.plan === "paid" ? 1000000 : 10000);
                                    const usagePercent = ws.currentMonthUsage ? Math.min(100, (ws.currentMonthUsage / limit) * 100) : 0;

                                    return (
                                        <TableRow key={ws.id}>
                                            <TableCell className="font-medium">
                                                <div>{ws.name}</div>
                                                <div className="text-xs text-muted-foreground capitalize">
                                                    {ws.platform || "Generic"} {ws.platformHandle && `@${ws.platformHandle}`}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">{ws.ownerName}</div>
                                                <div className="text-xs text-muted-foreground">{ws.ownerEmail}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={ws.plan === "paid" ? "default" : "outline"} className="capitalize">
                                                            {ws.plan}
                                                        </Badge>
                                                        {ws.status !== "active" && (
                                                            <Badge variant="destructive" className="capitalize text-[10px] px-1 py-0 h-4">
                                                                {ws.status}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {ws.plan === "free" && (
                                                        <div className="text-xs flex items-center gap-1 text-muted-foreground">
                                                            <Calendar className="h-3 w-3" />
                                                            {isTrialActive
                                                                ? `Trial ends ${new Date(ws.trialEndsAt!).toLocaleDateString()}`
                                                                : <span className="text-red-500 font-medium">Trial Expired</span>
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="w-[120px] space-y-1">
                                                    <div className="flex justify-between text-xs">
                                                        <span>{ws.currentMonthUsage?.toLocaleString() ?? 0}</span>
                                                        <span className="text-muted-foreground">/ {limit.toLocaleString()}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${usagePercent > 90 ? "bg-red-500" : "bg-primary"}`}
                                                            style={{ width: `${usagePercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={ws.allowGlobalAi ?? true}
                                                        onCheckedChange={(checked) => handleToggleGlobalAi(ws.id, checked)}
                                                    />
                                                    <Label className="text-xs text-muted-foreground">
                                                        {(ws.allowGlobalAi ?? true) ? "Allowed" : "Blocked"}
                                                    </Label>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => setEditingWorkspace(ws)}>
                                                    <Edit className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={!!editingWorkspace} onOpenChange={(open) => !open && setEditingWorkspace(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Workspace Plan</DialogTitle>
                        <DialogDescription>
                            Manage billing, limits, and trial status for {editingWorkspace?.name}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Plan Tier</Label>
                                <Select value={formData.plan} onValueChange={(val) => setFormData({ ...formData, plan: val })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="free">Free (Trial)</SelectItem>
                                        <SelectItem value="paid">Paid</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Account Status</Label>
                                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="suspended">Suspended (Blocked)</SelectItem>
                                        <SelectItem value="past_due">Past Due</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Custom Token Limit (Monthly)</Label>
                            <Input
                                type="number"
                                placeholder="Leave empty for plan default"
                                value={formData.customLimit}
                                onChange={(e) => setFormData({ ...formData, customLimit: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">Overrides the default plan limit.</p>
                        </div>

                        {formData.plan === "free" && (
                            <div className="space-y-2 p-3 bg-secondary/30 rounded-md border">
                                <Label className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" /> Extend Trial
                                </Label>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setFormData({ ...formData, trialDays: "3" })} className={formData.trialDays === "3" ? "bg-primary/10 border-primary" : ""}>+3 Days</Button>
                                    <Button variant="outline" size="sm" onClick={() => setFormData({ ...formData, trialDays: "7" })} className={formData.trialDays === "7" ? "bg-primary/10 border-primary" : ""}>+7 Days</Button>
                                    <Button variant="outline" size="sm" onClick={() => setFormData({ ...formData, trialDays: "30" })} className={formData.trialDays === "30" ? "bg-primary/10 border-primary" : ""}>+30 Days</Button>
                                    <Input
                                        className="w-20"
                                        type="number"
                                        placeholder="Days"
                                        value={formData.trialDays}
                                        onChange={(e) => setFormData({ ...formData, trialDays: e.target.value })}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Adds days to the current trial end date.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingWorkspace(null)}>Cancel</Button>
                        <Button onClick={handleSavePlan} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

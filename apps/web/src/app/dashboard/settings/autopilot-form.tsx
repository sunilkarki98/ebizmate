"use client";

import { useTransition } from "react";
import { updateAutopilotSettingsAction } from "@/lib/settings-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

export function AutopilotForm({ workspace }: { workspace: any }) {
    const [isPending, startTransition] = useTransition();

    const mode = workspace.autopilotMode || "ALWAYS_ON";
    const start = workspace.businessHoursStart || "09:00";
    const end = workspace.businessHoursEnd || "17:00";
    const tz = workspace.timezone || "America/New_York";
    const capacity = workspace.maxHumanCapacity || 5;

    async function handleSubmit(formData: FormData) {
        startTransition(async () => {
            const res = await updateAutopilotSettingsAction(formData);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Autopilot settings saved successfully.");
            }
        });
    }

    return (
        <form action={handleSubmit} className="space-y-6 relative">
            <Card className="shadow-lg border border-primary/10 bg-background/50 backdrop-blur-3xl overflow-hidden rounded-2xl relative z-10">
                <CardHeader className="bg-background/40 border-b border-border/50 pb-6 pt-8">
                    <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                            <Settings2 className="h-6 w-6" />
                        </div>
                        Autopilot & AI Routing
                    </CardTitle>
                    <CardDescription className="pt-2 text-sm">
                        Enterprise-grade routing. Control exactly when the AI interacts with your customers and when it leaves messages in your inbox.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-8">
                    <div className="space-y-4">
                        <Label>Routing Mode</Label>
                        <Select name="autopilotMode" defaultValue={mode}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALWAYS_ON">Always On (AI replies 24/7)</SelectItem>
                                <SelectItem value="AFTER_HOURS">After Hours Only (Schedules below)</SelectItem>
                                <SelectItem value="OVERFLOW">Overflow Only (Capacity logic below)</SelectItem>
                                <SelectItem value="OFF">Turned Off (Human only)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold">After Hours Scheduling</h3>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                If using "After Hours" mode, the AI will only reply OUTSIDE of these hours.
                            </p>
                            <div className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <Label className="text-xs">Timezone</Label>
                                    <Input type="text" name="timezone" defaultValue={tz} placeholder="America/New_York" className="text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Business Start</Label>
                                        <Input type="time" name="businessHoursStart" defaultValue={start} className="text-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Business End</Label>
                                        <Input type="time" name="businessHoursEnd" defaultValue={end} className="text-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold">Overflow Capacity</h3>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                If using "Overflow" mode, the AI takes over when you have more than this many active chats.
                            </p>
                            <div className="space-y-2 pt-2">
                                <Label className="text-xs">Max Human Capacity (Chats)</Label>
                                <Input type="number" name="maxHumanCapacity" min="1" max="50" defaultValue={capacity} className="text-sm" />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3 text-sm text-blue-500 items-start">
                        <Info className="h-4 w-4 mt-0.5 shrink-0" />
                        <p>No matter what mode you choose, all messages are always saved to your Dashboard Inbox. The mode only controls if the AI sends an automatic reply.</p>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t p-4 bg-muted/10">
                    <Button type="submit" disabled={isPending} variant="secondary">
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Save Routing Rules
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}

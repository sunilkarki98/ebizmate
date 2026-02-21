"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { simulateWebhookAction } from "@/lib/webhook-actions";
import { toast } from "sonner";
import { Loader2, MessageSquare, Send } from "lucide-react";

export function WebhookSimulatorClient({ workspace }: { workspace: any }) {
    const [isPending, setIsPending] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsPending(true);
        setResult(null);

        const formData = new FormData(event.currentTarget);
        try {
            const response = await simulateWebhookAction(formData);
            if (response.success) {
                toast.success("Message sent to AI!");
                setResult(response.reply || "No reply (Action Required)");
            } else {
                toast.error("Failed to simulate webhook");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Send Test Message</CardTitle>
                <CardDescription>
                    This simulates a user sending a message to your {workspace.platform || "generic"} bot.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="platform">Platform</Label>
                            <Select name="platform" defaultValue={workspace.platform || "generic"} disabled>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="generic">Generic</SelectItem>
                                    <SelectItem value="tiktok">TikTok</SelectItem>
                                    <SelectItem value="instagram">Instagram</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="userId">User ID (Simulated)</Label>
                            <Input name="userId" defaultValue="test-user-123" required />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="userName">User Name</Label>
                        <Input name="userName" defaultValue="Alice Tester" required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message">Message Content</Label>
                        <Textarea
                            name="message"
                            placeholder="e.g. How much is shipping?"
                            required
                            className="min-h-[100px]"
                        />
                    </div>

                    {result && (
                        <div className="mt-4 p-4 bg-muted rounded-md border text-sm">
                            <div className="flex items-center gap-2 font-medium mb-1">
                                <MessageSquare className="h-4 w-4" /> AI Reply:
                            </div>
                            <p className="whitespace-pre-wrap">{result}</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button type="submit" disabled={isPending} className="w-full">
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                            </>
                        ) : (
                            <>
                                <Send className="mr-2 h-4 w-4" /> Send Message
                            </>
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}

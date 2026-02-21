
"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateIdentityAction } from "@/lib/settings-actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PlatformIcon } from "@/components/platform-icon";

export function ConnectSocialForm({ workspace }: { workspace: any }) {
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
            const result = await updateIdentityAction(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Identity updated successfully!");
            }
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <Card>
                <CardHeader>
                    <CardTitle>Brand Identity</CardTitle>
                    <CardDescription>
                        Configure how your business appears on social platforms.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="workspaceName">Workspace / Brand Name</Label>
                        <Input
                            id="workspaceName"
                            name="workspaceName"
                            defaultValue={workspace.name}
                            required
                            placeholder="My Awesome Brand"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="platform">Connected Platform</Label>
                        <Select name="platform" defaultValue={workspace.platform || "generic"}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a platform" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="generic">Generic (Web)</SelectItem>
                                <SelectItem value="tiktok">
                                    <div className="flex items-center gap-2">
                                        <PlatformIcon platform="tiktok" /> TikTok
                                    </div>
                                </SelectItem>
                                <SelectItem value="instagram">
                                    <div className="flex items-center gap-2">
                                        <PlatformIcon platform="instagram" /> Instagram
                                    </div>
                                </SelectItem>
                                <SelectItem value="facebook">
                                    <div className="flex items-center gap-2">
                                        <PlatformIcon platform="facebook" /> Facebook
                                    </div>
                                </SelectItem>
                                <SelectItem value="whatsapp">
                                    <div className="flex items-center gap-2">
                                        <PlatformIcon platform="whatsapp" /> WhatsApp
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Select the primary social platform you want to connect.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="platformHandle">Platform Handle (Optional)</Label>
                        <div className="flex items-center">
                            <span className="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-muted-foreground text-sm">@</span>
                            <Input
                                id="platformHandle"
                                name="platformHandle"
                                defaultValue={workspace.platformHandle || ""}
                                className="rounded-l-none"
                                placeholder="username"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}

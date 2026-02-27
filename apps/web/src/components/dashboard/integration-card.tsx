"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformIcon } from "@/components/platform-icon";
import { Loader2, CheckCircle2, Link as LinkIcon } from "lucide-react";

interface IntegrationCardProps {
    platform: "instagram" | "facebook" | "tiktok";
    title: string;
    description: string;
    isConnected: boolean;
    oauthUrl: string;
}

export function IntegrationCard({ platform, title, description, isConnected, oauthUrl }: IntegrationCardProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleConnect = () => {
        setIsLoading(true);
        // In a real app, this redirects to the OAuth provider
        window.location.href = oauthUrl;
    };

    return (
        <Card className={`relative overflow-hidden transition-all duration-300 ${isConnected ? "border-primary/50 bg-primary/5" : ""}`}>
            {isConnected && (
                <div className="absolute top-0 right-0 p-4">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
            )}
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <div className="p-3 bg-muted rounded-xl">
                    <PlatformIcon platform={platform} className="h-8 w-8" />
                </div>
                <div>
                    <CardTitle className="text-xl">{title}</CardTitle>
                    <CardDescription className="mt-1.5">{description}</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                {/* Future implementation: Show connected page/account name here */}
                {isConnected ? (
                    <p className="text-sm font-medium text-primary flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        Active and listening mapped to workspace
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/50"></span>
                        Not connected
                    </p>
                )}
            </CardContent>
            <CardFooter className="bg-muted/30 border-t px-6 py-4 flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                    Requires admin permissions on the {platform === "tiktok" ? "TikTok" : "Facebook"} page.
                </p>
                {isConnected ? (
                    <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20" disabled={isLoading}>
                        Disconnect
                    </Button>
                ) : (
                    <Button onClick={handleConnect} disabled={isLoading} size="sm" className="gap-2 shadow-sm font-semibold">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                        Connect
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, Eye, EyeOff, Terminal } from "lucide-react";
import { toast } from "sonner"; // Assuming sonner is used, or I'll use simple fallback if not

export function CopyInput({ value, label }: { value: string, label?: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center gap-2 w-full">
            <div className="grid gap-1 flex-1">
                {label && <div className="text-sm font-medium">{label}</div>}
                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm text-muted-foreground border flex items-center justify-between">
                    <span className="truncate">{value}</span>
                </code>
            </div>
            <Button variant="outline" size="icon" onClick={handleCopy} className="h-8 w-8 shrink-0">
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
        </div>
    );
}

export function SecretDisplay({ value }: { value: string }) {
    const [show, setShow] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!value) return <div className="text-sm text-muted-foreground italic">Not set</div>;

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center gap-2">
            <div className="relative font-mono text-sm bg-muted rounded border px-2 py-1 min-w-[200px]">
                {show ? value : "••••••••••••••••••••••••••••"}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShow(!show)} className="h-8 w-8">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8">
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
        </div>
    );
}

export function TestPayloadButton() {
    const [copied, setCopied] = useState(false);

    const payload = JSON.stringify({
        type: "message.create",
        userId: "test-user-123",
        userName: "Test User",
        text: "Hello! Is this bot working?",
        video_id: "test-video-456",
        timestamp: Date.now()
    }, null, 2);

    const handleCopy = () => {
        navigator.clipboard.writeText(payload);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Test JSON"}
        </Button>
    );
}

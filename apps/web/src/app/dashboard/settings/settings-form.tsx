"use client";

import { useTransition } from "react";
import { updateWorkspaceAISettingsAction } from "@/lib/settings-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ShieldCheck, Zap, Key, Bot, Plug, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SettingsForm({ workspace }: { workspace: any }) {
    const [isPending, startTransition] = useTransition();

    // Determine active plan features
    const isPro = workspace.plan === "pro" || workspace.plan === "enterprise";
    const limit = workspace.customUsageLimit || (isPro ? 50000 : 10000);
    const settings = workspace.aiSettings || {};

    // Keys are masked in DB retrieval, frontend just checks if they exist
    const hasOpenAI = !!settings.openaiApiKey;
    const hasGemini = !!settings.geminiApiKey;
    const hasOpenRouter = !!settings.openrouterApiKey;
    const hasGroq = !!settings.groqApiKey;

    const isBYOK = hasOpenAI || hasGemini || hasOpenRouter || hasGroq;

    async function handleSubmit(formData: FormData) {
        startTransition(async () => {
            const res = await updateWorkspaceAISettingsAction(formData);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("AI configuration saved securely.");
                // Clear the password fields
                const formElement = document.getElementById("ai-settings-form") as HTMLFormElement;
                if (formElement) formElement.reset();
            }
        });
    }

    return (
        <form id="ai-settings-form" action={handleSubmit} className="space-y-6 relative">
            <Card className="shadow-2xl border border-primary/20 bg-background/50 backdrop-blur-3xl overflow-hidden rounded-2xl relative z-10">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-purple-500" />
                <CardHeader className="bg-background/40 border-b border-border/50 pb-6 pt-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            AI Engine Configuration
                        </CardTitle>
                        {isBYOK && <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 shadow-sm shadow-emerald-500/20 px-3 py-1 text-xs">BYOK Active</Badge>}
                    </div>
                    <CardDescription className="pt-2 text-sm">
                        {isBYOK
                            ? "You are using your own API keys. No strict token limits apply."
                            : "Your AI settings are currently managed by the EbizMate system."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-8">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Coach Configuration */}
                        <div className="p-4 rounded-lg border bg-muted/10 space-y-4">
                            <div className="flex items-center gap-2 font-semibold text-sm">
                                <Bot className="h-4 w-4 text-primary" />
                                AI Coach Provider
                            </div>
                            <Select name="coachProvider" defaultValue={settings.coachProvider || "openai"}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="openai">OpenAI (Recommended)</SelectItem>
                                    <SelectItem value="gemini">Google Gemini</SelectItem>
                                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                                    <SelectItem value="groq">Groq</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Customer Bot Configuration */}
                        <div className="p-4 rounded-lg border bg-muted/10 space-y-4">
                            <div className="flex items-center gap-2 font-semibold text-sm">
                                <Plug className="h-4 w-4 text-blue-500" />
                                Customer Support Bot Provider
                            </div>
                            <Select name="customerProvider" defaultValue={settings.customerProvider || "groq"}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="openai">OpenAI</SelectItem>
                                    <SelectItem value="gemini">Google Gemini (Flash)</SelectItem>
                                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                                    <SelectItem value="groq">Groq (Recommended)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="pt-4 border-t space-y-4">
                        <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-amber-500" />
                            <h3 className="text-sm font-semibold">Bring Your Own Keys (BYOK)</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Entering your own keys removes platform token limits. Keys are encrypted. Leave blank to keep existing keys.
                        </p>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex justify-between items-center text-xs">
                                    OpenAI API Key
                                    {hasOpenAI && <span className="text-emerald-500 font-medium">Configured</span>}
                                </Label>
                                <Input type="password" name="openaiApiKey" placeholder="sk-..." className="text-sm" />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex justify-between items-center text-xs">
                                    Gemini API Key
                                    {hasGemini && <span className="text-emerald-500 font-medium">Configured</span>}
                                </Label>
                                <Input type="password" name="geminiApiKey" placeholder="AIzaSy..." className="text-sm" />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex justify-between items-center text-xs">
                                    OpenRouter API Key
                                    {hasOpenRouter && <span className="text-emerald-500 font-medium">Configured</span>}
                                </Label>
                                <Input type="password" name="openrouterApiKey" placeholder="sk-or-v1-..." className="text-sm" />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex justify-between items-center text-xs">
                                    Groq API Key
                                    {hasGroq && <span className="text-emerald-500 font-medium">Configured</span>}
                                </Label>
                                <Input type="password" name="groqApiKey" placeholder="gsk_..." className="text-sm" />
                            </div>
                        </div>
                    </div>

                    {!isBYOK && (
                        <div className="pt-4 border-t">
                            <div className="p-4 ml-0 rounded-lg border bg-muted/20 space-y-2 flex justify-between items-center">
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-amber-500" /> System Allocation limit
                                    </div>
                                    <div className="font-mono text-sm mt-1">{limit.toLocaleString()} Tokens</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-medium text-muted-foreground">Status</div>
                                    <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm mt-1">
                                        <CheckCircle2 className="h-4 w-4" /> Active
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end border-t p-4 bg-muted/10">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Save Configuration
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}

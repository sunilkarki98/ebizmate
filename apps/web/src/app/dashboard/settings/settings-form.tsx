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
        <form id="ai-settings-form" action={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            AI Engine Configuration
                        </CardTitle>
                        {isBYOK && <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">BYOK Active</Badge>}
                    </div>
                    <CardDescription>
                        {isBYOK
                            ? "You are using your own API keys. No strict token limits apply."
                            : "Your AI settings are currently managed by the EbizMate system."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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

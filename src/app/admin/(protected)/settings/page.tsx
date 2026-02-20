"use client";

import { useEffect, useState, useTransition } from "react";
import { getAISettingsAction, updateAISettingsAction, testProviderAction, fetchAvailableModelsAction, getUsageStatsAction } from "@/lib/ai-settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Key, Settings2, Zap, Activity, CheckCircle, XCircle, Loader2, Save, Info, Server, Cpu, RotateCcw, Plug } from "lucide-react";

const DEFAULT_SYSTEM_PROMPT_TEMPLATE = `You are the AI Customer Support Agent for "{{business_name}}".
{{context_header}}

Your Role:
- You are representing "{{business_name}}" to a customer on social media.
- Your goal is to answer queries, drive sales, and provide helpful support using the Knowledge Base below.
- You are NOT a generic AI. You are an employee of the company.

LANGUAGE RULE:
- ALWAYS reply in the SAME LANGUAGE as the user.
- Do not translate unless explicitly asked to.

CONVERSATION HISTORY:
{{historyContext}}

KNOWLEDGE BASE:
{{knowledge_base}}

INSTRUCTIONS:
1. Answer based ONLY on the context provided above.
2. If the answer is not in the Knowledge Base, say you don't know politely or ask for clarification.
3. **Be Human**: Write like a person texting/commenting, not a robot.
4. If you CANNOT answer based on the context, reply with: "ACTION_REQUIRED: ESCALATE"
`;

interface SettingsState {
    coachProvider: string;
    coachModel: string;
    customerProvider: string;
    customerModel: string;
    openaiApiKey: string;
    openaiApiKeySet: boolean;
    openaiModel: string;
    openaiEmbeddingModel: string;
    geminiApiKey: string;
    geminiApiKeySet: boolean;
    geminiModel: string;
    openrouterApiKey: string;
    openrouterApiKeySet: boolean;
    openrouterModel: string;
    groqApiKey: string;
    groqApiKeySet: boolean;
    groqModel: string;
    temperature: string;
    maxTokens: number;
    topP: string;
    systemPromptTemplate: string;
    rateLimitPerMinute: number;
    retryAttempts: number;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<SettingsState | null>(null);
    const [isSaving, startSaveTransition] = useTransition();
    const [isConnecting, startConnectTransition] = useTransition();
    const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
    const [usage, setUsage] = useState<{ last7Days: Array<Record<string, unknown>>; allTime: { totalCalls: number; totalTokens: number } } | null>(null);
    const [loading, setLoading] = useState(true);

    // Redesign State
    const [selectedProvider, setSelectedProvider] = useState<string>("openai");
    const [tempKey, setTempKey] = useState("");
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
    const [connectionMessage, setConnectionMessage] = useState("");

    useEffect(() => {
        loadSettings();
        loadUsage();
    }, []);

    async function loadSettings() {
        try {
            const data = await getAISettingsAction();
            setSettings({
                coachProvider: data.coachProvider || "openai",
                coachModel: data.coachModel || "gpt-4o-mini",
                customerProvider: data.customerProvider || "groq",
                customerModel: data.customerModel || "llama-3.3-70b-versatile",
                openaiApiKey: "",
                openaiApiKeySet: data.openaiApiKeySet,
                openaiModel: data.openaiModel,
                openaiEmbeddingModel: data.openaiEmbeddingModel,
                geminiApiKey: "",
                geminiApiKeySet: data.geminiApiKeySet,
                geminiModel: data.geminiModel,
                openrouterApiKey: "",
                openrouterApiKeySet: data.openrouterApiKeySet,
                openrouterModel: data.openrouterModel,
                groqApiKey: "",
                groqApiKeySet: data.groqApiKeySet,
                groqModel: data.groqModel,
                temperature: data.temperature,
                maxTokens: data.maxTokens,
                topP: data.topP,
                systemPromptTemplate: data.systemPromptTemplate || "",
                rateLimitPerMinute: data.rateLimitPerMinute,
                retryAttempts: data.retryAttempts,
            });
            // Default selected provider for the connection tab to whatever the coach uses
            setSelectedProvider(data.coachProvider || "openai");
        } catch (error) {
            console.error("Failed to load settings:", error);
        } finally {
            setLoading(false);
        }
    }

    async function loadUsage() {
        try {
            const data = await getUsageStatsAction();
            setUsage(data);
        } catch (error) {
            console.error("Failed to load usage:", error);
        }
    }

    // --- Connect & Fetch Models ---
    function handleConnect() {
        setConnectionStatus("idle");
        setConnectionMessage("");
        setAvailableModels([]);

        let currentInputKey = "";
        if (selectedProvider === "openai") currentInputKey = settings?.openaiApiKey || "";
        if (selectedProvider === "gemini") currentInputKey = settings?.geminiApiKey || "";
        if (selectedProvider === "openrouter") currentInputKey = settings?.openrouterApiKey || "";
        if (selectedProvider === "groq") currentInputKey = settings?.groqApiKey || "";

        const hasSavedKey =
            (selectedProvider === "openai" && settings?.openaiApiKeySet) ||
            (selectedProvider === "gemini" && settings?.geminiApiKeySet) ||
            (selectedProvider === "openrouter" && settings?.openrouterApiKeySet) ||
            (selectedProvider === "groq" && settings?.groqApiKeySet);

        const keyToUse = currentInputKey || (hasSavedKey ? "existing" : "");

        if (!keyToUse) {
            setConnectionStatus("error");
            setConnectionMessage(`Please enter a valid API Key for ${selectedProvider} in the Vault below first.`);
            return;
        }

        startConnectTransition(async () => {
            const result = await fetchAvailableModelsAction(selectedProvider, currentInputKey);
            if (result.success && result.models) {
                setAvailableModels(result.models);
                setConnectionStatus("success");
                setConnectionMessage("Connected! Select a model below.");
            } else {
                setConnectionStatus("error");
                setConnectionMessage(result.error || "Connection failed.");
            }
        });
    }

    function handleSave() {
        if (!settings) return;
        setSaveResult(null);

        startSaveTransition(async () => {
            const result = await updateAISettingsAction({
                coachProvider: settings.coachProvider,
                coachModel: settings.coachModel,
                customerProvider: settings.customerProvider,
                customerModel: settings.customerModel,
                openaiApiKey: settings.openaiApiKey || undefined,
                openaiModel: settings.openaiModel,
                openaiEmbeddingModel: settings.openaiEmbeddingModel,
                geminiApiKey: settings.geminiApiKey || undefined,
                geminiModel: settings.geminiModel,
                openrouterApiKey: settings.openrouterApiKey || undefined,
                openrouterModel: settings.openrouterModel,
                groqApiKey: settings.groqApiKey || undefined,
                groqModel: settings.groqModel,
                temperature: settings.temperature,
                maxTokens: settings.maxTokens,
                topP: settings.topP,
                systemPromptTemplate: settings.systemPromptTemplate || null,
                rateLimitPerMinute: settings.rateLimitPerMinute,
                retryAttempts: settings.retryAttempts,
            });

            if (result.error) {
                setSaveResult({ success: false, message: result.error });
            } else {
                setSaveResult({ success: true, message: "Settings saved successfully!" });
                setTempKey(""); // Clear sensitive input
                loadSettings(); // Reload to confirm state
            }
        });
    }

    const update = (field: keyof SettingsState, value: unknown) => {
        setSettings(prev => prev ? { ...prev, [field]: value } : prev);
        setSaveResult(null);
    };

    const handleResetPrompt = () => {
        if (!settings) return;
        if (confirm("Are you sure you want to reset the system prompt to the default template? This will verify the original setup.")) {
            update("systemPromptTemplate", DEFAULT_SYSTEM_PROMPT_TEMPLATE);
        }
    };

    if (loading || !settings) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const isApiKeySet = selectedProvider === "openai" ? settings.openaiApiKeySet : selectedProvider === "gemini" ? settings.geminiApiKeySet : selectedProvider === "openrouter" ? settings.openrouterApiKeySet : settings.groqApiKeySet;

    return (
        <TooltipProvider>
            <div className="space-y-8 pb-24">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Configuration</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage AI providers, models, and operational parameters.
                        </p>
                    </div>
                </div>

                {saveResult && (
                    <div className={`flex items-center gap-2 p-4 rounded-lg border text-sm ${saveResult.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-red-500/10 border-red-500/20 text-red-600"}`}>
                        {saveResult.success ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        <span className="font-medium">{saveResult.message}</span>
                    </div>
                )}

                <Tabs defaultValue="provider" className="w-full space-y-6">
                    <TabsList className="bg-muted p-1 rounded-lg inline-flex">
                        <TabsTrigger value="provider" className="gap-2 px-4 py-2"><Bot className="h-4 w-4" /> Connection</TabsTrigger>
                        <TabsTrigger value="parameters" className="gap-2 px-4 py-2"><Settings2 className="h-4 w-4" /> Parameters</TabsTrigger>
                        <TabsTrigger value="usage" className="gap-2 px-4 py-2"><Activity className="h-4 w-4" /> Usage</TabsTrigger>
                    </TabsList>

                    {/* REDESIGNED CONNECTION TAB */}
                    <TabsContent value="provider" className="space-y-6">
                        {/* Static model lists for UI simplicity (could be synced dynamically) */}
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Left: AI Coach Setup */}
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                            <Bot className="h-5 w-5 text-primary" /> AI Coach Brain
                                        </CardTitle>
                                        <CardDescription>Responsible for drafting plans, logic, and reasoning.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-4">
                                            <Label>Provider</Label>
                                            <Select value={settings.coachProvider} onValueChange={(val) => {
                                                update("coachProvider", val);
                                                setSelectedProvider(val);
                                            }}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a provider" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="openai">OpenAI (Recommended)</SelectItem>
                                                    <SelectItem value="gemini">Google Gemini</SelectItem>
                                                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                                                    <SelectItem value="groq">Groq</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label>Model (Name or ID)</Label>
                                                <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedProvider(settings.coachProvider); handleConnect(); }} disabled={isConnecting} className="hidden h-6 text-xs px-2 md:inline-flex">
                                                    {isConnecting && selectedProvider === settings.coachProvider ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />} Refresh List
                                                </Button>
                                            </div>
                                            {availableModels.length > 0 && selectedProvider === settings.coachProvider ? (
                                                <Select value={settings.coachModel} onValueChange={(val) => update("coachModel", val)}>
                                                    <SelectTrigger><SelectValue placeholder="Select a fetched model" /></SelectTrigger>
                                                    <SelectContent>
                                                        {availableModels.map(m => (
                                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input
                                                    type="text"
                                                    placeholder="e.g. gpt-4o, claude-3.5-sonnet"
                                                    value={settings.coachModel}
                                                    onChange={(e) => update("coachModel", e.target.value)}
                                                />
                                            )}
                                            <div className="flex justify-between items-center text-xs">
                                                <p className="text-muted-foreground">Type exact ID or refresh list.</p>
                                                <Button type="button" variant="link" size="sm" onClick={() => { setSelectedProvider(settings.coachProvider); handleConnect(); }} disabled={isConnecting} className="h-4 p-0 md:hidden">
                                                    {isConnecting && selectedProvider === settings.coachProvider ? "Fetching..." : "Fetch Models"}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Embedding Model (OpenAI Only) */}
                                        {settings.coachProvider === "openai" && (
                                            <div className="space-y-2 pt-2 border-t mt-2">
                                                <Label>Embedding Model (Knowledge Base)</Label>
                                                <Select value={settings.openaiEmbeddingModel} onValueChange={(val) => update("openaiEmbeddingModel", val)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                                                        <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                                                        <SelectItem value="text-embedding-ada-002">text-embedding-ada-002</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right: Customer Bot Setup */}
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                            <Plug className="h-5 w-5 text-blue-500" /> Customer Bot Brain
                                        </CardTitle>
                                        <CardDescription>Fast, lightweight bot for answering DMs and comments.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-4">
                                            <Label>Provider</Label>
                                            <Select value={settings.customerProvider} onValueChange={(val) => {
                                                update("customerProvider", val);
                                                setSelectedProvider(val);
                                            }}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a provider" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="openai">OpenAI</SelectItem>
                                                    <SelectItem value="gemini">Google Gemini (Flash Recommended)</SelectItem>
                                                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                                                    <SelectItem value="groq">Groq (Ultra-Fast Recommended)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label>Model (Name or ID)</Label>
                                                <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedProvider(settings.customerProvider); handleConnect(); }} disabled={isConnecting} className="hidden h-6 text-xs px-2 md:inline-flex">
                                                    {isConnecting && selectedProvider === settings.customerProvider ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />} Refresh List
                                                </Button>
                                            </div>
                                            {availableModels.length > 0 && selectedProvider === settings.customerProvider ? (
                                                <Select value={settings.customerModel} onValueChange={(val) => update("customerModel", val)}>
                                                    <SelectTrigger><SelectValue placeholder="Select a fetched model" /></SelectTrigger>
                                                    <SelectContent>
                                                        {availableModels.map(m => (
                                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input
                                                    type="text"
                                                    placeholder="e.g. llama-3.3-70b-versatile, gemini-2.0-flash"
                                                    value={settings.customerModel}
                                                    onChange={(e) => update("customerModel", e.target.value)}
                                                />
                                            )}
                                            <div className="flex justify-between items-center text-xs">
                                                <p className="text-muted-foreground">Type exact ID or refresh list.</p>
                                                <Button type="button" variant="link" size="sm" onClick={() => { setSelectedProvider(settings.customerProvider); handleConnect(); }} disabled={isConnecting} className="h-4 p-0 md:hidden">
                                                    {isConnecting && selectedProvider === settings.customerProvider ? "Fetching..." : "Fetch Models"}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Bottom: API Keys Vault */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <Key className="h-5 w-5 text-amber-500" /> API Key Vault
                                </CardTitle>
                                <CardDescription>Enter the secrets to unlock model usage above. Keys are encrypted at rest.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 grid md:grid-cols-2 gap-x-8">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>OpenAI API Key</Label>
                                        {settings.openaiApiKeySet && <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Active</Badge>}
                                    </div>
                                    <Input type="password" placeholder={settings.openaiApiKeySet ? "Key Set (Enter new to replace)" : "sk-..."} value={settings.openaiApiKey} onChange={(e) => update("openaiApiKey", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Google Gemini API Key</Label>
                                        {settings.geminiApiKeySet && <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Active</Badge>}
                                    </div>
                                    <Input type="password" placeholder={settings.geminiApiKeySet ? "Key Set (Enter new to replace)" : "AIzaSy..."} value={settings.geminiApiKey} onChange={(e) => update("geminiApiKey", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>OpenRouter API Key</Label>
                                        {settings.openrouterApiKeySet && <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Active</Badge>}
                                    </div>
                                    <Input type="password" placeholder={settings.openrouterApiKeySet ? "Key Set (Enter new to replace)" : "sk-or-v1-..."} value={settings.openrouterApiKey} onChange={(e) => update("openrouterApiKey", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Groq API Key</Label>
                                        {settings.groqApiKeySet && <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Active</Badge>}
                                    </div>
                                    <Input type="password" placeholder={settings.groqApiKeySet ? "Key Set (Enter new to replace)" : "gsk_..."} value={settings.groqApiKey} onChange={(e) => update("groqApiKey", e.target.value)} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* PARAMETERS TAB (Unchanged) */}
                    <TabsContent value="parameters" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold">Global Parameters</CardTitle>
                                <CardDescription>Fine-tune the behavior of AI responses across all providers.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-8 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="flex items-center gap-2">
                                                    Temperature
                                                    <Tooltip>
                                                        <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                                        <TooltipContent>Controls randomness. Lower is more focused, higher is more creative.</TooltipContent>
                                                    </Tooltip>
                                                </Label>
                                                <span className="text-sm font-medium text-muted-foreground">{settings.temperature}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="2"
                                                step="0.1"
                                                value={settings.temperature}
                                                onChange={(e) => update("temperature", e.target.value)}
                                                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="flex items-center gap-2">
                                                    Top P
                                                    <Tooltip>
                                                        <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                                        <TooltipContent>Nucleus sampling probability. Limits token choices to top probability mass.</TooltipContent>
                                                    </Tooltip>
                                                </Label>
                                                <span className="text-sm font-medium text-muted-foreground">{settings.topP}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                value={settings.topP}
                                                onChange={(e) => update("topP", e.target.value)}
                                                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                Max Tokens
                                                <Tooltip>
                                                    <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                                    <TooltipContent>Maximum number of tokens to generate in a single response.</TooltipContent>
                                                </Tooltip>
                                            </Label>
                                            <Input
                                                type="number"
                                                value={settings.maxTokens}
                                                onChange={(e) => update("maxTokens", parseInt(e.target.value) || 1024)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                Rate Limit (per min)
                                                <Tooltip>
                                                    <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                                    <TooltipContent>Maximum allowed requests per minute to prevent hitting provider limits.</TooltipContent>
                                                </Tooltip>
                                            </Label>
                                            <Input
                                                type="number"
                                                value={settings.rateLimitPerMinute}
                                                onChange={(e) => update("rateLimitPerMinute", parseInt(e.target.value) || 60)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                Retry Attempts
                                                <Tooltip>
                                                    <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                                    <TooltipContent>Number of times to automatically retry failed requests.</TooltipContent>
                                                </Tooltip>
                                            </Label>
                                            <Input
                                                type="number"
                                                value={settings.retryAttempts}
                                                onChange={(e) => update("retryAttempts", parseInt(e.target.value) || 3)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 space-y-3">
                                    <Label className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            System Prompt Template
                                            <Tooltip>
                                                <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                                <TooltipContent>Base instructions for the AI. Use placeholders like {"{{workspace_name}}"} for dynamic content.</TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={handleResetPrompt} className="h-8 gap-2 text-muted-foreground hover:text-foreground">
                                            <RotateCcw className="h-3 w-3" />
                                            Reset to Default
                                        </Button>
                                    </Label>
                                    <Textarea
                                        className="font-mono text-sm min-h-[300px] leading-relaxed resize-y"
                                        placeholder="Enter a custom system prompt..."
                                        value={settings.systemPromptTemplate}
                                        onChange={(e) => update("systemPromptTemplate", e.target.value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* USAGE TAB (Unchanged) */}
                    <TabsContent value="usage" className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold">Total Usage</CardTitle>
                                    <CardDescription>Lifetime token consumption stats.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {usage ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                                                <div className="text-3xl font-bold text-primary">{(usage.allTime.totalCalls).toLocaleString()}</div>
                                                <div className="text-sm font-medium text-muted-foreground mt-1">Total Calls</div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                                                <div className="text-3xl font-bold text-primary">{(usage.allTime.totalTokens).toLocaleString()}</div>
                                                <div className="text-sm font-medium text-muted-foreground mt-1">Total Tokens</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-24 flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
                                    <CardDescription>Usage over the last 7 days.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {usage?.last7Days && usage.last7Days.length > 0 ? (
                                        <div className="space-y-3">
                                            {usage.last7Days.map((row, i) => (
                                                <div key={i} className="flex items-center justify-between text-sm p-3 rounded-md bg-muted/40">
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="outline" className="text-xs capitalize">{String(row.provider)}</Badge>
                                                        <span className="font-medium">{String(row.operation)}</span>
                                                    </div>
                                                    <div className="text-muted-foreground text-right">
                                                        <div className="font-medium text-foreground">{Number(row.totalCalls)} calls</div>
                                                        <div className="text-xs">{Number(row.totalTokens).toLocaleString()} tokens</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-6">No recent activity detected.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background/80 backdrop-blur-md z-50 flex items-center justify-end gap-3 shadow-lg">
                    <Button onClick={handleSave} disabled={isSaving} className="gap-2 min-w-[140px]">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Configuration
                    </Button>
                </div>
            </div>
        </TooltipProvider>
    );
}

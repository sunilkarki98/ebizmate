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
import { TooltipProvider } from "@/components/ui/tooltip";
import { Bot, Settings2, Activity, CheckCircle, XCircle, Loader2, Save } from "lucide-react";

import { ConnectionTab } from "./components/ConnectionTab";
import { ParametersTab } from "./components/ParametersTab";
import { UsageTab } from "./components/UsageTab";

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

export interface SettingsState {
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
                        <ConnectionTab
                            settings={settings}
                            update={update}
                            selectedProvider={selectedProvider}
                            setSelectedProvider={setSelectedProvider}
                            handleConnect={handleConnect}
                            isConnecting={isConnecting}
                            availableModels={availableModels}
                        />
                    </TabsContent>

                    {/* PARAMETERS TAB */}
                    <TabsContent value="parameters" className="space-y-6">
                        <ParametersTab
                            settings={settings}
                            update={update}
                            handleResetPrompt={handleResetPrompt}
                        />
                    </TabsContent>

                    {/* USAGE TAB */}
                    <TabsContent value="usage" className="space-y-6">
                        <UsageTab usage={usage} />
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

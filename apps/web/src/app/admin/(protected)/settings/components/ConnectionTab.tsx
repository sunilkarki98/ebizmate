import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Bot, Key, Loader2, RotateCcw, Plug } from "lucide-react";
import { SettingsState } from "../page";

export function ConnectionTab({
    settings,
    update,
    selectedProvider,
    setSelectedProvider,
    handleConnect,
    isConnecting,
    availableModels
}: {
    settings: any;
    update: (field: keyof SettingsState, value: any) => void;
    selectedProvider: string;
    setSelectedProvider: (val: string) => void;
    handleConnect: () => void;
    isConnecting: boolean;
    availableModels: string[];
}) {
    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
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
        </div>
    );
}

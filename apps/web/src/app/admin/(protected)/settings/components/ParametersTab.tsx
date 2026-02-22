import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Info, RotateCcw } from "lucide-react";
import { SettingsState } from "../page";

export function ParametersTab({
    settings,
    update,
    handleResetPrompt
}: {
    settings: any;
    update: (field: keyof SettingsState, value: any) => void;
    handleResetPrompt: () => void;
}) {
    return (
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
    );
}

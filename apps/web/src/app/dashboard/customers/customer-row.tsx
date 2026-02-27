"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { PauseCircle, PlayCircle, Loader2 } from "lucide-react";
import { pauseAiForCustomerAction, resumeAiForCustomerAction } from "@/lib/customer-actions";

interface CustomerProps {
    customer: {
        id: string;
        platformHandle: string | null;
        name: string | null;
        platformId: string;
        firstInteractionAt: Date | null;
        lastInteractionAt: Date | null;
        aiPaused: boolean | null;
    };
    platform: string | null;
}

// Generates a beautiful, deterministic CSS gradient based on a string (customer name)
function stringToGradient(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c1 = `hsl(${hash % 360}, 80%, 75%)`;
    const c2 = `hsl(${(hash + 40) % 360}, 90%, 65%)`;
    return `linear-gradient(135deg, ${c1}, ${c2})`;
}

export function CustomerRow({ customer, platform }: CustomerProps) {
    const [isPending, startTransition] = useTransition();

    const handleToggle = () => {
        startTransition(async () => {
            if (customer.aiPaused) {
                await resumeAiForCustomerAction(customer.id);
            } else {
                await pauseAiForCustomerAction(customer.id);
            }
        });
    };

    return (
        <TableRow className="group hover:bg-muted/30 transition-all duration-200 border-border/40">
            <TableCell className="py-4">
                <div className="flex items-center gap-4">
                    <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-inner shrink-0 uppercase transition-transform group-hover:scale-105"
                        style={{ background: stringToGradient(customer.name || customer.platformHandle || "Anonymous") }}
                    >
                        {(customer.name || customer.platformHandle || "?").substring(0, 2)}
                    </div>
                    <div className="flex flex-col space-y-0.5">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                                {customer.name || "Anonymous User"}
                            </span>
                            {customer.aiPaused && (
                                <Badge variant="destructive" className="animate-pulse bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20 text-[10px] h-5 px-1.5 rounded-md shadow-sm">
                                    AI PAUSED
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <span className="bg-muted px-1.5 py-0.5 rounded-sm">@{customer.platformHandle}</span>
                        </div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-muted-foreground font-mono text-xs hidden md:table-cell py-4">
                <span className="bg-background border px-2 py-1 rounded-md shadow-sm">{customer.platformId}</span>
            </TableCell>
            <TableCell className="text-right text-muted-foreground hidden sm:table-cell text-sm py-4">
                {customer.firstInteractionAt ? new Date(customer.firstInteractionAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "-"}
            </TableCell>
            <TableCell className="text-right text-sm font-medium text-neutral-700 dark:text-neutral-300 py-4">
                {customer.lastInteractionAt ? new Date(customer.lastInteractionAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : "-"}
            </TableCell>
            <TableCell className="text-right pr-6 py-4">
                <Button
                    variant={customer.aiPaused ? "outline" : "ghost"}
                    size="icon"
                    onClick={handleToggle}
                    disabled={isPending}
                    className={`h-9 w-9 rounded-full transition-all duration-200 ${customer.aiPaused
                            ? "border-amber-500/50 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 hover:text-amber-700 shadow-sm"
                            : "text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-white dark:hover:bg-neutral-800"
                        }`}
                    title={customer.aiPaused ? "Resume AI Response" : "Pause AI Response"}
                >
                    {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : customer.aiPaused ? (
                        <PlayCircle className="h-4 w-4 fill-current opacity-20" />
                    ) : (
                        <PauseCircle className="h-4 w-4" />
                    )}
                </Button>
            </TableCell>
        </TableRow>
    );
}

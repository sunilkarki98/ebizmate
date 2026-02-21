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
        <TableRow className="hover:bg-muted/50 transition-colors">
            <TableCell>
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground shrink-0 border uppercase">
                        {(customer.name || customer.platformHandle || "?").substring(0, 2)}
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{customer.name || "Unknown"}</span>
                            {customer.aiPaused && (
                                <Badge variant="destructive" className="text-[10px] h-4 px-1 rounded-sm">PAUSED</Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {/* <PlatformIcon platform={platform} className="h-3 w-3" /> */}
                            <span>@{customer.platformHandle}</span>
                        </div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-muted-foreground font-mono text-xs hidden md:table-cell">
                {customer.platformId}
            </TableCell>
            <TableCell className="text-right text-muted-foreground hidden sm:table-cell text-xs">
                {customer.firstInteractionAt ? new Date(customer.firstInteractionAt).toLocaleDateString() : "-"}
            </TableCell>
            <TableCell className="text-right text-sm">
                {customer.lastInteractionAt ? new Date(customer.lastInteractionAt).toLocaleString() : "-"}
            </TableCell>
            <TableCell className="text-right">
                <Button
                    variant={customer.aiPaused ? "outline" : "ghost"}
                    size="sm"
                    onClick={handleToggle}
                    disabled={isPending}
                    className={`h-8 w-8 p-0 ${customer.aiPaused ? "border-amber-500 text-amber-600 hover:bg-amber-50" : "text-muted-foreground hover:text-foreground"}`}
                    title={customer.aiPaused ? "Resume AI Response" : "Pause AI Response"}
                >
                    {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : customer.aiPaused ? (
                        <PlayCircle className="h-4 w-4" />
                    ) : (
                        <PauseCircle className="h-4 w-4" />
                    )}
                </Button>
            </TableCell>
        </TableRow>
    );
}

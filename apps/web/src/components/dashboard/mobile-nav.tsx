"use client";

import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export function MobileNav({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    // Close sheet when navigation occurs
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 lg:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 border-r w-[280px]">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">Dashboard Navigation</SheetDescription>
                {children}
            </SheetContent>
        </Sheet>
    );
}

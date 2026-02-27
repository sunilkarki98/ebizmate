
import { auth, getBackendToken } from "@/lib/auth";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";
import { CustomerRow } from "./customer-row";

export default async function CustomersPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const backendUrl = process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001";
    const backendToken = await getBackendToken();

    // 1. Fetch Workspace (for platform logo context)
    const wsRes = await fetch(`${backendUrl}/settings/workspace`, {
        headers: { "Authorization": `Bearer ${backendToken}` },
        cache: 'no-store'
    });
    if (!wsRes.ok) return null;
    const workspace = await wsRes.json();

    // 2. Fetch Customers
    const custRes = await fetch(`${backendUrl}/ai/customer/all`, {
        headers: { "Authorization": `Bearer ${backendToken}` },
        cache: 'no-store'
    });

    // Default to empty array if API fails or has no customers
    const customerList = custRes.ok ? await custRes.json() : [];

    return (
        <div className="space-y-8 relative min-h-screen pb-12">
            {/* Decorative background gradients */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob" />
            <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-2000" />
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-4000" />

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 relative z-10 pt-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-500 dark:from-neutral-100 dark:to-neutral-500">
                        Customers
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Manage your relationships and monitor AI interactions.
                    </p>
                </div>
                <div className="flex items-center space-x-3 bg-background/60 backdrop-blur-xl border border-border/50 shadow-sm px-4 py-2 rounded-xl">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Reach</span>
                        <span className="text-sm font-bold leading-none">{customerList.length}</span>
                    </div>
                </div>
            </div>

            {/* Main Table Container (Glassmorphic) */}
            <div className="relative z-10 w-full rounded-2xl border border-border/50 bg-background/40 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/30 border-b border-border/50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="py-4 font-semibold text-neutral-700 dark:text-neutral-300">Customer Profile</TableHead>
                                <TableHead className="py-4 font-semibold text-neutral-700 dark:text-neutral-300 hidden md:table-cell">Platform ID</TableHead>
                                <TableHead className="py-4 font-semibold text-neutral-700 dark:text-neutral-300 text-right hidden sm:table-cell">First Seen</TableHead>
                                <TableHead className="py-4 font-semibold text-neutral-700 dark:text-neutral-300 text-right">Last Active</TableHead>
                                <TableHead className="py-4 font-semibold text-neutral-700 dark:text-neutral-300 text-right pr-6">AI Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customerList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                                            <Users className="h-8 w-8 opacity-20" />
                                            <p>No customers found yet.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                customerList.map((customer: any) => (
                                    <CustomerRow key={customer.id} customer={customer} platform={workspace.platform} />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

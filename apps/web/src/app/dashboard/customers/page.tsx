
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

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
                    <p className="text-muted-foreground">
                        People who have interacted with your bot.
                    </p>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground bg-secondary/50 px-3 py-1 rounded-md">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">{customerList.length} Total</span>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead className="hidden md:table-cell">Platform ID</TableHead>
                            <TableHead className="text-right hidden sm:table-cell">First Seen</TableHead>
                            <TableHead className="text-right">Last Active</TableHead>
                            <TableHead className="text-right w-[50px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {customerList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No customers found yet.
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
    );
}

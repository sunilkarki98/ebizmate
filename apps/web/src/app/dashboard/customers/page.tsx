
import { auth } from "@/lib/auth";
import { db } from "@ebizmate/db";
import { customers, workspaces } from "@ebizmate/db";
import { eq, desc } from "drizzle-orm";
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

    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, session.user.id),
    });

    if (!workspace) return null;

    const customerList = await db.query.customers.findMany({
        where: eq(customers.workspaceId, workspace.id),
        orderBy: desc(customers.lastInteractionAt),
        limit: 50,
    });

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
                            customerList.map((customer) => (
                                <CustomerRow key={customer.id} customer={customer} platform={workspace.platform} />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

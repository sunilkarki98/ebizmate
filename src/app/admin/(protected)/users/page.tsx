"use client";

import { useEffect, useState, useTransition } from "react";
import { getUsersAction, updateUserRoleAction } from "@/lib/admin-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Loader2 } from "lucide-react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type User = {
    id: string;
    name: string | null;
    email: string;
    role: string;
    createdAt: Date | null;
    image: string | null;
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        try {
            const data = await getUsersAction();
            setUsers(data);
        } finally {
            setLoading(false);
        }
    }

    function handleRoleChange(userId: string, newRole: "admin" | "user") {
        startTransition(async () => {
            const result = await updateUserRoleAction(userId, newRole);
            if (result.error) {
                alert(result.error);
            } else {
                loadUsers();
            }
        });
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground">Manage registered users and their roles.</p>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground bg-secondary/50 px-3 py-1 rounded-md">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">{users.length} Users</span>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {user.image && (
                                                    <img src={user.image} alt="" className="h-6 w-6 rounded-full" />
                                                )}
                                                {user.name || "—"}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {user.role === "admin" ? (
                                                <Badge variant="outline" className="border-primary text-primary">Admin Access</Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Standard User</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

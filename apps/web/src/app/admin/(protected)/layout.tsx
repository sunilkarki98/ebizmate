
import { SidebarAdmin } from "@/components/dashboard/sidebar-admin";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth('admin');
    const role = (session?.user as { role?: string })?.role;

    if (!session?.user) {
        redirect("/admin/login");
    }

    if (role !== "admin") {
        redirect("/dashboard"); // Kick non-admins out
    }

    return (
        <div className="flex min-h-screen">
            <SidebarAdmin className="hidden lg:block border-r w-64 shrink-0" />
            <div className="flex-1 flex flex-col min-h-screen">
                <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-muted/40 px-6">
                    <div className="w-full flex-1">
                        <h1 className="font-semibold text-lg text-primary">Platform Admin</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                            {session.user.name || session.user.email} (Admin)
                        </div>
                    </div>
                </header>
                <main className="flex-1 flex flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}


import { SidebarUser } from "@/components/dashboard/sidebar-user";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserNav } from "@/components/dashboard/user-nav";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { CoachWidget } from "@/components/dashboard/coach-widget";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect("/signin");
    }

    return (
        <div className="flex min-h-screen">
            <SidebarUser className="hidden lg:block border-r w-64 shrink-0" />
            <div className="flex-1 flex flex-col min-h-screen">
                <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-muted/40 px-4 lg:px-6">
                    <div className="flex lg:hidden flex-1">
                        <MobileNav>
                            <SidebarUser className="w-full min-h-full border-none pb-0" />
                        </MobileNav>
                    </div>
                    <div className="hidden lg:flex w-full flex-1">
                        {/* Title or Breadcrumb could go here */}
                    </div>
                    <div className="flex items-center gap-2">
                        <NotificationBell />
                        <UserNav user={session.user} />
                    </div>
                </header>
                <main className="flex-1 flex flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-x-hidden">
                    {children}
                </main>
            </div>
            {/* Global Coach Chat Widget */}
            <CoachWidget />
        </div>
    );
}

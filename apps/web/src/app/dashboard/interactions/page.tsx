import { auth } from "@/lib/auth";
import { getBackendToken } from "@/lib/auth";
import { Suspense } from "react";
import InboxClient from "./inbox-client";

export default async function InboxPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const backendUrl = process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001";
    const backendToken = await getBackendToken();

    // Fetch Workspace Info and Inbox Customers concurrently to prevent Waterfall latency
    const [wsRes, customersRes] = await Promise.all([
        fetch(`${backendUrl}/settings/workspace`, {
            headers: { "Authorization": `Bearer ${backendToken}` },
            cache: 'no-store'
        }),
        fetch(`${backendUrl}/inbox/customers`, {
            headers: { "Authorization": `Bearer ${backendToken}` },
            cache: 'no-store'
        })
    ]);

    if (!wsRes.ok) return null;
    const workspace = await wsRes.json();
    const customers = customersRes.ok ? await customersRes.json() : [];

    return (
        <div className="relative h-[calc(100vh-6rem)] -mt-2 -mx-2 flex flex-col overflow-hidden">
            {/* Decorative background gradients */}
            <div className="absolute top-0 -left-10 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob" />
            <div className="absolute top-0 -right-10 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-2000" />
            <div className="absolute -bottom-20 left-1/4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-4000" />

            <div className="relative z-10 flex-1 flex flex-col border border-border/50 rounded-2xl overflow-hidden bg-background/60 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] m-4 mb-8">
                <Suspense fallback={<div className="h-full flex items-center justify-center text-muted-foreground animate-pulse">Loading inbox...</div>}>
                    <InboxClient initialCustomers={customers} workspace={workspace} backendToken={backendToken} />
                </Suspense>
            </div>
        </div>
    );
}


import { auth, getBackendToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import CoachClient from "./coach-client";

export default async function CoachPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/signin");

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const backendToken = await getBackendToken();

    // Default intro message
    const defaultMessages = [
        {
            id: "intro",
            role: "coach" as const,
            content: "Hello! I'm your AI Coach. To get started and set up your systems, please tell me your Business Name and what industry you are in.",
        },
    ];

    // Fetch workspace info just in case we need it to know if they hold any setup
    const wsRes = await fetch(`${backendUrl}/settings/workspace`, {
        headers: { "Authorization": `Bearer ${backendToken}` },
        cache: 'no-store'
    });

    if (!wsRes.ok) {
        return <CoachClient initialMessages={defaultMessages} />;
    }

    // Fetch History
    const historyRes = await fetch(`${backendUrl}/ai/coach/history`, {
        headers: { "Authorization": `Bearer ${backendToken}` },
        cache: 'no-store'
    });

    const formattedMessages = historyRes.ok ? await historyRes.json() : [];

    const initialMessages = formattedMessages.length > 0 ? formattedMessages : defaultMessages;

    return <CoachClient initialMessages={initialMessages} />;
}

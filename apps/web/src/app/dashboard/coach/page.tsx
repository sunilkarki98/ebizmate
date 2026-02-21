
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@ebizmate/db";
import { workspaces, coachConversations } from "@ebizmate/db";
import { eq, desc } from "drizzle-orm";
import CoachClient from "./coach-client";

export default async function CoachPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/signin");

    // Fetch workspace
    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, session.user.id),
    });

    // Default intro message
    const defaultMessages = [
        {
            id: "intro",
            role: "coach" as const,
            content: "Hello! I'm your AI Coach. To get started and set up your systems, please tell me your Business Name and what industry you are in.",
        },
    ];

    if (!workspace) {
        return <CoachClient initialMessages={defaultMessages} />;
    }

    // Fetch last 50 messages from DB
    const dbMessages = await db.query.coachConversations.findMany({
        where: eq(coachConversations.workspaceId, workspace.id),
        orderBy: [desc(coachConversations.createdAt)],
        limit: 50,
    });

    // DB returns newest first, we want oldest first for UI
    const formattedMessages = dbMessages.reverse().map((m) => ({
        id: m.createdAt?.getTime().toString() || Date.now().toString(),
        role: m.role as "user" | "coach",
        content: m.content,
    }));

    const initialMessages = formattedMessages.length > 0 ? formattedMessages : defaultMessages;

    return <CoachClient initialMessages={initialMessages} />;
}

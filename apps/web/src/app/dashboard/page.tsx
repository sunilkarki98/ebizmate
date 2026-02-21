import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/signin");

    // Make the AI Coach the default landing page for onboarding
    redirect("/dashboard/coach");
}

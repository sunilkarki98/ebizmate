"use server";

import { auth } from "@/lib/auth";
import { db } from "@ebizmate/db";
import { interactions, workspaces, customers, posts } from "@ebizmate/db"; // Added posts
import { eq, and } from "drizzle-orm";


export async function simulateWebhookAction(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.userId, session.user.id)
    });

    if (!workspace) return { error: "Workspace not found" };

    const userId = formData.get("userId") as string;
    const userName = formData.get("userName") as string;
    const message = formData.get("message") as string;
    // New fields for Post Simulation
    const videoId = formData.get("videoId") as string;
    const postContent = formData.get("postContent") as string;

    // 1. Upsert Customer
    let customer = await db.query.customers.findFirst({
        where: and(
            eq(customers.workspaceId, workspace.id),
            eq(customers.platformId, userId)
        )
    });

    if (!customer) {
        // Create new customer
        const [newCustomer] = await db.insert(customers).values({
            workspaceId: workspace.id,
            platformId: userId,
            name: userName,
            platformHandle: userName.toLowerCase().replace(/\s+/g, ''),
        }).returning();
        customer = newCustomer;
    }

    // 2. Upsert Post (if provided)
    let postId = null;
    if (videoId) {
        // Check if post exists
        let post = await db.query.posts.findFirst({
            where: and(
                eq(posts.workspaceId, workspace.id),
                eq(posts.platformId, videoId)
            )
        });

        if (!post) {
            const [newPost] = await db.insert(posts).values({
                workspaceId: workspace.id,
                platformId: videoId,
                content: postContent || "No caption",
            }).returning();
            post = newPost;

            try {
                const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
                const response = await fetch(`${backendUrl}/ai/ingest`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${session.user.id}` // Use appropriate auth in production
                    },
                    body: JSON.stringify({ postId: post.id })
                });

                if (!response.ok) {
                    console.error("Ingestion API failed:", await response.text());
                }
            } catch (err) {
                console.error("Ingestion request failed:", err);
            }
        }
        postId = post.id;
    }

    // 3. Create Interaction (only if message exists)
    if (!message) {
        return { success: true, reply: "Post Processed & Ingested" };
    }

    const [interaction] = await db.insert(interactions).values({
        workspaceId: workspace.id,
        sourceId: videoId || "simulation",
        postId: postId, // Link to the post
        externalId: `sim-${Date.now()}`,
        authorId: userId,
        authorName: userName,
        content: message,
        status: "PENDING",
    }).returning();

    // 4. Process with AI via NestJS Backend
    try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(`${backendUrl}/ai/process`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Pass authorization. In a real app, Next.js would generate a JWT here
                "Authorization": `Bearer ${session.user.id}`
            },
            body: JSON.stringify({ interactionId: interaction.id })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to communicate with AI Backend");
        }

        return { success: true, reply: "Interaction queued for AI Processing" };
    } catch (error: any) {
        console.error("Simulation Processing Failed:", error);
        return { success: false, error: error.message || "AI Processing Failed" };
    }
}

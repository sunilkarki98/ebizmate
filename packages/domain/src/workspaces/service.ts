import { db, workspaces, users } from "@ebizmate/db";
import { eq } from "drizzle-orm";

/**
 * Helper to calculate trial end date (7 days from now)
 */
function getTrialEndDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
}

/**
 * Retrieves a workspace for a user.
 * If no workspace exists, it creates one (Lazy Sync).
 */
export async function getWorkspace(
  userId: string,
  userEmail?: string,
  userName?: string,
) {
  const userWorkspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.userId, userId),
  });

  if (userWorkspace) {
    return userWorkspace;
  }

  // Lazy create workspace if it doesn't exist
  const [newWorkspace] = await db.transaction(async (tx) => {
    const [userExists] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!userExists && userEmail) {
      await tx
        .insert(users)
        .values({
          id: userId,
          name: userName || "User",
          email: userEmail,
        })
        .onConflictDoNothing();
    }

    return tx
      .insert(workspaces)
      .values({
        userId,
        name: userName ? `${userName}'s Workspace` : "My Workspace",
        businessName: userName || "My Business",
        trialEndsAt: getTrialEndDate(),
      })
      .returning();
  });

  return newWorkspace;
}

export async function getWorkspaceDetailed(userId: string) {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.userId, userId),
    with: {
      aiSettings: true,
    },
  });

  if (!workspace) throw new Error("Workspace not found");
  return workspace;
}

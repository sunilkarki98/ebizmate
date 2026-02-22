import { relations } from "drizzle-orm/relations";
import { interactions, aiUsageLog, workspaces, customers, posts, items, users, sessions, auditLogs, feedbackQueue, aiSettings, accounts, coachConversations } from "./schema";

export const aiUsageLogRelations = relations(aiUsageLog, ({one}) => ({
	interaction: one(interactions, {
		fields: [aiUsageLog.interactionId],
		references: [interactions.id]
	}),
	workspace: one(workspaces, {
		fields: [aiUsageLog.workspaceId],
		references: [workspaces.id]
	}),
}));

export const interactionsRelations = relations(interactions, ({one, many}) => ({
	aiUsageLogs: many(aiUsageLog),
	feedbackQueues: many(feedbackQueue),
	post: one(posts, {
		fields: [interactions.postId],
		references: [posts.id]
	}),
	workspace: one(workspaces, {
		fields: [interactions.workspaceId],
		references: [workspaces.id]
	}),
}));

export const workspacesRelations = relations(workspaces, ({one, many}) => ({
	aiUsageLogs: many(aiUsageLog),
	customers: many(customers),
	posts: many(posts),
	items: many(items),
	user: one(users, {
		fields: [workspaces.userId],
		references: [users.id]
	}),
	feedbackQueues: many(feedbackQueue),
	aiSettings: many(aiSettings),
	coachConversations: many(coachConversations),
	interactions: many(interactions),
}));

export const customersRelations = relations(customers, ({one}) => ({
	workspace: one(workspaces, {
		fields: [customers.workspaceId],
		references: [workspaces.id]
	}),
}));

export const postsRelations = relations(posts, ({one, many}) => ({
	workspace: one(workspaces, {
		fields: [posts.workspaceId],
		references: [workspaces.id]
	}),
	interactions: many(interactions),
}));

export const itemsRelations = relations(items, ({one}) => ({
	workspace: one(workspaces, {
		fields: [items.workspaceId],
		references: [workspaces.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	sessions: many(sessions),
	auditLogs: many(auditLogs),
	workspaces: many(workspaces),
	accounts: many(accounts),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id]
	}),
}));

export const feedbackQueueRelations = relations(feedbackQueue, ({one}) => ({
	interaction: one(interactions, {
		fields: [feedbackQueue.interactionId],
		references: [interactions.id]
	}),
	workspace: one(workspaces, {
		fields: [feedbackQueue.workspaceId],
		references: [workspaces.id]
	}),
}));

export const aiSettingsRelations = relations(aiSettings, ({one}) => ({
	workspace: one(workspaces, {
		fields: [aiSettings.workspaceId],
		references: [workspaces.id]
	}),
}));

export const accountsRelations = relations(accounts, ({one}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
}));

export const coachConversationsRelations = relations(coachConversations, ({one}) => ({
	workspace: one(workspaces, {
		fields: [coachConversations.workspaceId],
		references: [workspaces.id]
	}),
}));
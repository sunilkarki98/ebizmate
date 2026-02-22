import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { getAIService } from './services/factory';
import type { ChatDto, GenerateEmbeddingDto, CoachChatDto, BatchIngestDto, TeachReplyDto } from './dto';
import { db, workspaces, coachConversations, interactions, customers, items } from '@ebizmate/db';
import { eq, desc } from 'drizzle-orm';
import { PlatformFactory, decrypt } from '@ebizmate/shared';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    constructor(@InjectQueue('ai') private readonly aiQueue: Queue) { }

    async processInteraction(interactionId: string): Promise<{ success: boolean }> {
        await this.aiQueue.add('process', { interactionId });
        this.logger.log(`Queued interaction processing: ${interactionId}`);
        return { success: true };
    }

    async generateEmbedding(workspaceId: string, dto: GenerateEmbeddingDto) {
        const ai = await getAIService(workspaceId, dto.botType);
        const result = await ai.embed(dto.input, dto.interactionId);

        return { success: true, embedding: result.embedding };
    }

    async chat(workspaceId: string, dto: ChatDto) {
        const ai = await getAIService(workspaceId, dto.botType);
        const result = await ai.chat({
            systemPrompt: dto.systemPrompt,
            userMessage: dto.userMessage,
            ...(dto.temperature !== undefined && { temperature: dto.temperature }),
        });

        return { success: true, content: result.content };
    }

    async coachChat(workspaceId: string, dto: CoachChatDto): Promise<{ success: boolean; reply: string }> {
        const { processCoachMessage } = await import('./coach/agent.js');
        const reply = await processCoachMessage(workspaceId, dto.message, dto.history);

        return { success: true, reply };
    }

    async getCoachHistory(userId: string) {
        const userWorkspace = await db.query.workspaces.findFirst({
            where: eq(workspaces.userId, userId)
        });

        if (!userWorkspace) return [];

        const messages = await db.query.coachConversations.findMany({
            where: eq(coachConversations.workspaceId, userWorkspace.id),
            orderBy: [desc(coachConversations.createdAt)],
            limit: 50,
        });

        return messages.reverse().map(m => ({
            id: m.id,
            role: m.role as "user" | "coach",
            content: m.content,
            createdAt: m.createdAt?.getTime() || Date.now()
        }));
    }

    async getCustomerInteractions(userId: string) {
        const userWorkspace = await db.query.workspaces.findFirst({
            where: eq(workspaces.userId, userId)
        });

        if (!userWorkspace) return [];

        const logs = await db.query.interactions.findMany({
            where: eq(interactions.workspaceId, userWorkspace.id),
            orderBy: [desc(interactions.createdAt)],
            limit: 50,
            with: {
                post: true,
            },
        });
        return logs;
    }

    async getCustomers(userId: string) {
        const userWorkspace = await db.query.workspaces.findFirst({
            where: eq(workspaces.userId, userId)
        });

        if (!userWorkspace) return [];

        const customerList = await db.query.customers.findMany({
            where: eq(customers.workspaceId, userWorkspace.id),
            orderBy: [desc(customers.lastInteractionAt)],
            limit: 50,
        });

        return customerList;
    }

    async getCustomer(userId: string, customerId: string) {
        const customer = await db.query.customers.findFirst({
            where: eq(customers.id, customerId),
            with: { workspace: true },
        });

        if (!customer) throw new Error("Customer not found");
        if (customer.workspace.userId !== userId) throw new Error("Unauthorized workspace access");

        return customer;
    }

    async setCustomerAiStatus(userId: string, customerId: string, pause: boolean) {
        const customer = await this.getCustomer(userId, customerId);

        await db.update(customers)
            .set({
                aiPaused: pause,
                conversationState: pause ? customer.conversationState : "IDLE"
            })
            .where(eq(customers.id, customerId));

        return { success: true };
    }

    async ingestPost(postId: string): Promise<{ success: boolean }> {
        await this.aiQueue.add('ingest', { postId });
        this.logger.log(`Queued post ingestion: ${postId}`);
        return { success: true };
    }

    async batchIngest(workspaceId: string, dto: BatchIngestDto): Promise<{ success: boolean; queued: boolean }> {
        await this.aiQueue.add('upload_batch', {
            workspaceId,
            sourceId: dto.sourceId,
            items: dto.items,
        });
        this.logger.log(`Queued batch ingestion for workspace: ${workspaceId}`);
        return { success: true, queued: true };
    }

    async testConnection() {
        const ai = await getAIService('global', 'customer');
        const result = await ai.chat({
            systemPrompt: 'You are a helpful assistant. Reply with exactly: CONNECTION_OK',
            userMessage: 'Test connection. Reply with: CONNECTION_OK',
        });

        return {
            success: true,
            provider: ai.settings.customerProvider,
            model: result.model,
            response: result.content.slice(0, 200),
        };
    }

    async teachAndReply(userId: string, dto: TeachReplyDto) {
        const interaction = await db.query.interactions.findFirst({
            where: eq(interactions.id, dto.interactionId),
            with: { workspace: true }
        });

        if (!interaction) throw new Error("Interaction not found");
        if (interaction.workspace.userId !== userId) throw new Error("Unauthorized workspace access");

        if (interaction.authorId) {
            try {
                let accessToken: string | undefined;
                if (interaction.workspace.accessToken) {
                    try { accessToken = decrypt(interaction.workspace.accessToken); }
                    catch { console.warn("Failed to decrypt workspace access token"); }
                }

                const client = PlatformFactory.getClient(interaction.workspace.platform || "generic", {
                    ...(accessToken !== undefined && { accessToken }),
                });
                await client.send({
                    to: interaction.authorId,
                    text: dto.humanResponse,
                    replyToMessageId: interaction.externalId,
                });
            } catch (error) {
                console.error("Failed to dispatch human reply:", error);
            }
        }

        await db.update(interactions)
            .set({
                response: dto.humanResponse,
                status: "PROCESSED",
            })
            .where(eq(interactions.id, dto.interactionId));

        if (interaction.content && interaction.content.length > 5) {
            const combinedText = `Q: ${interaction.content} A: ${dto.humanResponse}`;

            try {
                const ai = await getAIService(interaction.workspace.id, 'coach');
                const embedResult = await ai.embed(combinedText, interaction.id);

                await db.insert(items).values({
                    workspaceId: interaction.workspaceId,
                    name: interaction.content.substring(0, 80),
                    content: dto.humanResponse,
                    category: "faq",
                    sourceId: `interaction:${interaction.id}`,
                    embedding: embedResult.embedding,
                    meta: {
                        originalQuestion: interaction.content,
                        learnedAt: new Date().toISOString(),
                    }
                });
            } catch (err) {
                console.error("Failed to learn from interaction:", err);
            }
        }

        return { success: true };
    }
}

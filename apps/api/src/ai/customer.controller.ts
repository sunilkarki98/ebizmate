import { Controller, Post, Get, Body, UseGuards, Req, HttpException, HttpStatus, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { db } from "@ebizmate/db";
import { customers, interactions, workspaces } from "@ebizmate/db";
import { eq, and, asc } from "drizzle-orm";

@Controller('customer')
@UseGuards(JwtAuthGuard)
export class CustomerController {

    @Get(':platformId/conversation')
    async getConversation(
        @Req() req: AuthenticatedRequest,
        @Param('platformId') platformId: string,
    ) {
        try {
            const userId = req.user.userId;

            const workspace = await db.query.workspaces.findFirst({
                where: eq(workspaces.userId, userId),
            });

            if (!workspace) throw new Error("Workspace not found");

            const customer = await db.query.customers.findFirst({
                where: and(
                    eq(customers.workspaceId, workspace.id),
                    eq(customers.platformId, platformId)
                ),
                with: {
                    workspace: true,
                },
            });

            if (!customer) throw new Error("Customer not found");

            const history = await db.query.interactions.findMany({
                where: and(
                    eq(interactions.workspaceId, workspace.id),
                    eq(interactions.authorId, platformId)
                ),
                orderBy: asc(interactions.createdAt),
                with: {
                    post: true,
                }
            });

            return {
                success: true,
                customer: {
                    id: customer.id,
                    name: customer.name || customer.platformHandle || "Unknown",
                    handle: customer.platformHandle,
                    platform: customer.workspace.platform,
                    platformId: customer.platformId,
                    image: null as string | null
                },
                messages: history
            };

        } catch (error) {
            throw new HttpException(
                error instanceof Error ? error.message : 'Internal Server Error',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post(':id/resume')
    async resumeAi(
        @Req() req: AuthenticatedRequest,
        @Param('id') customerId: string,
    ) {
        try {
            const userId = req.user.userId;

            const customer = await db.query.customers.findFirst({
                where: eq(customers.id, customerId),
                with: { workspace: true },
            });

            if (!customer) throw new Error("Customer not found");
            if (customer.workspace.userId !== userId) {
                throw new Error("Unauthorized workspace access");
            }

            await db.update(customers)
                .set({
                    aiPaused: false,
                    aiPausedAt: null,
                    conversationState: "IDLE",
                    conversationContext: {},
                    updatedAt: new Date(),
                })
                .where(eq(customers.id, customerId));

            await db.insert(interactions).values({
                workspaceId: customer.workspaceId,
                sourceId: "system",
                externalId: `resume-ai-${Date.now()}`,
                authorId: customer.platformId,
                authorName: "System",
                content: "Human takeover ended",
                response: "AI has been resumed for this conversation. I'm back to assist! 🤖",
                status: "PROCESSED",
            });

            return { success: true };
        } catch (error) {
            throw new HttpException(
                error instanceof Error ? error.message : 'Internal Server Error',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post(':id/pause')
    async pauseAi(
        @Req() req: AuthenticatedRequest,
        @Param('id') customerId: string,
    ) {
        try {
            const userId = req.user.userId;

            const customer = await db.query.customers.findFirst({
                where: eq(customers.id, customerId),
                with: { workspace: true },
            });

            if (!customer) throw new Error("Customer not found");
            if (customer.workspace.userId !== userId) {
                throw new Error("Unauthorized workspace access");
            }

            await db.update(customers)
                .set({
                    aiPaused: true,
                    aiPausedAt: new Date(),
                    conversationState: "HUMAN_TAKEOVER",
                    updatedAt: new Date(),
                })
                .where(eq(customers.id, customerId));

            return { success: true };
        } catch (error) {
            throw new HttpException(
                error instanceof Error ? error.message : 'Internal Server Error',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}

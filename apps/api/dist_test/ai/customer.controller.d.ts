import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
export declare class CustomerController {
    getConversation(req: AuthenticatedRequest, platformId: string): Promise<{
        success: boolean;
        customer: {
            id: string;
            name: string;
            handle: string;
            platform: string;
            platformId: string;
            image: string | null;
        };
        messages: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: "PENDING" | "PROCESSED" | "IGNORED" | "FAILED" | "NEEDS_REVIEW" | "ACTION_REQUIRED" | "RESOLVED";
            workspaceId: string;
            sourceId: string;
            content: string;
            meta: unknown;
            postId: string;
            externalId: string;
            authorId: string;
            authorName: string;
            customerId: string;
            response: string;
            post: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                platformId: string;
                workspaceId: string;
                content: string;
                meta: unknown;
                transcript: string;
            };
        }[];
    }>;
    resumeAi(req: AuthenticatedRequest, customerId: string): Promise<{
        success: boolean;
    }>;
    pauseAi(req: AuthenticatedRequest, customerId: string): Promise<{
        success: boolean;
    }>;
}
//# sourceMappingURL=customer.controller.d.ts.map
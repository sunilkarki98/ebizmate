import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
export declare class ItemsController {
    private readonly itemsService;
    constructor(itemsService: ItemsService);
    private resolveWorkspaceId;
    getWorkspaceInfo(req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        platform: string;
        platformId: string;
        platformHandle: string;
        accessToken: string;
        businessName: string;
        industry: string;
        about: string;
        targetAudience: string;
        toneOfVoice: string;
        settings: {
            ai_active?: boolean;
            language?: string;
            systemPromptTemplate?: string;
        };
        allowGlobalAi: boolean;
        plan: "free" | "paid";
        status: "active" | "suspended" | "past_due";
        trialEndsAt: Date;
        customUsageLimit: number;
    }>;
    getAllItems(req: any): Promise<{
        id: string;
        name: string;
        content: string;
        category: string;
        sourceId: string;
        meta: unknown;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getRecentPosts(req: any, limit?: string): Promise<{
        id: string;
        workspaceId: string;
        platformId: string;
        content: string;
        transcript: string;
        meta: unknown;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    createItem(req: any, dto: CreateItemDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
        sourceId: string;
        content: string;
        category: string;
        meta: unknown;
        isVerified: boolean;
        relatedItemIds: unknown;
        embedding: number[];
        embeddingModel: string;
        expiresAt: Date;
    }>;
    updateItem(req: any, id: string, dto: UpdateItemDto): Promise<{
        id: string;
        workspaceId: string;
        sourceId: string;
        name: string;
        content: string;
        category: string;
        meta: unknown;
        isVerified: boolean;
        relatedItemIds: unknown;
        embedding: number[];
        embeddingModel: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date;
    }>;
    deleteItem(req: any, id: string): Promise<{
        success: boolean;
    }>;
}
//# sourceMappingURL=items.controller.d.ts.map
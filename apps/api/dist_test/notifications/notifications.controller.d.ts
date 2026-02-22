import { NotificationsService } from './notifications.service';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getNotifications(req: AuthenticatedRequest, limitArg?: string): Promise<{
        notifications: {
            id: string;
            type: "system" | "ingestion" | "escalation";
            title: string;
            message: string;
            createdAt: Date;
            interactionId: string;
            originalInteractionId: string;
        }[];
        unreadCount: number;
    }>;
}
//# sourceMappingURL=notifications.controller.d.ts.map
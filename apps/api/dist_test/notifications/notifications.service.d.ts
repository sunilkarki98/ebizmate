export declare class NotificationsService {
    getNotifications(userId: string, limit: number): Promise<{
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
//# sourceMappingURL=notifications.service.d.ts.map
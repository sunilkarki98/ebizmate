export declare class AuthSyncService {
    private readonly logger;
    syncUser(userId: string, email: string, name: string, image?: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
//# sourceMappingURL=auth-sync.service.d.ts.map
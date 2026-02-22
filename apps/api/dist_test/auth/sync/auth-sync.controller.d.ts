import { AuthSyncService } from './auth-sync.service';
import { SyncProfileDto } from './sync-profile.dto';
export declare class AuthSyncController {
    private readonly authSyncService;
    constructor(authSyncService: AuthSyncService);
    syncProfile(req: any, body: SyncProfileDto): Promise<{
        success: boolean;
        message: string;
    }>;
}
//# sourceMappingURL=auth-sync.controller.d.ts.map
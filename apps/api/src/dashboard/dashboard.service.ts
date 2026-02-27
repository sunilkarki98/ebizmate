import { Injectable } from '@nestjs/common';
import { DashboardDomain } from '@ebizmate/domain';

@Injectable()
export class DashboardService {
    async getOverview(userId: string, email?: string, name?: string) {
        return DashboardDomain.getDashboardOverview(userId, email, name);
    }
}

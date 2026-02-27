import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('overview')
    async getOverview(@Req() req: AuthenticatedRequest) {
        // req.user comes from jwt.strategy.ts and contains the JWT payload
        return this.dashboardService.getOverview(
            req.user.userId,
            req.user.email,
            req.user.name
        );
    }
}

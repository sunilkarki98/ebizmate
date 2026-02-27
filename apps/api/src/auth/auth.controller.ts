import { Controller, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { encrypt } from '@ebizmate/shared';
import { db, workspaces } from '@ebizmate/db';
import { eq } from 'drizzle-orm';

@Controller('auth')
export class AuthController {

    @Post('social/callback')
    @UseGuards(JwtAuthGuard)
    async handleSocialCallback(
        @Req() req: any,
        @Body() body: { platform: string; code: string; redirectUri: string }
    ) {
        const userId = req.user.id;
        if (!userId) throw new BadRequestException('User not found in token');

        const { platform, code } = body;
        if (!platform || !code) throw new BadRequestException('Platform and code required');

        // Note: In production, we would use `code` to POST to Meta/TikTok OAuth endpoints
        // to retrieve the long-lived `access_token`. 
        // For now, we simulate success and save a mock token.
        const mockAccessToken = `mock_${platform}_access_token_${Date.now()}`;

        // Get user's primary workspace
        const userWorkspaces = await db.select().from(workspaces).where(eq(workspaces.userId, userId));
        if (!userWorkspaces.length) {
            throw new BadRequestException('No workspace found for user');
        }

        const workspace = userWorkspaces[0];

        // Update the workspace with the new social token
        await db.update(workspaces)
            .set({
                platform: platform,
                accessToken: encrypt(mockAccessToken), // Encrypted with AES-256-GCM via @ebizmate/shared
                updatedAt: new Date()
            })
            .where(eq(workspaces.id, workspace.id));

        return { success: true, platform, message: 'OAuth integration successful' };
    }
}

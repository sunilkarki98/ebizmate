import { Controller, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { encrypt } from '@ebizmate/shared';
import { db, workspaces } from '@ebizmate/db';
import { eq } from 'drizzle-orm';
import { exchangeSocialOAuthCode } from './social-oauth.util';

@Controller('auth')
export class AuthController {

    @Post('social/callback')
    @UseGuards(JwtAuthGuard)
    async handleSocialCallback(
        @Req() req: { user: { id?: string; userId?: string; sub?: string } },
        @Body() body: { platform: string; code: string; redirectUri: string }
    ) {
        const userId = req.user.id ?? req.user.userId ?? req.user.sub;
        if (!userId) throw new BadRequestException('User not found in token');

        const { platform, code, redirectUri } = body;
        if (!platform || !code) throw new BadRequestException('Platform and code required');
        if (!redirectUri) throw new BadRequestException('redirectUri is required for token exchange');

        const accessToken = await exchangeSocialOAuthCode(platform, code, redirectUri);

        const userWorkspaces = await db.select().from(workspaces).where(eq(workspaces.userId, userId));
        if (!userWorkspaces.length) {
            throw new BadRequestException('No workspace found for user');
        }

        const workspace = userWorkspaces[0];

        await db.update(workspaces)
            .set({
                platform: platform,
                accessToken: encrypt(accessToken),
                updatedAt: new Date()
            })
            .where(eq(workspaces.id, workspace.id));

        return { success: true, platform, message: 'OAuth integration successful' };
    }
}

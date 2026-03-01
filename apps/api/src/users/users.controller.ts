import { Controller, Delete, Req, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Delete('me')
    async deleteMyAccount(@Req() req: any) {
        const userId = req.user.id;
        if (!userId) {
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        await this.usersService.deleteUserAccount(userId);
        return { success: true, message: 'Account and all associated data have been permanently deleted.' };
    }
}

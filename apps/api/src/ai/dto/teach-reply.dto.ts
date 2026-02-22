import { IsString, IsNotEmpty } from 'class-validator';

export class TeachReplyDto {
    @IsString()
    @IsNotEmpty()
    interactionId: string;

    @IsString()
    @IsNotEmpty()
    humanResponse: string;
}

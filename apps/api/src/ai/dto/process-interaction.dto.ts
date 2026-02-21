import { IsNotEmpty, IsString } from 'class-validator';

export class ProcessInteractionDto {
    @IsString()
    @IsNotEmpty()
    interactionId: string;
}

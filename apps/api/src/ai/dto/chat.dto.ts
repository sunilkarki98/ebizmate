import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ChatDto {
    @IsString()
    @IsNotEmpty()
    systemPrompt: string;

    @IsNotEmpty()
    userMessage: any;

    @IsOptional()
    @IsNumber()
    temperature?: number;

    @IsIn(['coach', 'customer'])
    botType: 'coach' | 'customer';
}

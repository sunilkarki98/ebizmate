import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateEmbeddingDto {
    @IsString()
    @IsNotEmpty()
    input: string;

    @IsIn(['coach', 'customer'])
    botType: 'coach' | 'customer';

    @IsOptional()
    @IsString()
    interactionId?: string;
}

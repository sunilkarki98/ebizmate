import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateProfileDto {
    @IsString()
    @IsNotEmpty()
    businessName: string;

    @IsString()
    @IsOptional()
    industry: string;

    @IsString()
    @IsOptional()
    about: string;

    @IsString()
    @IsOptional()
    targetAudience: string;

    @IsString()
    @IsOptional()
    toneOfVoice: string;
}

import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const validPlatforms = ['generic', 'tiktok', 'instagram', 'facebook', 'whatsapp'] as const;

export class UpdateIdentityDto {
    @ApiProperty({ description: 'The display name of the workspace/agency' })
    @IsString()
    @MinLength(2)
    workspaceName!: string;

    @ApiProperty({ enum: validPlatforms })
    @IsEnum(validPlatforms)
    platform!: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    platformHandle?: string;
}

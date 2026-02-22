import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateItemDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    content: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    category: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    sourceId?: string | null;

    @ApiPropertyOptional()
    @IsObject()
    @IsOptional()
    meta?: Record<string, any>;
}

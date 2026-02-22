import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const validProviders = ['openai', 'gemini', 'openrouter', 'groq'] as const;

export class UpdateAiSettingsDto {
    @ApiPropertyOptional({ enum: validProviders })
    @IsOptional()
    @IsEnum(validProviders)
    coachProvider?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    coachModel?: string;

    @ApiPropertyOptional({ enum: validProviders })
    @IsOptional()
    @IsEnum(validProviders)
    customerProvider?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    customerModel?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    openaiApiKey?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    openaiModel?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    openaiEmbeddingModel?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    geminiApiKey?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    geminiModel?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    openrouterApiKey?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    openrouterModel?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    groqApiKey?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    groqModel?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    temperature?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    maxTokens?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    topP?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    systemPromptTemplate?: string | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    rateLimitPerMinute?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    retryAttempts?: number;
}

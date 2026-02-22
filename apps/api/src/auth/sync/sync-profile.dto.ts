import { IsEmail, IsString, MaxLength, IsOptional, IsUrl } from 'class-validator';

export class SyncProfileDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MaxLength(100)
    name!: string;

    @IsOptional()
    @IsUrl()
    image?: string;
}

import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class BatchIngestDto {
    @IsString()
    @IsNotEmpty()
    sourceId: string;

    @IsArray()
    items: any[];
}

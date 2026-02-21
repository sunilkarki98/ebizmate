import { IsNotEmpty, IsString } from 'class-validator';

export class IngestPostDto {
    @IsString()
    @IsNotEmpty()
    postId: string;
}

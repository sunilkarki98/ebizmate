import { IsArray, IsIn, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CoachHistoryEntryDto {
    @IsIn(['user', 'coach'])
    role: 'user' | 'coach';

    @IsString()
    @IsNotEmpty()
    content: string;
}

export class CoachChatDto {
    @IsString()
    @IsNotEmpty()
    message: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CoachHistoryEntryDto)
    history: CoachHistoryEntryDto[];
}

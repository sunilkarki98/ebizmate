import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [AiModule],
    controllers: [ItemsController],
    providers: [ItemsService],
})
export class ItemsModule { }

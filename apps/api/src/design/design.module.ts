import { Module } from '@nestjs/common';
import { DesignController } from './design.controller';
import { DesignService } from './design.service';
import { LlmModule } from '../llm/llm.module';
import { ValidationModule } from '../validation/validation.module';

@Module({
  imports: [LlmModule, ValidationModule],
  controllers: [DesignController],
  providers: [DesignService],
})
export class DesignModule {}

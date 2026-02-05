import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DesignModule } from './design/design.module';
import { LlmModule } from './llm/llm.module';
import { ValidationModule } from './validation/validation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LlmModule,
    ValidationModule,
    DesignModule,
  ],
})
export class AppModule {}

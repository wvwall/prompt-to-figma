import { ApiProperty } from '@nestjs/swagger';

export class GenerateDesignDto {
  @ApiProperty({
    description: 'Prompt in linguaggio naturale per generare il design',
    example: 'Una card con titolo, descrizione e bottone primario blu',
  })
  prompt: string;
}

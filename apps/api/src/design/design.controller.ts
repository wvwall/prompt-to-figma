import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DesignService } from './design.service';
import { GenerateDesignDto } from './dto/generate-design.dto';
import type { PageDesign } from '@prompt-to-figma/shared';

@ApiTags('design')
@Controller('design')
export class DesignController {
  private readonly logger = new Logger(DesignController.name);

  constructor(private readonly designService: DesignService) {}

  @Post()
  @ApiOperation({ summary: 'Genera un design Figma da un prompt' })
  @ApiResponse({ status: 200, description: 'Design generato con successo (PageDesign JSON)' })
  @ApiResponse({ status: 400, description: 'Prompt mancante o invalido' })
  @ApiResponse({ status: 500, description: 'Errore generazione LLM' })
  async generate(@Body() dto: GenerateDesignDto): Promise<PageDesign> {
    // Pulisci il prompt da caratteri di controllo
    const cleanPrompt = dto.prompt?.replace(/[\x00-\x1F\x7F]/g, ' ').trim();
    this.logger.log(`POST /api/design - prompt: "${cleanPrompt?.substring(0, 50)}..."`);
    return this.designService.generate(cleanPrompt);
  }
}

import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { LlmService } from "../llm/llm.service";
import { ValidationService } from "../validation/validation.service";
import type { PageDesign } from "@prompt-to-figma/shared";

@Injectable()
export class DesignService {
  private readonly logger = new Logger(DesignService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly validationService: ValidationService,
  ) {}

  async generate(prompt: string): Promise<PageDesign> {
    if (!prompt || prompt.trim().length === 0) {
      throw new BadRequestException("Prompt is required");
    }

    this.logger.log(`Processing prompt: "${prompt.substring(0, 50)}..."`);

    // Primo tentativo
    let rawJson = await this.llmService.generateDesign(prompt);
    let result = this.validationService.process(rawJson);

    // Se fallisce, riprova una volta con prompt correttivo
    if (!result.success) {
      this.logger.warn(`First attempt failed: ${result.errors.join(", ")}`);
      this.logger.log("Retrying with correction prompt...");

      const correctionPrompt = `Il JSON precedente aveva questi errori: ${result.errors.join("; ")}. Rigenera il design per: "${prompt}" Assicurati che il JSON sia valido e segua lo schema.`;

      rawJson = await this.llmService.generateDesign(correctionPrompt);
      result = this.validationService.process(rawJson);
    }

    // Se ancora fallisce, errore
    if (!result.success) {
      this.logger.error(
        `Generation failed after retry: ${result.errors.join(", ")}`,
      );
      throw new InternalServerErrorException({
        message: "Failed to generate valid design",
        errors: result.errors,
      });
    }

    this.logger.log(`Successfully generated design: ${result.data.meta.name}`);
    return result.data;
  }
}

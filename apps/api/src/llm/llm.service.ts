import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from './prompts/system-prompt';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    this.ai = new GoogleGenAI({ apiKey });
    this.model = this.configService.get<string>('GOOGLE_AI_MODEL') || 'gemini-2.0-flash';
  }

  async generateDesign(prompt: string): Promise<string> {
    this.logger.log(`Generating design for prompt: "${prompt.substring(0, 50)}..."`);

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: 16384,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from LLM');
    }

    this.logger.log(`Generated ${text.length} characters`);
    return text;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { pageDesignSchema } from './schemas/page-design.schema';
import type { PageDesign } from '@prompt-to-figma/shared';

export type ValidationResult =
  | { success: true; data: PageDesign }
  | { success: false; errors: string[] };

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  /**
   * Pipeline completa: parse → sanitize → validate
   */
  process(raw: string): ValidationResult {
    // 1. Parse JSON
    const parsed = this.parseJson(raw);
    if (!parsed) {
      return { success: false, errors: ['Invalid JSON format'] };
    }

    // 2. Sanitize
    const sanitized = this.sanitize(parsed);

    // 3. Validate
    const result = pageDesignSchema.safeParse(sanitized);
    if (!result.success) {
      const errors = result.error.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`
      );
      this.logger.warn(`Validation failed: ${errors.join(', ')}`);
      return { success: false, errors };
    }

    return { success: true, data: result.data as PageDesign };
  }

  /**
   * Parse JSON, gestendo eventuali wrapper markdown
   */
  private parseJson(raw: string): any | null {
    try {
      // Rimuovi eventuale wrapper ```json ... ```
      let cleaned = raw.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      return JSON.parse(cleaned);
    } catch (e) {
      this.logger.error(`JSON parse error: ${e}`);
      return null;
    }
  }

  /**
   * Sanitizza l'oggetto prima della validazione
   */
  private sanitize(obj: any): any {
    // Deep clone per non mutare l'originale
    const result = JSON.parse(JSON.stringify(obj));

    // Fix schemaVersion mancante
    if (!result.schemaVersion) {
      result.schemaVersion = '1.0';
    }

    // Fix meta mancante
    if (!result.meta) {
      result.meta = {};
    }
    if (!result.meta.name) {
      result.meta.name = 'Generated Design';
    }
    if (!result.meta.generatedAt) {
      result.meta.generatedAt = new Date().toISOString();
    }

    // Fix canvas mancante
    if (!result.canvas) {
      result.canvas = { width: 1440, height: 900 };
    }

    // Sanitizza i nodi ricorsivamente
    if (result.root) {
      this.sanitizeNode(result.root);
    }

    return result;
  }

  /**
   * Sanitizza un nodo ricorsivamente
   */
  private sanitizeNode(node: any): void {
    if (!node || typeof node !== 'object') return;

    // Fix colori
    this.fixColors(node);

    // Fix sizing mancante per text nodes
    if (node.type === 'text' && !node.sizing) {
      node.sizing = { width: 'hug', height: 'hug' };
    }

    // Fix typography
    if (node.text?.typography) {
      const t = node.text.typography;
      if (!t.family) t.family = 'Inter';
      if (!t.weight) t.weight = 'regular';
      if (!t.size) t.size = 16;
    }

    // Ricorri sui figli
    if (Array.isArray(node.children)) {
      node.children.forEach((child: any) => this.sanitizeNode(child));
    }
  }

  /**
   * Fix colori non validi
   */
  private fixColors(node: any): void {
    // Fix style.fill.color
    if (node.style?.fill?.color) {
      node.style.fill.color = this.normalizeHexColor(node.style.fill.color);
    }

    // Fix style.stroke.color
    if (node.style?.stroke?.color) {
      node.style.stroke.color = this.normalizeHexColor(node.style.stroke.color);
    }

    // Fix style.shadow.color
    if (node.style?.shadow?.color) {
      node.style.shadow.color = this.normalizeHexColor(node.style.shadow.color);
    }

    // Fix text.color
    if (node.text?.color) {
      node.text.color = this.normalizeHexColor(node.text.color);
    }

    // Fix gradient stops
    if (node.style?.fill?.gradientStops) {
      node.style.fill.gradientStops.forEach((stop: any) => {
        if (stop.color) {
          stop.color = this.normalizeHexColor(stop.color);
        }
      });
    }
  }

  /**
   * Normalizza un colore hex
   * - Aggiunge # se mancante
   * - Espande shorthand (#FFF → #FFFFFF)
   */
  private normalizeHexColor(color: string): string {
    if (!color) return '#000000';

    let hex = color.trim();

    // Aggiungi # se mancante
    if (!hex.startsWith('#')) {
      hex = '#' + hex;
    }

    // Espandi shorthand (#RGB → #RRGGBB)
    if (hex.length === 4) {
      const r = hex[1];
      const g = hex[2];
      const b = hex[3];
      hex = `#${r}${r}${g}${g}${b}${b}`;
    }

    // Valida formato finale
    if (!/^#[A-Fa-f0-9]{6,8}$/.test(hex)) {
      this.logger.warn(`Invalid color "${color}", using fallback`);
      return '#000000';
    }

    return hex.toUpperCase();
  }
}

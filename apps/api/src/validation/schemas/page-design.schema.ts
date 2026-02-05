import { z } from 'zod';

// ============================================================================
// HELPERS
// ============================================================================

const hexColorSchema = z.string().regex(/^#[A-Fa-f0-9]{6,8}$/, 'Invalid hex color');

// ============================================================================
// STYLE SCHEMAS
// ============================================================================

const fillStyleSchema = z.object({
  type: z.enum(['solid', 'gradient']),
  color: z.string().optional(),
  gradientStops: z.array(z.object({
    color: z.string(),
    position: z.number(),
  })).optional(),
  gradientAngle: z.number().optional(),
});

const strokeStyleSchema = z.object({
  color: z.string(),
  weight: z.number(),
  position: z.enum(['inside', 'outside', 'center']).optional(),
});

const shadowStyleSchema = z.object({
  type: z.enum(['drop', 'inner']),
  color: z.string(),
  offsetX: z.number(),
  offsetY: z.number(),
  blur: z.number(),
  spread: z.number().optional(),
});

const nodeStyleSchema = z.object({
  fill: fillStyleSchema.optional(),
  stroke: strokeStyleSchema.optional(),
  shadow: shadowStyleSchema.optional(),
  cornerRadius: z.union([z.number(), z.tuple([z.number(), z.number(), z.number(), z.number()])]).optional(),
  opacity: z.number().min(0).max(1).optional(),
});

// ============================================================================
// LAYOUT SCHEMAS
// ============================================================================

const layoutConfigSchema = z.object({
  direction: z.enum(['horizontal', 'vertical', 'none']),
  align: z.enum(['start', 'center', 'end', 'space-between']).optional(),
  crossAlign: z.enum(['start', 'center', 'end', 'stretch']).optional(),
  gap: z.number().optional(),
  padding: z.union([z.number(), z.tuple([z.number(), z.number(), z.number(), z.number()])]).optional(),
  wrap: z.boolean().optional(),
});

const sizingConfigSchema = z.object({
  width: z.enum(['fixed', 'hug', 'fill']),
  height: z.enum(['fixed', 'hug', 'fill']),
  minWidth: z.number().optional(),
  maxWidth: z.number().optional(),
  minHeight: z.number().optional(),
  maxHeight: z.number().optional(),
});

// ============================================================================
// NODE SCHEMAS
// ============================================================================

const typographySchema = z.object({
  family: z.enum(['Inter', 'Roboto', 'Open Sans', 'Poppins']),
  weight: z.enum(['regular', 'medium', 'semibold', 'bold']),
  size: z.number(),
  lineHeight: z.number().optional(),
});

const textContentSchema = z.object({
  content: z.string(),
  typography: typographySchema.optional(),
  color: z.string().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
});

const imageContentSchema = z.object({
  url: z.string().optional(),
  placeholder: z.boolean().optional(),
  scaleMode: z.enum(['fill', 'fit', 'crop', 'tile']).optional(),
});

// Base node fields
const baseNodeFields = {
  id: z.string().optional(),
  name: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  layout: layoutConfigSchema.optional(),
  sizing: sizingConfigSchema.optional(),
  style: nodeStyleSchema.optional(),
};

// Recursive UINode schema
const uiNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.discriminatedUnion('type', [
    // Frame
    z.object({
      ...baseNodeFields,
      type: z.literal('frame'),
      children: z.array(uiNodeSchema).optional(),
    }),
    // Text
    z.object({
      ...baseNodeFields,
      type: z.literal('text'),
      text: textContentSchema,
    }),
    // Rectangle
    z.object({
      ...baseNodeFields,
      type: z.literal('rectangle'),
    }),
    // Image
    z.object({
      ...baseNodeFields,
      type: z.literal('image'),
      image: imageContentSchema,
    }),
    // Component
    z.object({
      ...baseNodeFields,
      type: z.literal('component'),
      componentKey: z.string().optional(),
      children: z.array(uiNodeSchema).optional(),
    }),
  ])
);

// ============================================================================
// PAGE DESIGN SCHEMA
// ============================================================================

export const pageDesignSchema = z.object({
  schemaVersion: z.literal('1.0'),
  meta: z.object({
    name: z.string(),
    description: z.string().optional(),
    generatedAt: z.string(),
    promptHash: z.string().optional(),
  }),
  tokens: z.object({
    colors: z.record(z.string()).optional(),
    typography: z.record(typographySchema).optional(),
    spacing: z.record(z.number()).optional(),
  }).optional(),
  canvas: z.object({
    width: z.number(),
    height: z.number(),
  }),
  root: uiNodeSchema,
});

export type PageDesignSchema = z.infer<typeof pageDesignSchema>;

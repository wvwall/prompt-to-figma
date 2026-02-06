/**
 * @prompt-to-figma/shared
 * 
 * Schema intermedio tra LLM e Figma Plugin.
 * L'AI genera questo JSON, il plugin lo renderizza deterministicamente.
 * 
 * REGOLA D'ORO: L'AI sceglie tra opzioni predefinite, non inventa strutture.
 */

// ============================================================================
// DESIGN TOKENS
// ============================================================================

export interface ColorToken {
  hex: string; // es. "#3B82F6"
}

export interface TypographyToken {
  family: 'Inter' | 'Roboto' | 'Open Sans' | 'Poppins';
  weight: 'regular' | 'medium' | 'semibold' | 'bold';
  size: number;
  lineHeight?: number;
}

export interface SpacingScale {
  xs: number;  // 4
  sm: number;  // 8
  md: number;  // 16
  lg: number;  // 24
  xl: number;  // 32
  '2xl': number; // 48
  '3xl': number; // 64
}

// ============================================================================
// LAYOUT SYSTEM
// ============================================================================

export type LayoutDirection = 'horizontal' | 'vertical' | 'none';

export type AxisAlignment = 'start' | 'center' | 'end' | 'space-between';

export type CrossAlignment = 'start' | 'center' | 'end' | 'stretch';

export type SizingMode = 'fixed' | 'hug' | 'fill';

export interface LayoutConfig {
  direction: LayoutDirection;
  align?: AxisAlignment;        // default: 'start'
  crossAlign?: CrossAlignment;  // default: 'start'
  gap?: number;                 // spacing tra figli
  padding?: number | [number, number, number, number]; // uniform o [top, right, bottom, left]
  wrap?: boolean;               // solo per horizontal
}

export interface SizingConfig {
  width: SizingMode;
  height: SizingMode;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

// ============================================================================
// STYLE PROPERTIES
// ============================================================================

export interface FillStyle {
  type: 'solid' | 'gradient';
  color?: string;               // hex per solid
  gradientStops?: Array<{ color: string; position: number }>;
  gradientAngle?: number;       // gradi, default 180
}

export interface StrokeStyle {
  color: string;
  weight: number;
  position?: 'inside' | 'outside' | 'center';
}

export interface ShadowStyle {
  type: 'drop' | 'inner';
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread?: number;
}

export interface NodeStyle {
  fill?: FillStyle;
  stroke?: StrokeStyle;
  shadow?: ShadowStyle;
  cornerRadius?: number | [number, number, number, number];
  opacity?: number;             // 0-1
}

// ============================================================================
// NODE TYPES
// ============================================================================

export type NodeType = 'frame' | 'text' | 'rectangle' | 'image' | 'component';

interface BaseNode {
  id?: string;                  // generato se non fornito
  name?: string;
  type: NodeType;
  
  // Dimensioni esplicite (usate se sizing.width/height = 'fixed')
  width?: number;
  height?: number;
  
  // Layout (se il nodo è un container)
  layout?: LayoutConfig;
  
  // Come questo nodo si comporta nel parent auto-layout
  sizing?: SizingConfig;
  
  // Stile visivo
  style?: NodeStyle;
  
  // Figli (solo per frame/component)
  children?: UINode[];
}

// ---- Frame ----
export interface FrameNode extends BaseNode {
  type: 'frame';
  children?: UINode[];
}

// ---- Text ----
export interface TextContent {
  content: string;
  typography?: TypographyToken;
  color?: string;               // hex
  align?: 'left' | 'center' | 'right';
}

export interface TextNode extends BaseNode {
  type: 'text';
  text: TextContent;
}

// ---- Rectangle ----
export interface RectangleNode extends BaseNode {
  type: 'rectangle';
}

// ---- Image ----
export interface ImageNode extends BaseNode {
  type: 'image';
  image: {
    url?: string;               // URL esterno
    placeholder?: boolean;      // se true, usa placeholder grigio
    scaleMode?: 'fill' | 'fit' | 'crop' | 'tile';
  };
}

// ---- Component (riutilizzabile) ----
export interface ComponentNode extends BaseNode {
  type: 'component';
  componentKey?: string;        // riferimento a componente esistente
  children?: UINode[];
}

// Union type per tutti i nodi
export type UINode = FrameNode | TextNode | RectangleNode | ImageNode | ComponentNode;

// ============================================================================
// DOCUMENT STRUCTURE
// ============================================================================

export interface PageDesign {
  /** Versione dello schema */
  schemaVersion: '1.0';
  
  /** Metadata */
  meta: {
    name: string;
    description?: string;
    generatedAt: string;        // ISO timestamp
    promptHash?: string;        // per tracciabilità
  };
  
  /** Design tokens usati nel documento */
  tokens?: {
    colors?: Record<string, string>;
    typography?: Record<string, TypographyToken>;
    spacing?: Partial<SpacingScale>;
  };
  
  /** Canvas size */
  canvas: {
    width: number;
    height: number;
  };
  
  /** Root node */
  root: UINode;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(color);
}

export function isFrameNode(node: UINode): node is FrameNode {
  return node.type === 'frame';
}

export function isTextNode(node: UINode): node is TextNode {
  return node.type === 'text';
}

export function hasChildren(node: UINode): node is FrameNode | ComponentNode {
  return node.type === 'frame' || node.type === 'component';
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULTS = {
  typography: {
    family: 'Inter' as const,
    weight: 'regular' as const,
    size: 16,
    lineHeight: 1.5,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  } satisfies SpacingScale,
  colors: {
    background: '#FFFFFF',
    text: '#1F2937',
    primary: '#3B82F6',
    secondary: '#6B7280',
    border: '#E5E7EB',
  },
  canvas: {
    desktop: { width: 1440, height: 900 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 812 },
  },
} as const;

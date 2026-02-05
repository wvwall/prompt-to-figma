/**
 * Prompt to Figma - Plugin Renderer
 *
 * Converte il JSON schema in nodi Figma.
 * Questo codice gira nel sandbox Figma, NON ha accesso a DOM o fetch.
 */

import type {
  PageDesign,
  UINode,
  FrameNode as SchemaFrameNode,
  TextNode as SchemaTextNode,
  RectangleNode as SchemaRectangleNode,
  ImageNode as SchemaImageNode,
  LayoutConfig,
  SizingConfig,
  NodeStyle,
  FillStyle,
  TextContent,
  TypographyToken,
  DEFAULTS,
} from "@prompt-to-figma/shared";

// ============================================================================
// FONT MANAGEMENT
// ============================================================================

const SUPPORTED_FONTS: Record<string, Record<string, FontName>> = {
  Inter: {
    regular: { family: "Inter", style: "Regular" },
    medium: { family: "Inter", style: "Medium" },
    semibold: { family: "Inter", style: "Semi Bold" },
    bold: { family: "Inter", style: "Bold" },
  },
  Roboto: {
    regular: { family: "Roboto", style: "Regular" },
    medium: { family: "Roboto", style: "Medium" },
    bold: { family: "Roboto", style: "Bold" },
  },
};

const loadedFonts = new Set<string>();

async function ensureFontLoaded(
  family: string,
  weight: string,
): Promise<FontName> {
  const fontKey = `${family}-${weight}`;
  const fontConfig =
    SUPPORTED_FONTS[family]?.[weight] || SUPPORTED_FONTS["Inter"]["regular"];

  if (!loadedFonts.has(fontKey)) {
    try {
      await figma.loadFontAsync(fontConfig);
      loadedFonts.add(fontKey);
    } catch (e) {
      console.warn(
        `Font ${fontKey} not available, falling back to Inter Regular`,
      );
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      return { family: "Inter", style: "Regular" };
    }
  }

  return fontConfig;
}

async function preloadAllFonts(): Promise<void> {
  const defaultFonts = [
    { family: "Inter", style: "Regular" },
    { family: "Inter", style: "Medium" },
    { family: "Inter", style: "Semi Bold" },
    { family: "Inter", style: "Bold" },
  ];

  await Promise.all(
    defaultFonts.map((f) => figma.loadFontAsync(f).catch(() => {})),
  );
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  };
}

function createSolidPaint(hex: string): SolidPaint {
  return {
    type: "SOLID",
    color: hexToRgb(hex),
  };
}

// ============================================================================
// LAYOUT MAPPING
// ============================================================================

function applyLayout(frame: FrameNode, layout: LayoutConfig): void {
  if (layout.direction === "none") {
    frame.layoutMode = "NONE";
    return;
  }

  // Direction
  frame.layoutMode =
    layout.direction === "horizontal" ? "HORIZONTAL" : "VERTICAL";

  // Padding
  if (layout.padding !== undefined) {
    if (typeof layout.padding === "number") {
      frame.paddingTop = layout.padding;
      frame.paddingRight = layout.padding;
      frame.paddingBottom = layout.padding;
      frame.paddingLeft = layout.padding;
    } else {
      frame.paddingTop = layout.padding[0];
      frame.paddingRight = layout.padding[1];
      frame.paddingBottom = layout.padding[2];
      frame.paddingLeft = layout.padding[3];
    }
  }

  // Gap
  if (layout.gap !== undefined) {
    frame.itemSpacing = layout.gap;
  }

  // Primary axis alignment
  const alignMap: Record<string, "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN"> = {
    start: "MIN",
    center: "CENTER",
    end: "MAX",
    "space-between": "SPACE_BETWEEN",
  };
  frame.primaryAxisAlignItems = alignMap[layout.align || "start"];

  // Cross axis alignment
  const crossAlignMap: Record<string, "MIN" | "CENTER" | "MAX"> = {
    start: "MIN",
    center: "CENTER",
    end: "MAX",
    stretch: "MIN", // stretch è gestito sui figli
  };
  frame.counterAxisAlignItems = crossAlignMap[layout.crossAlign || "start"];

  // Wrap
  if (layout.wrap && layout.direction === "horizontal") {
    frame.layoutWrap = "WRAP";
  }
}

function applySizing(
  node: SceneNode,
  sizing: SizingConfig | undefined,
  parent: FrameNode | null,
): void {
  if (!sizing) return;

  // Se il parent ha auto-layout, usiamo layoutSizing
  if (
    parent &&
    parent.layoutMode !== "NONE" &&
    "layoutSizingHorizontal" in node
  ) {
    const sizingMap: Record<string, "FIXED" | "HUG" | "FILL"> = {
      fixed: "FIXED",
      hug: "HUG",
      fill: "FILL",
    };

    (node as FrameNode).layoutSizingHorizontal = sizingMap[sizing.width];
    (node as FrameNode).layoutSizingVertical = sizingMap[sizing.height];
  }

  // Min/Max constraints
  if ("minWidth" in node) {
    if (sizing.minWidth !== undefined)
      (node as FrameNode).minWidth = sizing.minWidth;
    if (sizing.maxWidth !== undefined)
      (node as FrameNode).maxWidth = sizing.maxWidth;
    if (sizing.minHeight !== undefined)
      (node as FrameNode).minHeight = sizing.minHeight;
    if (sizing.maxHeight !== undefined)
      (node as FrameNode).maxHeight = sizing.maxHeight;
  }
}

// ============================================================================
// STYLE APPLICATION
// ============================================================================

function applyFill(node: GeometryMixin, fill: FillStyle | undefined): void {
  if (!fill) return;

  if (fill.type === "solid" && fill.color) {
    node.fills = [createSolidPaint(fill.color)];
  } else if (fill.type === "gradient" && fill.gradientStops) {
    const gradientPaint: GradientPaint = {
      type: "GRADIENT_LINEAR",
      gradientStops: fill.gradientStops.map((stop) => ({
        position: stop.position,
        color: { ...hexToRgb(stop.color), a: 1 },
      })),
      gradientTransform: [
        [1, 0, 0],
        [0, 1, 0],
      ],
    };
    node.fills = [gradientPaint];
  }
}

function applyStyle(node: SceneNode, style: NodeStyle | undefined): void {
  if (!style) return;

  // Fill
  if ("fills" in node && style.fill) {
    applyFill(node as GeometryMixin, style.fill);
  }

  // Corner radius
  if ("cornerRadius" in node && style.cornerRadius !== undefined) {
    const frameNode = node as FrameNode | RectangleNode;
    if (typeof style.cornerRadius === "number") {
      frameNode.topLeftRadius = style.cornerRadius;
      frameNode.topRightRadius = style.cornerRadius;
      frameNode.bottomRightRadius = style.cornerRadius;
      frameNode.bottomLeftRadius = style.cornerRadius;
    } else {
      frameNode.topLeftRadius = style.cornerRadius[0];
      frameNode.topRightRadius = style.cornerRadius[1];
      frameNode.bottomRightRadius = style.cornerRadius[2];
      frameNode.bottomLeftRadius = style.cornerRadius[3];
    }
  }

  // Opacity
  if ("opacity" in node && style.opacity !== undefined) {
    node.opacity = style.opacity;
  }

  // Stroke
  if ("strokes" in node && style.stroke) {
    node.strokes = [createSolidPaint(style.stroke.color)];
    node.strokeWeight = style.stroke.weight;
    if (style.stroke.position && "strokeAlign" in node) {
      const strokeAlignMap: Record<string, "INSIDE" | "OUTSIDE" | "CENTER"> = {
        inside: "INSIDE",
        outside: "OUTSIDE",
        center: "CENTER",
      };
      node.strokeAlign = strokeAlignMap[style.stroke.position];
    }
  }

  // Shadow
  if ("effects" in node && style.shadow) {
    if (style.shadow.type === "inner") {
      const innerShadow: InnerShadowEffect = {
        type: "INNER_SHADOW",
        color: { ...hexToRgb(style.shadow.color), a: 0.25 },
        offset: { x: style.shadow.offsetX, y: style.shadow.offsetY },
        radius: style.shadow.blur,
        spread: style.shadow.spread || 0,
        visible: true,
        blendMode: "NORMAL",
      };
      node.effects = [innerShadow];
    } else {
      const dropShadow: DropShadowEffect = {
        type: "DROP_SHADOW",
        color: { ...hexToRgb(style.shadow.color), a: 0.25 },
        offset: { x: style.shadow.offsetX, y: style.shadow.offsetY },
        radius: style.shadow.blur,
        spread: style.shadow.spread || 0,
        visible: true,
        blendMode: "NORMAL",
      };
      node.effects = [dropShadow];
    }
  }
}

// ============================================================================
// NODE RENDERERS
// ============================================================================

async function renderFrame(
  schema: SchemaFrameNode,
  parent: FrameNode | null,
): Promise<FrameNode> {
  const frame = figma.createFrame();

  frame.name = schema.name || "Frame";

  // Dimensioni base
  if (schema.width && schema.height) {
    frame.resize(schema.width, schema.height);
  }

  // Reset fills default (Figma aggiunge un bianco di default)
  frame.fills = [];

  // Layout
  if (schema.layout) {
    applyLayout(frame, schema.layout);
  }

  // Style
  applyStyle(frame, schema.style);

  // Append to parent
  if (parent) {
    parent.appendChild(frame);
  } else {
    figma.currentPage.appendChild(frame);
  }

  // Sizing (dopo appendChild!)
  applySizing(frame, schema.sizing, parent);

  // Render children
  if (schema.children) {
    for (const child of schema.children) {
      await renderNode(child, frame);
    }
  }

  return frame;
}

async function renderText(
  schema: SchemaTextNode,
  parent: FrameNode | null,
): Promise<TextNode> {
  const textNode = figma.createText();

  textNode.name = schema.name || "Text";

  // Typography
  const typography = schema.text.typography || {
    family: "Inter",
    weight: "regular",
    size: 16,
  };

  const fontName = await ensureFontLoaded(typography.family, typography.weight);
  textNode.fontName = fontName;

  // Content (DEVE venire dopo fontName!)
  textNode.characters = schema.text.content;

  // Font size
  textNode.fontSize = typography.size;

  // Line height
  if (typography.lineHeight) {
    textNode.lineHeight = {
      value: typography.lineHeight * typography.size,
      unit: "PIXELS",
    };
  }

  // Color
  if (schema.text.color) {
    textNode.fills = [createSolidPaint(schema.text.color)];
  }

  // Alignment
  if (schema.text.align) {
    const alignMap: Record<string, "LEFT" | "CENTER" | "RIGHT"> = {
      left: "LEFT",
      center: "CENTER",
      right: "RIGHT",
    };
    textNode.textAlignHorizontal = alignMap[schema.text.align];
  }

  // Append
  if (parent) {
    parent.appendChild(textNode);
  } else {
    figma.currentPage.appendChild(textNode);
  }

  // Sizing
  applySizing(textNode, schema.sizing, parent);

  return textNode;
}

async function renderRectangle(
  schema: SchemaRectangleNode,
  parent: FrameNode | null,
): Promise<RectangleNode> {
  const rect = figma.createRectangle();

  rect.name = schema.name || "Rectangle";

  // Dimensioni
  if (schema.width && schema.height) {
    rect.resize(schema.width, schema.height);
  }

  // Style
  applyStyle(rect, schema.style);

  // Append
  if (parent) {
    parent.appendChild(rect);
  } else {
    figma.currentPage.appendChild(rect);
  }

  // Sizing
  applySizing(rect, schema.sizing, parent);

  return rect;
}

async function renderImage(
  schema: SchemaImageNode,
  parent: FrameNode | null,
): Promise<RectangleNode> {
  const rect = figma.createRectangle();

  rect.name = schema.name || "Image";

  // Dimensioni
  if (schema.width && schema.height) {
    rect.resize(schema.width, schema.height);
  }

  // Placeholder o immagine reale
  if (schema.image.placeholder) {
    rect.fills = [createSolidPaint("#E5E7EB")];
  } else if (schema.image.url) {
    try {
      const image = await figma.createImageAsync(schema.image.url);
      const scaleMode = schema.image.scaleMode?.toUpperCase() || "FILL";
      rect.fills = [
        {
          type: "IMAGE",
          imageHash: image.hash,
          scaleMode: scaleMode as "FILL" | "FIT" | "CROP" | "TILE",
        },
      ];
    } catch (e) {
      console.warn("Failed to load image, using placeholder");
      rect.fills = [createSolidPaint("#E5E7EB")];
    }
  }

  // Corner radius
  if (schema.style?.cornerRadius) {
    if (typeof schema.style.cornerRadius === "number") {
      rect.cornerRadius = schema.style.cornerRadius;
    }
  }

  // Append
  if (parent) {
    parent.appendChild(rect);
  } else {
    figma.currentPage.appendChild(rect);
  }

  // Sizing
  applySizing(rect, schema.sizing, parent);

  return rect;
}

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================

async function renderNode(
  node: UINode,
  parent: FrameNode | null = null,
): Promise<SceneNode> {
  switch (node.type) {
    case "frame":
      return renderFrame(node, parent);
    case "text":
      return renderText(node, parent);
    case "rectangle":
      return renderRectangle(node, parent);
    case "image":
      return renderImage(node, parent);
    case "component":
      // Per ora, trattiamo i component come frame
      return renderFrame(node as unknown as SchemaFrameNode, parent);
    default:
      throw new Error(`Unknown node type: ${(node as any).type}`);
  }
}

async function renderDesign(design: PageDesign): Promise<SceneNode> {
  console.log("Starting render:", design.meta.name);

  // Preload fonts
  await preloadAllFonts();

  // Render root
  const rootNode = await renderNode(design.root, null);

  // Position at origin
  rootNode.x = 0;
  rootNode.y = 0;

  // Select and zoom
  figma.currentPage.selection = [rootNode];
  figma.viewport.scrollAndZoomIntoView([rootNode]);

  console.log("Render complete!");
  return rootNode;
}

// ============================================================================
// PLUGIN UI COMMUNICATION
// ============================================================================

figma.showUI(__html__, {
  width: 400,
  height: 500,
  themeColors: true,
});

figma.ui.onmessage = async (msg: { type: string; payload?: any }) => {
  try {
    if (msg.type === "render") {
      const design = msg.payload as PageDesign;

      // Validazione base
      if (!design || !design.root) {
        throw new Error("Invalid design: missing root node");
      }
      if (design.schemaVersion !== "1.0") {
        throw new Error(`Unsupported schema version: ${design.schemaVersion}`);
      }

      await renderDesign(design);

      figma.ui.postMessage({
        type: "render-success",
        message: `Design "${design.meta.name}" created!`,
      });
    }

    if (msg.type === "cancel") {
      figma.closePlugin();
    }
  } catch (error) {
    console.error("Render error:", error);
    figma.ui.postMessage({
      type: "render-error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

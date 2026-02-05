# Prompt to Figma

> Un compilatore da linguaggio naturale a design system Figma

## Architettura

```
┌─────────────────────────────────────────────────────────────────┐
│                        MONOREPO                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │ apps/web    │───▶│ apps/api    │    │ apps/figma-plugin   │ │
│  │ (React)     │    │ (NestJS)    │    │ (eseguito in Figma) │ │
│  │             │    │             │    │                     │ │
│  │ Prompt UI   │    │ LLM + Valid │    │ JSON → Figma Nodes  │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│         │                 │                      ▲              │
│         │                 ▼                      │              │
│         │          ┌─────────────┐               │              │
│         └─────────▶│ packages/   │───────────────┘              │
│                    │ shared      │                              │
│                    │ (Schema TS) │                              │
│                    └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Setup iniziale

```bash
# Installa pnpm se non l'hai
npm install -g pnpm

# Installa dipendenze
pnpm install

# Builda i tipi condivisi
pnpm build:shared
```

### 2. Testa il Plugin Figma (senza backend)

```bash
# Builda il plugin
cd apps/figma-plugin
pnpm build
```

**In Figma Desktop:**
1. Vai su `Plugins > Development > Import plugin from manifest`
2. Seleziona `apps/figma-plugin/manifest.json`
3. Esegui il plugin: `Plugins > Development > Prompt to Figma`
4. Clicca "Load example JSON" e poi "Render to Figma"

### 3. Setup Backend API (prossimo step)

```bash
cd apps/api
pnpm install
pnpm dev
```

## Struttura Cartelle

```
prompt-to-figma/
├── apps/
│   ├── api/                 # NestJS backend (TODO)
│   ├── web/                 # React frontend (TODO)
│   └── figma-plugin/        # Plugin Figma ✅
│       ├── manifest.json
│       ├── src/
│       │   └── code.ts      # Renderer principale
│       └── dist/
│           └── ui.html      # UI del plugin
│
├── packages/
│   └── shared/              # Tipi TypeScript condivisi ✅
│       └── src/
│           └── index.ts     # Schema UINode, PageDesign
│
├── package.json             # Workspaces config
└── pnpm-workspace.yaml
```

## JSON Schema

Il cuore del sistema è lo schema JSON intermedio. Ecco un esempio:

```json
{
  "schemaVersion": "1.0",
  "meta": {
    "name": "Hero Section",
    "generatedAt": "2025-02-03T10:00:00Z"
  },
  "canvas": {
    "width": 1440,
    "height": 900
  },
  "root": {
    "type": "frame",
    "name": "Hero",
    "layout": {
      "direction": "vertical",
      "align": "center",
      "crossAlign": "center",
      "padding": 64,
      "gap": 24
    },
    "style": {
      "fill": { "type": "solid", "color": "#F9FAFB" }
    },
    "children": [
      {
        "type": "text",
        "text": {
          "content": "Welcome to Our Platform",
          "typography": {
            "family": "Inter",
            "weight": "bold",
            "size": 48
          },
          "color": "#111827"
        }
      }
    ]
  }
}
```

## Tipi Principali

```typescript
type UINode = FrameNode | TextNode | RectangleNode | ImageNode | ComponentNode;

interface LayoutConfig {
  direction: 'horizontal' | 'vertical' | 'none';
  align?: 'start' | 'center' | 'end' | 'space-between';
  crossAlign?: 'start' | 'center' | 'end' | 'stretch';
  gap?: number;
  padding?: number | [top, right, bottom, left];
}

interface SizingConfig {
  width: 'fixed' | 'hug' | 'fill';
  height: 'fixed' | 'hug' | 'fill';
}
```

## Development

### Plugin Figma (hot reload)

```bash
cd apps/figma-plugin
pnpm dev
```

Ogni modifica a `src/code.ts` ricompila automaticamente.
In Figma: `Plugins > Development > Prompt to Figma` per ricaricare.

### Tipi condivisi

```bash
cd packages/shared
pnpm build
```

## Roadmap

- [x] Schema TypeScript condiviso
- [x] Plugin Figma renderer base
- [x] UI plugin con input JSON
- [ ] Backend NestJS + LLM integration
- [ ] Frontend React con prompt UI
- [ ] Validazione JSON con AJV
- [ ] Componenti predefiniti (card, navbar, hero...)
- [ ] Design tokens e theming

## Troubleshooting

### Font non caricato
Il plugin carica automaticamente Inter. Se usi altri font, assicurati che siano installati nel tuo sistema.

### JSON non valido
Usa il pulsante "Validate" prima di renderizzare. Lo schema richiede:
- `schemaVersion: "1.0"`
- `meta.name`
- `root` con `type` valido

### Plugin non compare in Figma
- Assicurati di usare Figma Desktop (non web)
- Controlla che `manifest.json` punti a `dist/code.js` correttamente

# CLAUDE.md - Contesto Progetto

> Questo file viene letto automaticamente da Claude Code come contesto del progetto.

## Cosa è questo progetto

**Prompt to Figma** è un tool PERSONALE/LOCALE per velocizzare il mio workflow di design in Figma.

L'idea: scrivo un prompt nel plugin Figma → l'LLM genera JSON → il plugin crea i nodi.

```
prompt → LLM → JSON Schema validato → Plugin Figma → Nodi reali
```

**NON è un SaaS.** Gira tutto in localhost, uso la mia API key OpenAI.

## Architettura MINIMAL

```
prompt-to-figma/
├── packages/shared/          # Schema TypeScript (ESISTE ✅)
│   └── src/index.ts          # UINode, PageDesign, LayoutConfig
│
├── apps/figma-plugin/        # Plugin Figma (ESISTE ✅)
│   ├── src/code.ts           # Renderer JSON → Figma
│   └── dist/ui.html          # UI con prompt input
│
├── apps/api/                 # Backend NestJS (DA FARE)
│   └── src/
│       ├── design/
│       │   ├── design.controller.ts   # POST /api/design
│       │   └── design.service.ts
│       └── llm/
│           └── llm.service.ts         # OpenAI wrapper
│
└── apps/web/                 # ❌ NON SERVE
```

## Stack

- **Backend**: NestJS minimal su localhost:3000
- **LLM**: OpenAI GPT-4o (mia API key in .env)
- **Plugin**: TypeScript, gira in Figma Desktop
- **Database**: Nessuno (stateless)

## Schema JSON (packages/shared)

Il JSON intermedio ha questa struttura:

```typescript
interface PageDesign {
  schemaVersion: '1.0';
  meta: { name: string; description?: string; generatedAt: string };
  canvas: { width: number; height: number };
  root: UINode;
}

type UINode = FrameNode | TextNode | RectangleNode | ImageNode;

interface FrameNode {
  type: 'frame';
  name?: string;
  width?: number;
  height?: number;
  layout?: {
    direction: 'horizontal' | 'vertical' | 'none';
    align?: 'start' | 'center' | 'end' | 'space-between';
    crossAlign?: 'start' | 'center' | 'end' | 'stretch';
    gap?: number;
    padding?: number | [top, right, bottom, left];
  };
  sizing?: { width: 'fixed' | 'hug' | 'fill'; height: 'fixed' | 'hug' | 'fill' };
  style?: { fill?: {...}; cornerRadius?: number; shadow?: {...} };
  children?: UINode[];
}
```

Vedi `packages/shared/src/index.ts` per lo schema completo.

## Flusso dati

```
1. Utente apre Plugin in Figma
2. Scrive prompt: "Crea una card con titolo e bottone"
3. Plugin UI fa fetch() al backend NestJS
4. Backend:
   a. Riceve prompt
   b. Chiama LLM con system prompt + schema
   c. Valida JSON output
   d. Ritorna JSON
5. Plugin UI riceve JSON, lo passa a code.ts via postMessage
6. code.ts usa figma.createFrame(), figma.createText(), ecc.
7. I nodi appaiono nel canvas Figma
```

## Plugin Figma - Note importanti

Il plugin ha DUE ambienti separati che comunicano via postMessage:

| Ambiente | File | Può fare | NON può fare |
|----------|------|----------|--------------|
| Sandbox | code.ts | `figma.*` API | fetch, DOM |
| UI | ui.html (iframe) | fetch, DOM | `figma.*` |

```typescript
// ui.html → code.ts
parent.postMessage({ pluginMessage: { type: 'render', payload: json } }, '*')

// code.ts → riceve
figma.ui.onmessage = (msg) => { if (msg.type === 'render') renderDesign(msg.payload) }
```

**Font**: OBBLIGATORIO caricare font prima di modificare testo:
```typescript
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
textNode.fontName = { family: 'Inter', style: 'Regular' }
textNode.characters = 'Hello'  // DOPO fontName!
```

## TODO - Prossimi step

### 1. Backend (Fase 1)
- [ ] Scaffold NestJS minimal in `apps/api/`
- [ ] Endpoint `POST /api/design { prompt: string }`
- [ ] OpenAI wrapper con API key da `.env`
- [ ] CORS per localhost

### 2. LLM Prompt (Fase 2)
- [ ] System prompt che genera JSON valido
- [ ] 3-5 esempi per i miei use case
- [ ] Sanitizzazione output

### 3. Rifinitura (Fase 3)
- [ ] Usarlo davvero nel lavoro
- [ ] Fixare ciò che non funziona

## Comandi

```bash
# Setup iniziale (una volta)
pnpm install
pnpm build:shared

# Avvio quotidiano
cd apps/api && pnpm dev   # → localhost:3000

# Plugin: importa manifest.json in Figma Desktop
```

## Convenzioni

- TypeScript strict
- Nomi file: kebab-case
- Tipi: sempre da `@prompt-to-figma/shared`

## Link utili

- Figma Plugin API: https://developers.figma.com/docs/plugins/
- NestJS Docs: https://docs.nestjs.com/
- OpenAI API: https://platform.openai.com/docs/

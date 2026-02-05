# Piano di Sviluppo - Prompt to Figma

> Tool personale per accelerare il workflow design/prototipazione in Figma

---

## Executive Summary

| Aspetto | Dettaglio |
|---------|-----------|
| **Tipo** | Tool locale personale (NO SaaS) |
| **Obiettivo** | Generare design Figma da prompt mentre lavoro |
| **Timeline** | 4-6 settimane |
| **Stack** | NestJS minimal + Plugin Figma + OpenAI API |
| **Effort stimato** | ~60-80 ore |
| **Costo runtime** | Solo API OpenAI (~$20-50/mese uso intenso) |

---

## Filosofia: Tool Personale

```
SaaS (quello che NON faccio)          Tool Locale (quello che faccio)
─────────────────────────────────     ─────────────────────────────────
✗ Auth/Account utenti                 ✓ Solo io, zero auth
✗ Deployment cloud                    ✓ localhost:3000
✗ Rate limiting                       ✓ La mia API key OpenAI
✗ Database PostgreSQL                 ✓ Niente DB (o SQLite se serve)
✗ UI polish per esterni               ✓ Funziona = ok
✗ Documentazione pubblica             ✓ CLAUDE.md basta
✗ Error handling elaborato            ✓ Console.log va bene
✗ Testing suite completa              ✓ Testo mentre lavoro
```

---

## Fasi del Progetto

```
SETTIMANA     1        2        3        4        5        6
              │        │        │        │        │        │
FASE 0        ✅ FATTO                                       Foundation
FASE 1        ████████████                                   Backend minimal
FASE 2                 ████████████████████                  LLM + Prompt Eng.
FASE 3                                   ████████████        Uso + Rifinitura
              │                                         │
              ▼                                         ▼
           INIZIO                               USO QUOTIDIANO
```

---

## FASE 0: Foundation (COMPLETATA ✅)

- [x] Architettura definita
- [x] Schema TypeScript condiviso (`packages/shared`)
- [x] Plugin Figma renderer funzionante
- [x] UI Plugin con input JSON
- [x] CLAUDE.md per Claude Code

---

## FASE 1: Backend Minimal (Settimana 1-2)

### Obiettivo
Backend che gira in locale e risponde al plugin.

### Struttura Semplice
```
apps/api/
├── src/
│   ├── main.ts                 # Bootstrap NestJS
│   ├── app.module.ts
│   ├── design/
│   │   ├── design.module.ts
│   │   ├── design.controller.ts  # POST /api/design
│   │   └── design.service.ts     # Chiama LLM
│   └── llm/
│       ├── llm.module.ts
│       └── llm.service.ts        # OpenAI wrapper
├── .env                        # OPENAI_API_KEY
└── package.json
```

### Tasks (5-7 giorni)

- [ ] Scaffold NestJS base
- [ ] Endpoint `POST /api/design { prompt: string }`
- [ ] Wrapper OpenAI con API key da `.env`
- [ ] CORS per plugin Figma (localhost)
- [ ] Risposta mock per testare flusso

### Endpoint Unico
```typescript
// POST http://localhost:3000/api/design
{
  "prompt": "Card con titolo, descrizione e bottone"
}

// Response
{
  "schemaVersion": "1.0",
  "meta": { "name": "Generated Card", ... },
  "root": { ... }
}
```

### Criterio: Fatto quando
- [ ] `pnpm dev` avvia il server
- [ ] Plugin chiama localhost:3000 e riceve JSON
- [ ] JSON renderizza in Figma

---

## FASE 2: LLM + Prompt Engineering (Settimana 2-4)

### Obiettivo
L'LLM genera JSON valido per i MIEI casi d'uso tipici.

### System Prompt
```typescript
// apps/api/src/llm/prompts/system.ts

export const SYSTEM_PROMPT = `
Sei un generatore di UI JSON per Figma. Output SOLO JSON valido.

SCHEMA NODI:
- frame: container con layout (horizontal/vertical), padding, gap
- text: contenuto testuale con typography
- rectangle: forma con fill, cornerRadius
- image: placeholder o URL

REGOLE:
1. Root è sempre un frame
2. Colori in hex (#RRGGBB)
3. Font: solo "Inter" (Regular, Medium, Bold)
4. Sizing: "fixed", "hug", o "fill"

ESEMPIO OUTPUT:
${EXAMPLE_CARD_JSON}

Genera il design richiesto.
`;
```

### Tasks (8-12 giorni)

#### Prompt Engineering (critico!)
- [ ] System prompt base che genera JSON valido
- [ ] 3-5 few-shot examples per i miei casi comuni
- [ ] Test iterativo: prompt → output → correzione
- [ ] Documentare pattern che funzionano

#### I Miei Use Case Prioritari
```
Priorità 1 (uso quotidiano):
├── [ ] Card component (titolo, desc, CTA)
├── [ ] Form layout (label + input groups)
├── [ ] Lista items (icon + text + action)
└── [ ] Button variants

Priorità 2 (uso frequente):
├── [ ] Hero section
├── [ ] Navbar
├── [ ] Stats/metrics widget
└── [ ] Modal dialog

Priorità 3 (occasionale):
├── [ ] Sidebar navigation
├── [ ] Table layout
└── [ ] Dashboard grid
```

#### Sanitizzazione Output
```typescript
// Se l'LLM sbaglia, correggi automaticamente
function sanitizeOutput(raw: any): PageDesign {
  // Forza schemaVersion
  raw.schemaVersion = '1.0';
  
  // Fix colori non validi
  walkTree(raw.root, (node) => {
    if (node.style?.fill?.color) {
      node.style.fill.color = ensureValidHex(node.style.fill.color);
    }
  });
  
  // Forza font supportati
  walkTree(raw.root, (node) => {
    if (node.text?.typography?.family) {
      node.text.typography.family = 'Inter'; // fallback sicuro
    }
  });
  
  return raw;
}
```

### Criterio: Fatto quando
- [ ] "Crea una card" → genera card usabile
- [ ] "Form con email e password" → genera form
- [ ] 80%+ dei miei prompt tipici funziona
- [ ] Quando fallisce, capisco perché dal log

---

## FASE 3: Uso Quotidiano + Rifinitura (Settimana 5-6)

### Obiettivo
Usare il tool nel lavoro reale e sistemare ciò che non funziona.

### Workflow Quotidiano
```
1. Apro Figma su un progetto reale
2. Ho bisogno di un componente
3. Plugin → scrivo prompt → genera
4. Se ok: uso il design
5. Se ko: noto cosa non va, fixo dopo
```

### Backlog Rifinitura
Man mano che uso il tool, aggiungo qui:

```
[ ] Bug: ________________________________
[ ] Bug: ________________________________
[ ] Miglioramento: ______________________
[ ] Nuovo use case: _____________________
[ ] Prompt che fallisce: _________________
```

### Quick Wins Plugin UI
- [ ] Template buttons per prompt frequenti
- [ ] Ultimo prompt in localStorage
- [ ] Copy JSON per debug
- [ ] Messaggio errore più chiaro

### Criterio: Fatto quando
- [ ] Lo uso almeno 5 volte a settimana
- [ ] Mi fa risparmiare tempo vs creare a mano
- [ ] So come workaroundare i limiti

---

## Evoluzioni Future (quando ne avrò voglia)

### Nice to Have
- [ ] Salvataggio prompt preferiti
- [ ] History generazioni (SQLite locale)
- [ ] Shortcut tastiera nel plugin
- [ ] Varianti colore (dark/light mode)
- [ ] Import da screenshot (Vision API)

### Se diventa un prodotto
- [ ] React App per editing avanzato
- [ ] Account + cloud sync
- [ ] Pubblicazione plugin su Community
- [ ] Documentazione pubblica

---

## Setup Locale

### Requisiti
- Node.js >= 20
- pnpm
- Figma Desktop
- API key OpenAI

### Avvio
```bash
# 1. Installa
cd prompt-to-figma
pnpm install
pnpm build:shared

# 2. Configura
cp apps/api/.env.example apps/api/.env
# Aggiungi OPENAI_API_KEY nel .env

# 3. Avvia backend
cd apps/api
pnpm dev
# → http://localhost:3000

# 4. Carica plugin in Figma
# Plugins > Development > Import plugin from manifest
# Seleziona: apps/figma-plugin/manifest.json
```

### Uso quotidiano
```bash
# Ogni volta che lavoro:
cd prompt-to-figma/apps/api
pnpm dev

# Poi in Figma: Plugins > Prompt to Figma
```

---

## Costi

| Voce | Costo |
|------|-------|
| OpenAI API (GPT-4o) | ~$20-50/mese uso intenso |
| Tutto il resto | $0 (localhost) |

---

## Tempo Stimato

| Fase | Ore | Settimane |
|------|-----|-----------|
| Fase 1: Backend | 15-20h | 1-2 |
| Fase 2: LLM | 30-40h | 2-3 |
| Fase 3: Rifinitura | 15-20h | 1-2 |
| **Totale** | **60-80h** | **4-6** |

---

## Checklist Veloce

### Prima di iniziare Fase 1
- [x] CLAUDE.md pronto
- [x] Schema TypeScript definito
- [x] Plugin base funzionante
- [ ] API key OpenAI attiva

### Prima di iniziare Fase 2
- [ ] Backend risponde su localhost:3000
- [ ] Plugin comunica con backend
- [ ] .env configurato

### Prima di "finire"
- [ ] Lo uso davvero nel lavoro
- [ ] Mi fa risparmiare tempo

---

## Link Utili

- Figma Plugin API: https://developers.figma.com/docs/plugins/
- NestJS Docs: https://docs.nestjs.com/
- OpenAI API: https://platform.openai.com/docs/

---

*Piano creato: Febbraio 2025*  
*Tipo: Tool personale locale*

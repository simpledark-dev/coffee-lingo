# Coffee Lingo

A cafe-themed language learning game where players run a coffee shop and learn German by serving customers.

## Stack

- Next.js 16, React 19, TypeScript 5
- HTML Canvas for pixel-art rendering (no game engine)
- Mobile-first PWA (Add to Home Screen)
- Vitest for testing

## Commands

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run test` — run tests once
- `npm run test:watch` — watch mode

## Architecture

```
app/page.tsx          — Entry point, owns PlayerState, handles upgrades/furnishing/friendship
src/components/       — React UI components
  CafeCanvas.tsx      — Canvas renderer (tile maps, sprites, touch/mouse interaction, scene switching)
  GameplayView.tsx    — Game loop, conversation flow, scoring, quest progress, audio
  HUD.tsx             — Top bar (coins, rep, quest button)
  UpgradeShop.tsx     — Shop modal (upgrades, furnishings, settings)
  QuestsView.tsx      — Quest overlay (daily quests, milestones)
  DictionaryView.tsx  — Vocabulary browser
  ContactsView.tsx    — Character relationships
src/lib/              — Pure game logic (no React)
  types.ts            — All TypeScript interfaces (PlayerState, WorldState, etc.)
  state.ts            — localStorage save/load, state initialization
  game.ts             — Conversation generation, answer evaluation, scoring
  cafe-sim.ts         — World simulation tick (spawning, pathfinding, phase transitions)
  quests.ts           — Quest system (daily quests, milestones, progress, claiming)
  characters.ts       — Character definitions and personality data
  upgrades.ts         — Upgrade/furnishing definitions, rep levels, bonus calculations
  furnishing.ts       — Furnishing placement, grid logic, room unlocks
  tilemap.ts          — Tile map definitions (interior, outside, patio, reading room)
  poi.ts              — Points of interest definitions per room
  pathfinding.ts      — A* pathfinding on tile grids
  sprites.ts          — Sprite sheet definitions and pixel data
data/
  expressions.json    — German expressions (vocab, stages, idea tags)
  templates.json      — Dialogue templates (customer lines, response options)
  expressions-french.json — French expressions (unused/WIP)
```

## Key Patterns

- **PlayerState** is the single source of truth — persisted to localStorage via `saveState`/`loadState`
- **Pure function updates** — state transforms in `src/lib/` are pure functions (e.g. `updateQuestProgress`, `evaluateAnswer`). Components call these and set state.
- **Canvas rendering** — CafeCanvas draws everything via 2D canvas context. No DOM elements inside the game view. Sprites are pixel art drawn programmatically (no image files).
- **Inline styles** — all components use `React.CSSProperties` objects, no CSS files
- **Touch-first** — all interactions must work on mobile. Use `element.closest('button')` for reliable tap detection through child elements.
- **Cross-platform emoji** — avoid emoji in canvas rendering (renders differently per OS). Use canvas-drawn primitives instead.

## Game Flow

1. Customers spawn outside, walk into cafe, sit at POIs
2. Customer shows exclamation mark → player taps → conversation starts
3. Each exchange: customer says something in German → player picks from 3-4 response options
4. Responses scored (PERFECT/GOOD/UNDERSTOOD/MISSED) → coins + rep awarded
5. After conversation ends, customer leaves → quest progress updated

## Conventions

- No emoji in code unless user asks
- Keep HUD compact — don't increase its height
- When modals are open, canvas interaction is locked (`lockInteraction` ref)
- Music volume: check `audio.volume` (live property), not React state (stale in closures)

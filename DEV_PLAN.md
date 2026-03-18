(old, not up to date)

# Coffee Lingo — Development Plan

## 1. MVP Slice Definition

### What "Playable" Means

The prototype is playable when a player can:
1. Start a day
2. Serve at least 5 customers using the constructive word bank
3. See evaluation scores (PERFECT/GOOD/UNDERSTOOD/MISSED) after each response
4. Reach a day-end summary screen

**This is achieved at the end of Milestone 0, task 0.7.** Everything after that is enhancement.

### First Playable (M0) — Bare Loop

The absolute minimum to validate the interaction:

- Customer line appears as text → word bank of 8 tiles → player taps words → send → idea-tag evaluation → score text → next customer → day ends → summary
- No timer. No hints. No persistence. No mastery tracking. No coins.
- All 15 words are active from the start. No introduction flow.
- 8 customers per day, 1 turn each, all Friendly.
- Placeholder visuals: colored rectangles, text labels, styled tiles.

### M1 — Basic Systems + Cafe Scene

Add the systems that make it a game rather than a tech demo, **and the visual cafe layer that makes it feel like a game rather than a quiz app.**

**Why the cafe scene is in M1, not M3:** The product vision is "language learning *disguised* as cafe gameplay." Without a visual cafe scene, the game feels like a flashcard app with a timer — the core experience promise is broken. The cafe scene is not polish; it is the *disguise*. M1 uses CSS/SVG art (no external assets), which is fast to build and validates whether the cafe framing makes the loop feel like gameplay.

- Cafe scene layout (CSS/SVG: counter, shelves, background, warm cafe atmosphere)
- Customer visual (avatar/silhouette at counter with speech bubble)
- Customer entrance/exit transitions (CSS transitions, not sprite animations)
- Score and tip feedback positioned in the cafe scene context
- Patience timer with visual bar (above customer)
- Coins + tip rewards (displayed in HUD + float near counter)
- Hint system (2-level)
- Player state persistence (localStorage)
- Word mastery tracking (Level 0-3)
- Day start screen + improved summary
- State loads on app start (play across multiple sessions)

### Cut / Defer (exists in GDD but NOT in M0 or M1)

| Feature | Reason to Defer |
|---|---|
| Multi-turn conversations | Core loop validates with single turns |
| Queue pressure / customer queue | Adds complexity without validating the core learning mechanic |
| Rush hour mechanic | Tuning feature — needs baseline data first |
| Challenge Customer (daily boss) | Engagement layer on top of core loop |
| Word Challenge (active word forcing) | Engagement layer |
| Recall Mode (type-from-memory) | Advanced mechanic — needs word bank to work first |
| Combo system + HUD counter | Reward layer — defer until scoring works |
| Learning Moment card | Polish feature for post-MISSED feedback |
| MISSED rephrase (second attempt) | Can add after single-attempt flow works |
| Native language fallback words | Simplify: all words are French for prototype |
| Word Shop (player-selected words) | Game-recommended path is sufficient for testing |
| New Word introduction card | Can hardcode starting vocabulary instead |
| Cafe upgrades + decorations | Meta progression — not needed to test core loop |
| Regular customers + relationships | Engagement layer |
| Customer story arcs | Content layer |
| Achievements | Reward layer |
| Vocabulary stages (2-4) | Start with Stage 1+2 vocabulary only, no gating logic |
| Mastery guardrail for stage advancement | No stage advancement in prototype |
| Reputation milestones / early unlocks | Single customer type, no unlock needed |
| Audio (all) | Add after visual prototype works |
| Pixel art assets / commissioned sprites | CSS/SVG cafe scene in M1; pixel art upgrade in M3 |
| Customer sprite variants (5 types) | Single CSS/SVG customer silhouette in M1; variants in M3 |
| Complex customer animations (walk cycle, reaction emotes) | Simple CSS entrance/exit transition in M1; sprite animations in M3 |
| Bank size scaling by mastery | Fixed 8 tiles for prototype |

---

## 2. Technical Architecture

### Tooling Decisions

- **Framework**: Next.js (React), client-side only
- **Language**: TypeScript, `strict: true` — the data model is small and tag-matching bugs are the most likely source of silent failures. Strict mode catches these at compile time.
- **Test runner**: Vitest — fast, native ESM, works with Next.js out of the box.
- **No additional dependencies** for M0/M1. No state management library (React useState + context is sufficient), no animation library, no CSS framework beyond what's needed.

### File Structure (M0/M1 — 4 files, not 7)

```
coffee-lingo/
├── data/
│   ├── expressions.json        ← 15 expressions (M0), 45 (M2)
│   └── templates.json          ← 20 templates (M0), 150+ (M2)
├── lib/
│   ├── game.ts                 ← ALL game logic: evaluation, word bank,
│   │                              day generation, template resolution
│   ├── state.ts                ← Player state + localStorage
│   └── types.ts                ← Shared TypeScript interfaces
├── app/
│   ├── layout.tsx              ← Viewport container (390×844)
│   └── page.tsx                ← Single page, state-driven view switching
├── components/
│   ├── GameplayView.tsx        ← Word bank, response bar, customer line, send
│   ├── DayStartView.tsx        ← "Day N" + Open Shop
│   ├── SummaryView.tsx         ← End-of-day stats
│   └── HUD.tsx                 ← Top bar (coins, day, remaining)
└── __tests__/
    ├── evaluation.test.ts      ← Highest priority tests
    ├── word-bank.test.ts
    └── day-generation.test.ts
```

**Why 4 lib files instead of 7 modules:** With 15 words and 20 templates, evaluation + word bank + day generation are ~200 lines of pure functions total. Splitting them across separate files adds import overhead and cognitive load for no benefit. When M2 adds complexity (session targeting, multi-turn, customer types), split `game.ts` into separate files then.

### Core Logic — All in `lib/game.ts`

**Template Variable Resolution** (the trickiest piece of logic):
```typescript
// This deserves its own function and its own tests.
// Given a template with {quantity} → "deux", look up "deux" in expressions,
// find its idea tags ["quantity"], and replace "{quantity}" in required_ideas.
function resolveTemplate(
  template: DialogueTemplate,
  expressions: Expression[]
): ResolvedExchange
```

**Evaluation** (pure function):
```typescript
function evaluate(
  selectedWords: Expression[],
  requiredIdeas: string[],
  bonusIdeas: string[]
): EvaluationResult
```

**Word Bank Generation** (pure function):
```typescript
function generateWordBank(
  resolved: ResolvedExchange,
  playerVocabulary: Expression[]
): Expression[]
```

**Day Generation** (pure function):
```typescript
// M0: pick 8 random templates, resolve each. No recency filter needed
// with 20 templates and 8 picks.
function generateDay(
  templates: DialogueTemplate[],
  expressions: Expression[]
): ResolvedExchange[]
```

### Data Model (simplified from GDD Section 15.2)

**Expression** (content JSON — data-driven):
```typescript
interface Expression {
  id: string           // "parce_que"
  text: string         // "parce que"
  nativeText: string   // "because"
  ideaTags: string[]   // ["reason"]
  stage: number        // 1-4
}
```

**Dialogue Template** (content JSON — data-driven):
```typescript
interface DialogueTemplate {
  id: string
  ideaCategory: string
  difficulty: number
  customerLines: {
    text: string                          // "Je voudrais {quantity} {item}"
    variables: Record<string, string[]>   // { quantity: ["un", "deux"], item: ["café", "thé"] }
  }[]
  requiredIdeas: string[]    // ["confirmation", "{quantity}", "{item}"]
  bonusIdeas: string[]       // ["politeness"]
  followUpIds: string[]      // for multi-turn (M2 — ignored in M0/M1)
}
```

**Resolved Exchange** (runtime — output of template resolution):
```typescript
interface ResolvedExchange {
  customerLine: string       // "Deux cafés s'il vous plaît"
  requiredIdeas: string[]    // ["confirmation", "quantity", "item"] — variables resolved to tags
  bonusIdeas: string[]       // ["politeness"]
  wordBank: Expression[]     // 8 tiles
  templateId: string         // for recency tracking
}
```

**Player State** (localStorage — runtime):
```typescript
interface PlayerState {
  currentDay: number
  coins: number
  reputation: number
  vocabulary: Record<string, VocabularyEntry>  // keyed by expression_id
  recencyBuffer: string[]  // last N template IDs used
}

interface VocabularyEntry {
  masteryLevel: number       // 0-3
  totalSuccessfulUses: number
  sessionsUsedIn: number
  lastUsedDay: number
}
```

**Stripped from M0/M1** (add in M2/M3):
- `cafeTier`, `decorationsOwned` — no upgrades
- `learningQueue` — no Word Shop
- `regularCustomers` — no regulars
- `achievementsEarned` — no achievements
- `vocabularyStage` — no stage gating (all 15 words active from Day 1)
- `pronunciation_hint` on Expression — not displayed
- `language_layer` on templates — not used for filtering
- `min_relationship_level` on templates — no regulars

### Cold Start: How Day 1 Works

In M0/M1, there is no "New Word introduction card" and no "Word Shop." Instead:

- **All 15 expressions start at mastery Level 1** (newly learned). Not Level 0 — Level 0 means "introduced but never used," which requires the New Word card flow to make sense. By starting at Level 1, every word is immediately usable and the mastery system works correctly from Day 1.
- The player's initial `vocabulary` object is pre-populated by `createInitialState()` with all 15 expressions at `{ masteryLevel: 1, totalSuccessfulUses: 0, sessionsUsedIn: 0, lastUsedDay: 0 }`.
- In M2, when expanding to 45 words, new words beyond the initial 15 will enter through the New Word card at Level 0.

---

## 3. Hardcoded vs. Data-Driven Boundary

### Data-Driven from Day One

These are content systems that must scale. They live as static JSON files in `/data/`.

| What | Why Data-Driven | Format |
|---|---|---|
| **Expressions** (vocabulary) | Core content — grows from 15 to 45 to thousands | `data/expressions.json` |
| **Dialogue Templates** | Core content — grows from 20 to 150+ | `data/templates.json` |
| **Idea Tags** | Referenced by expressions and templates, must be consistent | Inline on expressions (not a separate file) |

### Hardcoded for Prototype

These are tuning values. Extract to a config file when balancing matters.

| What | Hardcoded Value | Why Safe |
|---|---|---|
| Patience timer per type | `{ friendly: 20, impatient: 10, ... }` | Only 1 type in prototype; values are in GDD |
| Tip amounts per type | `{ friendly: 10, impatient: 15, ... }` | Simple constants, easy to extract |
| Scoring thresholds | `PERFECT: all+bonus, GOOD: all, UNDERSTOOD: ≥50%, MISSED: <50%` | Core logic, unlikely to change |
| Hint tip multipliers | `[1.0, 0.75, 0.50]` | 3 constants |
| Mastery level thresholds | `L0→1: 1 use, L1→2: 5 uses + 2 sessions, L2→3: 12 uses + 4 sessions` | GDD-defined, tune later |
| Word bank size | `8 tiles` | Fixed for prototype, scale later |
| Customers per day | `8` | Fixed for prototype |
| Reputation change rules | `PERFECT: +1, MISSED: -1, day complete: +2, ...` | Simple switch statement |
| Stage boundaries | `Stage 1: days 1-3, Stage 2: days 4-8, ...` | Not needed for prototype (single stage) |
| Customer type definitions | `{ friendly: { turns: 1, patience: 20 } }` | Only 1 type in prototype |
| Combo thresholds | `3/4/5+ words → 5/10/20 coins` | Deferred feature |

---

## 4. Milestones with Task Breakdown

### Milestone 0: Bare Loop (Target: Days 1-3)

**Goal:** The definition of "playable" is met. A player can serve 8 customers, tap words, see scores, and finish a day. No timer, no persistence, no coins. **Playable is achieved at task 0.7.**

| # | Task | Est. | Notes |
|---|---|---|---|
| 0.1 | **Project setup**: Next.js app with TypeScript strict, Vitest config, fixed viewport container (390×844 centered on dark bg), basic CSS reset | 1-2h | |
| 0.2 | **Types + content JSON**: Define interfaces in `types.ts`. Create `expressions.json` (15 words) and `templates.json` (20 templates). See Section 6 for exact content. | 3-5h | French must be validated — see Section 6 |
| 0.3 | **Template resolution**: `resolveTemplate()` function — pick random line variant, fill variables, resolve `{variable}` references in requiredIdeas to actual idea tags by looking up expression. **Unit tests using GDD Section 4.2 examples.** | 2-3h | This is the trickiest logic. Get it right first. |
| 0.4 | **Evaluation engine**: `evaluate()` pure function. **Unit tests copied directly from GDD evaluation table** (Section 4.2): "oui deux café s'il vous plaît" → PERFECT, "oui deux café" → GOOD, "deux café" → UNDERSTOOD, "oui" → MISSED, "bonjour" → MISSED. | 1-2h | |
| 0.5 | **Word bank generator**: `generateWordBank()` — include required words, fill with distractors from player vocab, shuffle. **Unit test: verify required words always present, no duplicates, exactly 8 tiles.** | 1-2h | |
| 0.6 | **Day generator**: `generateDay()` — pick 8 random templates, resolve each. No recency filter, no weighting. Returns array of `ResolvedExchange`. **Unit test: given 15 expressions and 20 templates, verify every exchange is solvable** (word bank contains words covering all required ideas). | 1-2h | This is the most important correctness test. |
| 0.7 | **Gameplay UI + day flow**: GameplayView (customer line text, word bank tiles, response bar, send button, score text), DayStartView ("Day N" + "Open Shop"), SummaryView (customers served, scores). State-driven view switching: `dayStart → gameplay → summary → dayStart`. Wire evaluation to UI. **The game is playable after this task.** | 3-4h | |

**Total: ~12-20 hours. Days 1-3.**

After 0.7, stop and playtest. Serve 8 customers. Does the loop feel right? Does scoring match expectations? Are the word banks solvable? Fix bugs before moving on.

---

### Milestone 1: Basic Systems + Cafe Scene (Target: Days 4-7)

**Goal:** Add timer, coins, persistence, mastery — AND the visual cafe scene that makes it feel like a game. After M1, a player should feel like they're working in a cafe, not filling out a quiz.

**M1a — Cafe Scene (build first, it reframes everything):**

| # | Task | Est. | Notes |
|---|---|---|---|
| 1.1 | **Cafe scene layout**: CSS/SVG cafe interior — counter/bar at bottom, shelves/menu board behind, warm background, cafe atmosphere. This is the ~55% height "scene area" from the GDD wireframe. No external art assets — use CSS shapes, gradients, and inline SVG. | 3-4h | This is the single most impactful visual task. It transforms the game from "quiz app" to "cafe." |
| 1.2 | **Customer visual**: CSS/SVG customer silhouette/avatar that appears at the counter. Speech bubble with customer line text (replacing the plain text box). Patience bar positioned above the customer. | 2-3h | Doesn't need to be detailed art — a simple character shape with a speech bubble sells the scene. |
| 1.3 | **Customer transitions**: CSS transition for customer entering (slide in from door side) and leaving (slide out after score). Brief idle state between customers to sell the "next customer walks up" feel. | 1-2h | Keep it simple — translateX + opacity transition. |
| 1.4 | **Score feedback in scene**: Score text (PERFECT/GOOD/etc) and tip amount appear in the cafe scene area above the counter, not as a separate overlay. Tip coins visual near the counter. | 1h | Grounds the feedback in the game world. |

**M1b — Game Systems:**

| # | Task | Est. | Notes |
|---|---|---|---|
| 1.5 | **Patience timer**: Countdown (20s for Friendly), visual bar above customer (single color, shrinks), timeout → customer leaves (exit transition), score = MISSED. | 2h | |
| 1.6 | **Coins + tips**: Display coin counter in HUD. Award tips based on score (PERFECT: 15, GOOD: 10, UNDERSTOOD: 5, MISSED: 0). Tip text appears in scene after scoring. | 1h | |
| 1.7 | **Reputation**: Track cumulative reputation. PERFECT: +1, MISSED: -1, day complete: +2. Display in HUD. | 1h | |
| 1.8 | **Hint system**: [?] button near customer speech bubble. Tap 1: idea hint ("Confirm the order"). Tap 2: English translation. Reduce tip by 25% per hint level used. | 1-2h | |
| 1.9 | **State persistence**: Save PlayerState to localStorage at end of day. Load on app start. `createInitialState()` for new players (all 15 words at Level 1). | 1-2h | |
| 1.10 | **Mastery tracking**: After each interaction, update `totalSuccessfulUses` and `sessionsUsedIn` for words whose idea tags matched. Check level-up thresholds. | 1-2h | |
| 1.11 | **Improved summary**: Show coins earned, reputation change, words practiced, words leveled up. | 1h | |
| 1.12 | **Recency filter**: Track last 3 template IDs. Day generator deprioritizes (not excludes) recently used templates. | 0.5h | |
| 1.13 | **End-to-end playtest**: Play Days 1-3 across browser sessions. Verify persistence, mastery, scoring, and that the cafe scene makes the loop feel like gameplay. Fix bugs. | 2-3h | |

**Total: ~18-26 hours. Days 4-7.**

M1 deliverable: Playable prototype with a visual cafe scene, timer pressure, coins, mastery, persistence. Player can play 3+ days, see their words level up, and feel like they're running a cafe.

---

### Milestone 2: MVP Expansion (Target: Weeks 2-3)

**Goal:** Add the engagement and learning systems that make the game fun and effective.

M2 is split into two phases to manage dependencies:

**M2a — Core Learning Systems (build first, in this order):**

| # | Task | Est. | Depends On |
|---|---|---|---|
| 2.1 | **Multi-turn conversations**: Follow-up template selection from `followUpIds`, per-turn evaluation, patience reset between turns. | 3-4h | — |
| 2.2 | **MISSED rephrase**: Second attempt with reduced distractors (no glow). Customer rephrases with simpler line variant. Cap score at GOOD on second attempt. | 2-3h | — |
| 2.3 | **Learning Moment card**: Post-interaction card showing correct response for MISSED/UNDERSTOOD. Appears between customers. | 1-2h | 2.2 |
| 2.4 | **Full vocabulary**: Expand expressions.json to all 45 words across 4 stages. | 2h | — |
| 2.5 | **Full template set**: Expand templates.json to 150+ templates (see Section 6). | 8-12h | 2.4 |
| 2.6 | **Session targeting algorithm**: Review (60%) / reinforce (20%) / new (20%) word selection. Weighted template selection based on mastery needs. | 3-4h | 2.4, 2.5 |
| 2.7 | **Vocabulary stage advancement**: Day-based gating with 50% mastery guardrail. Stage determines which idea categories are available. | 1-2h | 2.4, 2.6 |
| 2.8 | **New Word introduction card**: Pre-day card showing new expression with example and pronunciation. Words enter at Level 0, advance to Level 1 on first use. | 1-2h | 2.7 |
| 2.9 | **All 5 customer types**: Add Impatient (10s, 1 turn), Tourist (18s, 1-2 turns), Talkative (18s, 2-3 turns), Regular (15s, 2-3 turns). | 2-3h | 2.1 |
| 2.10 | **Customer type unlocking**: Day-based unlock schedule (Day 1: Friendly, Day 3: Tourist, Day 5: Impatient, Day 7: Talkative, Day 10: Regular). | 1h | 2.9 |

**M2b — Engagement Layers (build after M2a):**

| # | Task | Est. | Depends On |
|---|---|---|---|
| 2.11 | **Combo system**: Detection (3+ words), reward (+5/10/20 coins), HUD counter, daily target. | 2-3h | — |
| 2.12 | **Word Challenge**: 20% trigger on interactions, bonus banner, detection (non-required idea tag used), reward (+10 coins, +2 mastery). | 2-3h | 2.6 |
| 2.13 | **Rush hour**: Customers 7-10 get -3s patience, 1s idle gap, doubled tips. | 2h | 2.9 |
| 2.14 | **Challenge Customer**: Last customer of day, always 3 turns, aggregate scoring bonus. | 2h | 2.1, 2.9 |
| 2.15 | **Bank size scaling**: 6-8 tiles for Level 0-1 words, 10-14 for Level 2+. | 1h | 2.6 |
| 2.16 | **Native language fallbacks**: English words in bank when no French word known for a required idea. Different tile color. Blocks PERFECT. | 1-2h | — |
| 2.17 | **Recall Mode**: 15% trigger for Level 2+ words — blank tile with idea hint, text input, fuzzy match, reveal on long-press. | 3-4h | 2.6 |
| 2.18 | **Patience timeout**: Customer frustrated line, walks out, reputation -1. | 1h | — |
| 2.19 | **Queue system**: Up to 3 customers waiting. Queue overflow = lost customer, reputation -1. | 2-3h | 2.18 |
| 2.20 | **Between-days menu**: Screen with Next Day, Word Shop (browse vocabulary by category, select words to learn), My Words (mastery view). | 3-4h | 2.7, 2.8 |
| 2.21 | **Reputation milestones**: Display milestone progress. Early unlock for customer types via reputation OR day threshold. | 1-2h | 2.10 |
| 2.22 | **Full summary screen**: Words practiced, new words, level ups, combo target result, challenge customer result. | 2-3h | 2.11, 2.14 |

**Total M2: ~45-65 hours. ~2-3 weeks.**

---

### Milestone 3: Art Upgrade, Polish & Content (Target: Weeks 4-5)

**Goal:** Upgrade the CSS/SVG cafe scene to pixel art, add audio, and polish the visual experience. M1 built the cafe scene with CSS/SVG — M3 replaces it with proper art assets.

| # | Task |
|---|---|
| 3.1 | **Pixel art cafe scene**: Replace CSS/SVG cafe with top-down pixel art — counter, tables, door, background, shelves |
| 3.2 | **Customer sprites**: 5 customer visual variants with idle pose, replacing the CSS silhouette |
| 3.3 | **Customer animations**: Sprite-based walk-in, reaction emotes (❤️ 😊 ❓ 😤), walk-out (upgrading CSS transitions) |
| 3.4 | **Cafe upgrade system**: 4 tiers, coin costs, visual changes to pixel art scene, customer count scaling |
| 3.5 | **Decorations**: 5 cosmetic items, fixed placement in the pixel art scene |
| 3.6 | **Regular customers**: Maria + Jean-Pierre, unique sprites, relationship levels, visit scheduling, story arcs |
| 3.7 | **Achievements**: ~10 milestones, summary screen display, persistent list |
| 3.8 | **Audio: SFX**: Door bell, tile tap, send, score chimes, combo |
| 3.9 | **Audio: Ambient + Music**: Cafe ambience loop, 1-2 lo-fi gameplay tracks |
| 3.10 | **Visual polish**: Floating coin animations, star burst for PERFECT, pixel art speech bubbles |
| 3.11 | **Responsive safe areas**: Notch/dynamic island padding, home indicator |

### Post-MVP (backlog)

| Task | Notes |
|---|---|
| Word Shop player-selected learning | Browse + select words by category |
| Export/import save data | JSON download/upload for data safety |
| PWA manifest + offline support | Service worker, app install |
| Multiple language pairs | Abstract language from content structure |
| Onboarding tutorial | Guided Day 1 experience |

---

## 5. UI Screens / Views

All views render inside the fixed 390×844 container. No Next.js router — single page with state-driven view switching (`gamePhase` state: `'dayStart' | 'gameplay' | 'summary'`).

### Screen 1: Day Start

```
┌─────────── 390px ───────────┐
│                              │
│        ☀️ Day {n}           │
│                              │
│   [New Word Card - if any]   │  ← M2
│                              │
│      [ Open Shop → ]         │
│                              │
└──────────────────────────────┘
```

**M0:** Day number + "Open Shop" button. Plain styled.
**M2:** New Word card with expression, pronunciation, example.

### Screen 2: Gameplay (Core)

```
┌─────────── 390px ───────────┐
│ [💰 185] [⭐ 42] [Day 7]   │  44px top bar (M1)
│                              │
│   ┌──────────────────────┐   │
│   │   Cafe Scene Area    │   │  ~55% height
│   │                      │   │
│   │  "Deux cafés         │   │  Customer line (text in M0,
│   │   s'il vous plaît"   │   │  speech bubble in M3)
│   │                      │   │
│   │  [████████░░] 14s    │   │  Patience bar (M1)
│   │  [?] hint            │   │  Hint button (M1)
│   │  5 remaining         │   │
│   └──────────────────────┘   │
│                              │
│  Response: [oui] [deux]     │  Response bar
│                              │
│  ┌────┐ ┌────┐ ┌────┐       │
│  │oui │ │deux│ │café│       │  Word bank (8 tiles, M0)
│  └────┘ └────┘ └────┘       │
│  ┌────┐ ┌────┐ ┌────┐       │
│  │trois│ │merci│ │bon│      │
│  └────┘ └────┘ └────┘       │
│  ┌────┐ ┌─────────────┐     │
│  │thé │ │   SEND ▶    │     │
│  └────┘ └─────────────┘     │
└──────────────────────────────┘
```

**M0:** Plain text for customer line, styled word tiles, score text after send, "X remaining" counter. No scene.
**M1:** + CSS/SVG cafe scene (counter, shelves, atmosphere), customer silhouette at counter, speech bubble, patience bar above customer, HUD (coins, reputation, day), hint button, tip feedback in scene, customer enter/exit CSS transitions.
**M2:** + Combo counter, challenge banner, learning moment overlay.
**M3:** Replace CSS/SVG with pixel art scene, customer sprites (5 variants), sprite animations, pixel art speech bubbles.

### Screen 3: Day Summary

**M0:** Customers served (X/8), score breakdown (N perfect, N good, etc.). Continue button → next Day Start.
**M1:** + Coins earned, reputation change, words practiced, words leveled up.
**M2:** + Combo target result, new words learned.
**M3:** + Achievements, animations.

### Screen 4: Between-Days Menu

**M0/M1:** Skip entirely. Summary → Continue → next Day Start.
**M2:** Menu with: Next Day, Word Shop, My Words.
**M3:** + Upgrade Cafe, Achievements list.

---

## 6. Content Plan

### Content Format

Two JSON files in `/data/`:

**`expressions.json`** — array of Expression objects:
```json
[
  { "id": "bonjour", "text": "bonjour", "nativeText": "hello", "ideaTags": ["greeting"], "stage": 1 },
  { "id": "oui", "text": "oui", "nativeText": "yes", "ideaTags": ["confirmation", "agreement"], "stage": 1 }
]
```

**`templates.json`** — array of DialogueTemplate objects:
```json
[
  {
    "id": "greeting_001",
    "ideaCategory": "greeting",
    "difficulty": 1,
    "customerLines": [
      { "text": "Bonjour!", "variables": {} },
      { "text": "Bonsoir!", "variables": {} },
      { "text": "Salut!", "variables": {} }
    ],
    "requiredIdeas": ["greeting"],
    "bonusIdeas": ["politeness"],
    "followUpIds": ["order_simple_001"]
  }
]
```

### Content Timeline

| Milestone | Expressions | Templates | How |
|---|---|---|---|
| **M0 (Days 1-3)** | 15 (Stage 1 + 3 items) | 20 (~5 per category) | Hand-write. See below for exact set. |
| **M2 (Weeks 2-3)** | 45 (all 4 stages) | 150+ (all 12 categories) | AI-assisted generation with human review. |
| **M3 (Weeks 4-5)** | 45 (same) | Fill gaps from playtesting | Targeted additions. |

### French Validation

**If the developer speaks French:** Self-review is sufficient for M0 (15 words, 20 templates, ~60 lines).

**If the developer does NOT speak French:** Every customer line must be reviewed by a French speaker before M0 playtest. This is ~60 lines of simple cafe French — a native speaker can review in 30 minutes. Do not skip this. Broken French will make playtesting unreliable because testers won't know if confusion is from bad UI or bad language.

For M2 (AI-generated templates), the review is more critical — schedule 2-3 hours of native speaker review for 150+ templates.

### Prototype Content Set (M0 — 15 expressions, 20 templates)

**Expressions:**
- Stage 1 (12): bonjour, bonsoir, au revoir, oui, non, d'accord, s'il vous plaît, merci, de rien, un, deux, trois
- Stage 2 partial (3): café, thé, bon

**Templates (20):**
- **greeting** (4): Simple hello, evening greeting, hello+goodbye, farewell
- **confirmation** (3): Yes/no response to question, agreement prompt, double-check order
- **ordering** (6): `{quantity} {item} s'il vous plaît`, `Je voudrais {quantity} {item}`, single item order, item with please, "the same as before", "something hot"
- **quantity** (3): "How many?", counting confirmation, "one or two?"
- **politeness** (4): Thank you exchange, please request, you're welcome, have a good day

Each template has 3 customer line variants × variable combinations → ~60 unique customer lines, ~180+ effective variations with variable substitution.

**Estimated authoring time:** 4-6 hours including:
- Writing the JSON (2-3h)
- Verifying `{variable}` references match expression IDs (0.5h)
- Verifying idea tag resolution: for each template, manually trace `requiredIdeas` → variable → expression → `ideaTags` to confirm correctness (1h)
- French review pass (0.5-1h, self or native speaker)

### AI-Assisted Content Generation (M2)

For expanding from 20 to 150+ templates:

1. Write a generation prompt with 3-5 hand-written templates per idea category as few-shot examples.
2. Include the full `expressions.json` so the AI knows which expression IDs and variables are valid.
3. Ask Claude to generate 10+ templates per category following the exact JSON schema.
4. Constraints to enforce in the prompt:
   - Variable values must be valid expression IDs from expressions.json
   - `requiredIdeas` must use `{variable}` references or valid idea tag strings
   - Customer lines must be natural conversational French
   - `difficulty` must match the highest stage of any referenced expression
   - Each template needs 3+ line variants
5. Human review every generated template for: natural French, correct tag mapping, variable reference validity.
6. Run a validation script that checks: all variable values exist in expressions.json, all non-variable idea tags exist on at least one expression, followUpIds reference existing template IDs.
7. Estimated effort: ~1 hour per idea category (prompt + review + fixes) × 12 categories = ~12 hours.

---

## 7. Simplifications for MVP

| GDD Feature | Simplification | Why Safe |
|---|---|---|
| **Day Generator** (weighted targeting, recency, difficulty curve) | Random template pick in M0. Add recency filter (last 3) in M1. Full targeting in M2. | 20 templates / 8 picks = low repeat chance without filtering. |
| **Game state machine** (7 states) | 3 states in M0: `AWAITING_RESPONSE → SHOWING_RESULT → NEXT_OR_END` | No animations, no arrival sequence, no rephrase = no intermediate states needed. |
| **Bank size scaling** (6-8 / 10-14 by mastery) | Fixed 8 tiles | Tuning knob, not core mechanic. |
| **Recency buffer** (last 10 templates) | Last 3 in M1, expand in M2 | Smaller pool = aggressive buffer causes starvation. |
| **Session targeting** (60/20/20 split) | Random in M0/M1 | Only 15 words — random hits everything frequently. |
| **Vocabulary stages** | All 15 words active from Day 1 | 15 words doesn't need gating. |
| **Multi-turn** | 1 turn per customer in M0/M1 | Same evaluation logic, less orchestration. |
| **Customer arrival animation** | CSS slide transition in M1, sprite animation in M3 | CSS transition sells the "next customer" feel. Sprite walk cycle is polish. |
| **Cafe scene** | CSS/SVG in M1, pixel art in M3 | The cafe scene is the *disguise* — without it, the game feels like a quiz app. CSS/SVG is fast to build and validates the visual framing. Pixel art is an upgrade, not the baseline. |
| **Patience bar color** | Single color shrinking in M1 | Green→yellow→red is polish. Shrinking communicates urgency. |
| **Tip animations** | "+N" text in M1 | Floating animation is M3 polish. |
| **Cold start** | All words start at Level 1 | Avoids needing New Word card flow. |

---

## 8. Risks and Mitigations

### Risk 1: Word bank feels like multiple choice (recognition, not retrieval)

**Severity:** High — would invalidate the core learning hypothesis.
**Mitigation:**
- Distractors must be plausible (same stage, cafe-relevant). Unit test: no distractor should have the same idea tag as a required word.
- 8 tiles for 2-3 required words = enough noise to require thought.
- Recall Mode (M2) addresses this for Level 2+ words.
- Track "time to first tap" in playtesting — if < 2 seconds consistently, the bank is too easy.
**When to worry:** After 5+ playtesters. Not before.

### Risk 2: Template variable resolution has subtle bugs

**Severity:** High — broken resolution = wrong required ideas = unfair scoring.
**Mitigation:**
- `resolveTemplate()` gets its own function, its own file section, its own unit tests.
- Test with the GDD's exact examples (Section 4.2): `{quantity}` → "deux" → tag "quantity".
- Test edge cases: template with no variables, template with 2+ variables resolving to the same tag, variable value not found in expressions.

### Risk 3: Content depth — 20 templates feel repetitive

**Severity:** Medium for M0 (short-lived), high if M0 extends.
**Mitigation:**
- 20 templates × 3 variants × variable substitution = ~180+ effective variations for 8-customer days.
- Recency filter (M1) prevents back-to-back repeats.
- Expand to 150+ in M2 before any external playtesting.

### Risk 4: Patience timer is frustrating, not fun

**Severity:** Medium.
**Mitigation:**
- Timer doesn't exist in M0 — first playtest is untimed.
- M1 starts at 20s (generous). Hardcoded constant, easy to tune.
- Add a dev-mode flag to disable timer for debugging.

### Risk 5: Day generation produces unsolvable word banks

**Severity:** High — player sees a word bank with no path to GOOD+.
**Mitigation:**
- **The single most important unit test**: for every template in templates.json, given the 15-word vocabulary, verify that `generateWordBank()` returns a bank where required ideas are coverable.
- Run this test on every content change.
- The safety constraint (GDD Section 3.2): template selection only picks templates whose required ideas can be satisfied by the player's active vocabulary. Enforce at generation time.

### Risk 6: Scope creep during M0

**Severity:** High for a solo developer.
**Mitigation:**
- M0 has 7 tasks. If it's not on the M0 list, it doesn't get built in days 1-3.
- The definition of "playable" is the contract: serve 5 customers, see scores, reach summary. Done.
- Timer, coins, hints are M1. Resist adding them during M0.

---

## 9. Testing Plan

### Unit Tests (write during M0, highest priority)

Copy these directly from the GDD as test cases:

**Evaluation (from GDD Section 4.2):**
```
"oui deux café s'il vous plaît" → PERFECT (all required + bonus)
"oui deux café"                 → GOOD (all required, no bonus)
"deux café"                     → UNDERSTOOD (2/3 = 67%)
"oui"                           → MISSED (1/3 = 33%)
"bonjour"                       → MISSED (0/3 = 0%)
```

**Template resolution:**
```
Template: "{quantity} {item} s'il vous plaît"
Variables: { quantity: "deux", item: "café" }
→ customerLine: "deux café s'il vous plaît"
→ requiredIdeas: ["confirmation", "quantity", "item"]  (not "{quantity}", "{item}")
```

**Word bank solvability (run against full content set):**
```
For each template in templates.json:
  Resolve with random variables
  Generate word bank from 15-word vocabulary
  Assert: for each required idea, at least one word in the bank has that tag
```

### Manual Playtest (after M0.7, then after M1.9)

Play 3 full days and answer:
1. Does the loop work end-to-end without crashes?
2. Is every word bank solvable? (If stuck, it's a bug.)
3. Does scoring match my expectations?
4. (M1) Does the timer feel right at 20 seconds?
5. (M1) Does mastery update correctly? After 5 uses across 2 days, does a word hit Level 2?
6. (M1) Does state persist across browser sessions?

### Debug Mode

Add a dev panel (toggled by keyboard shortcut, hidden in production):
- Current template ID
- Resolved required ideas + bonus ideas
- All idea tags available in the current word bank
- Player state dump (mastery levels, coins, reputation, day)

This makes debugging 10× faster and costs ~1 hour to build. Add in M1.

### Ignore Until Later

- Visual polish, alignment, spacing
- Audio
- Performance (8 tiles and 20 templates have no perf issues)
- Cross-browser (Chrome only for M0/M1)
- Mobile device testing (desktop viewport simulation is sufficient)
- Coin economy balance (no upgrades to spend on)

---

## 10. Final Recommendation

### Days 1-3: Build M0 (Bare Loop)

| Day | Build | End State |
|---|---|---|
| **Day 1** | Project setup + types + content JSON (tasks 0.1, 0.2) | `expressions.json` and `templates.json` exist, types compile, content loads |
| **Day 2** | Template resolution + evaluation + word bank generator + day generator (tasks 0.3-0.6) | All pure functions work with unit tests passing. Can run `generateDay()` in a test and get 8 solvable exchanges. |
| **Day 3** | Gameplay UI + day flow (task 0.7) | **Game is playable.** Serve 8 customers, see scores, finish a day, start the next. |

### Days 4-7: Build M1 (Cafe Scene + Basic Systems)

| Day | Build | End State |
|---|---|---|
| **Day 4** | Cafe scene layout + customer visual (tasks 1.1-1.2) | Game looks like a cafe — counter, shelves, customer silhouette, speech bubble |
| **Day 5** | Customer transitions + score feedback in scene + timer + coins (tasks 1.3-1.6) | Customers enter and leave, tips appear in scene, timer creates pressure |
| **Day 6** | Reputation + hints + persistence + mastery + summary (tasks 1.7-1.11) | Full systems: play across sessions, see words level up |
| **Day 7** | Recency filter + end-to-end playtest (tasks 1.12-1.13) | **Full prototype: cafe scene + game systems + persistence. Fix bugs.** |

### Do NOT Build Yet

| Feature | Why Not |
|---|---|
| Pixel art assets / commissioned sprites | CSS/SVG cafe scene validates the visual framing. Pixel art is an M3 upgrade. |
| Audio | Zero value for core loop validation |
| Multi-turn conversations | Single turns validate the same mechanic faster |
| Cafe upgrades / decorations | Meta progression without a fun core loop is pointless |
| Combo / challenge / rush hour | Engagement layers on a loop that doesn't exist yet |
| Regular customers / story arcs | Retention feature, not core loop |
| Recall Mode | The bank needs to work before you hide words from it |
| Queue system | Timer pressure is sufficient for M1 |
| Multiple customer sprite variants | Single silhouette validates the scene. Variants are M3. |

### The Fastest Smart Path

The very first thing to build — before any UI, any state, any styling — is this:

```typescript
// lib/game.ts — hour 1

const resolved = resolveTemplate(template, expressions);
// → { customerLine: "Deux cafés s'il vous plaît",
//    requiredIdeas: ["confirmation", "quantity", "item"],
//    bonusIdeas: ["politeness"] }

const bank = generateWordBank(resolved, playerVocab);
// → [oui, deux, café, trois, merci, bon, thé, s'il vous plaît]

const result = evaluate(
  [expressions.oui, expressions.deux, expressions.café],
  resolved.requiredIdeas,
  resolved.bonusIdeas
);
// → { score: "GOOD", coveredRequired: ["confirmation","quantity","item"], tip: 10 }
```

Three pure functions. No UI, no React, no state. Run them in a test file. If they produce correct output for the GDD's example scenarios, the game's brain works. Everything else is wrapping a screen around these three functions.

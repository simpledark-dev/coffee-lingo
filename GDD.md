(old, not up to date)

# Coffee Lingo — Game Design Document

## 1. Game Overview

### 1.1 Game Concept

Coffee Lingo is a top-down pixel-art cafe management game where the player works as a barista in a foreign city. Customers arrive, speak in the target language, and the player must understand their requests and respond using words and phrases they are learning. The game disguises language acquisition as cafe gameplay — the player's goal is to run a successful coffee shop, and language is the tool they use to do it.

The target experience is closer to **Papers Please meets Coffee Talk** — a cozy, pressure-driven interaction game where every customer encounter is a small language puzzle.

**Important: The player does not move.** The player character stands behind the counter at all times. There is no character controller, no pathfinding, no player movement. The top-down cafe scene is a **living backdrop** — customers walk in, sit, approach the counter, and leave autonomously. The player's only interaction is through the dialogue/word-bank UI. The cafe scene exists to create atmosphere and make upgrades/decorations feel tangible, not to provide movement-based gameplay.

### 1.2 Player Experience Goals

1. **"I'm running a cafe"** — not "I'm studying a language." Language is the medium, not the subject.
2. **"I'm getting better"** — the player should feel retrieval speed improving session over session.
3. **"Just one more customer"** — short interaction loops create natural replay momentum.
4. **"I actually remember these words"** — repeated retrieval in context should produce real retention.

### 1.3 Platform & Technical Strategy

**MVP Implementation:** Next.js web application, running **entirely client-side**. No backend, no server-side logic, no API calls during gameplay. All vocabulary data, dialogue templates, game logic, and player state live in the browser.

**Why client-side only:** Eliminates hosting costs, latency, and infrastructure complexity for MVP. The game's evaluation system is pure tag-matching (no AI/NLP at runtime), so there is no technical reason for a server. Player state is persisted in browser local storage (see Section 15.5).

**Viewport & Layout:**

```
Target viewport: 390 × 844 px (iPhone 14 / standard modern phone)
Orientation: Portrait only
Aspect ratio: ~9:19.5 (tolerate 9:16 through 9:21)
```

**Layout constraints:**
- All UI is designed for the **390px-wide canvas**. No responsive breakpoints — single fixed layout.
- **Top bar** (HUD): fixed height, ~44px. Coins, reputation, combo counter, day number.
- **Cafe scene**: ~55-60% of viewport height. Fixed camera, no scrolling.
- **Interaction area** (response bar + word bank + send button): ~35-40% of viewport height. Appears/disappears based on interaction state.
- **Minimum touch target**: 44×44px for all tappable elements (Apple HIG standard). Word tiles must be large enough to tap accurately with a thumb.
- **Safe areas**: Respect top notch/dynamic island (env(safe-area-inset-top)) and bottom home indicator (env(safe-area-inset-bottom)).
- **No scrolling during gameplay**. Everything visible in the interaction area must fit without scrolling. This constrains word bank size to what fits in ~35% of viewport height (3-4 rows of tiles at 44px+ each).

**Desktop browser rendering:**
- The game renders as a **centered mobile frame** on desktop — a 390×844 container centered on the page with a neutral dark background filling the remaining space.
- No desktop-specific layout adaptation. Desktop is a preview/development convenience, not a target platform.
- Mouse clicks map to touch taps. No hover states, no right-click interactions, no keyboard shortcuts during gameplay.

**Input assumptions:**
- **Touch-first**. All interactions are single-finger taps.
- No drag-and-drop, no swipe gestures, no multi-touch.
- No on-screen keyboard during normal gameplay — the constructive word bank replaces typing entirely. (Exception: Recall Mode in Section 7.4 opens a small text input for typing a single word from memory.)
- No physical keyboard input during gameplay.

**Future mobile deployment:**
- The fixed-viewport, touch-first, client-side architecture is designed to wrap cleanly into a native mobile app (Capacitor, PWA, or React Native WebView) with minimal changes.
- Local storage persistence maps directly to mobile app storage.
- No server dependency means offline play works out of the box.
- The 390×844 target viewport matches native mobile rendering — no layout changes needed.

---

## 2. Core Gameplay Loop

### 2.1 Interaction Flow

A single customer interaction follows this sequence:

```
1. ARRIVAL
   Customer sprite walks to the counter.
   ~1 second walk animation.

2. PROMPT
   Speech bubble appears with customer's line in the target language.
   A small hint icon (?) is available if the player needs help.
   Patience timer begins (visual: patience bar above customer's head).

3. COMPREHENSION
   Player reads the target-language sentence.
   If needed, player taps the hint icon to reveal a partial translation or idea hint.
   Using hints reduces tip reward but has no other penalty.

4. RESPONSE
   Response UI appears at bottom of screen (see Section 3).
   Player constructs a response by selecting words from a dynamic word bank.
   Player taps "Send" to submit.

5. EVALUATION
   System evaluates response for idea-level correctness (see Section 4).
   Result: PERFECT / GOOD / UNDERSTOOD / MISSED

6. REACTION
   Customer sprite plays reaction animation.
   PERFECT: big smile, heart emote, bonus tip
   GOOD: smile, normal tip
   UNDERSTOOD: slight nod, small tip
   MISSED: confused face, no tip, customer may repeat or rephrase

7. RESOLUTION
   Tip amount floats above counter (+15 coins, etc.).
   Word mastery progress updates silently in background.
   Customer exits or continues with follow-up line (multi-turn).

8. NEXT
   Next customer approaches, or brief idle moment before next arrival.
```

### 2.2 Timing

| Phase | Duration |
|---|---|
| Customer arrival animation | ~1s |
| Player reads + responds | 8-15s (governed by patience timer) |
| Reaction + resolution | ~2s |
| **Total per exchange** | **~10-20s** |

A customer visit may contain **1-3 exchanges** (single turn for simple orders, multi-turn for conversations). A full customer visit takes **10-45 seconds**.

### 2.3 Multi-Turn Conversations

Some customers have multi-turn visits:

```
Turn 1: Order       — "Deux cafés s'il vous plaît"
Turn 2: Follow-up   — "Pourquoi tu recommandes ce café?"
Turn 3: Small talk   — "Tu aimes travailler ici?"
```

Each turn runs the same PROMPT → RESPONSE → EVALUATION → REACTION cycle. The number of turns is determined by the customer's personality type (see Section 8). Between turns, the patience timer resets.

### 2.4 Idea Pressure

Idea Pressure is the mechanical expression of time pressure during retrieval:

**Patience Timer:**
- Each customer has a patience value (in seconds), displayed as a bar above their head.
- The timer starts when the customer's speech bubble appears.
- Timer speed varies by customer personality:
  - Friendly: 20 seconds
  - Regular: 15 seconds
  - Impatient: 10 seconds
  - Talkative: 18 seconds
  - Tourist: 18 seconds

**Queue Pressure:**
- When multiple customers are waiting, a queue forms visually at the door.
- Maximum queue length: 3 customers.
- If the queue is full when a new customer would arrive, the new customer leaves (lost customer — reduces daily reputation by 1).
- Customers in the queue do NOT have active patience timers — only the customer at the counter does.

**Customer Arrival Timing:**
- Customers do NOT arrive on a fixed timer. A new customer approaches the counter **immediately** when it becomes free (after the previous customer exits or moves to a table).
- If a queued customer is waiting, they step up to the counter with a ~1s walk animation. If the queue is empty, there is a **3-5 second idle pause** before the next scheduled customer enters from the door.
- All customers for the day are pre-generated (see Section 6.2), but they arrive sequentially — never simultaneously. The queue only forms when the player is slow to respond (patience timer running long or hitting MISSED rephrase cycles).

**Escalation:**
- If patience runs out: customer says a frustrated line ("Oublie ça..." / "Never mind..."), leaves with no tip, reputation decreases by 1.
- The player can still submit a response while the timer is running — there is no "too late" until the bar is fully empty.

---

## 3. Player Interaction System

### 3.1 Input Method Decision: Constructive Word Bank

**Decision:** The MVP uses a **constructive word bank** — the player builds responses by tapping words from a dynamically generated bank.

**Justification:**

| Option | Retrieval? | Mobile-Friendly? | 10-20s Feasible? | Grammar-Flexible? |
|---|---|---|---|---|
| Multiple choice | No (recognition) | Yes | Yes | No |
| Free typing | Yes (full retrieval) | Poor on mobile | Tight | Yes |
| Word bank (select one phrase) | Partial | Yes | Yes | No |
| **Constructive word bank** | **Yes (partial retrieval)** | **Yes** | **Yes** | **Yes** |

The constructive word bank works as follows:

1. When a customer speaks, a word bank appears at the bottom of the screen.
2. The bank contains **8-12 word tiles** — a mix of:
   - Target-language words the player has learned (active vocabulary)
   - A few distractor words (plausible but incorrect for this context)
   - Connector words (yes, no, and, because, etc.)
3. The player **taps words in sequence** to build a response. Selected words appear in a "response bar" above the word bank.
4. The player can tap a selected word again to remove it.
5. The player taps **"Send"** to submit.

**Why this supports the learning philosophy:**

- **Retrieval over recognition:** The player must *decide* which words to use and in what order — not just recognize the right answer from a list. The bank contains distractors, so the player must actively retrieve the correct idea-expression mapping.
- **Communication before grammar:** Word order doesn't need to be perfect. The evaluation system checks for idea coverage, not grammar (see Section 4).
- **Vocabulary compounding:** The player can combine multiple learned words into one response, which is visible and satisfying.
- **Scales with mastery:** As the player learns more words, the bank can include more of them, making the selection more challenging and the possible responses richer.

### 3.2 Word Bank Generation Rules

For each customer exchange, the system generates the word bank as follows:

```
1. REQUIRED WORDS: Include all words that could form a correct response
   (typically 2-5 words from the player's active vocabulary).

2. DISTRACTOR WORDS: Add 3-5 distractor words that are:
   - From the player's active vocabulary (so they are familiar)
   - Plausible in a cafe context but wrong for THIS specific prompt
   - Example: if the customer asks "Combien?" (how many?), include
     "bonjour" and "merci" as distractors

3. CONNECTOR WORDS: Always include basic connectors:
   - oui / non
   - et (and)
   - s'il vous plaît (please)
   - The target idea connector if applicable (parce que, etc.)

4. NATIVE LANGUAGE FALLBACKS: Include 1-2 English words that could
   help complete the idea if the player doesn't know the target word yet.
   Example: if "delicious" hasn't been learned, include "delicious" in English.
```

**Bank size scales with the mastery level of the words being targeted:**
- If the exchange targets mostly **Level 0-1 words** (new/newly learned): **6-8 tiles** — fewer distractors, easier to scan, reduces overwhelm for new vocabulary.
- If the exchange targets mostly **Level 2+ words** (familiar/fluent): **10-14 tiles** — more distractors, requiring sharper retrieval from a larger set.
- The "mostly" threshold: use the average mastery level of the required idea words. If average < 2, use the smaller bank; otherwise use the larger bank.

**Safety constraint:** The system must guarantee that the word bank always contains enough words to cover all required ideas. The template selection in Section 5.3 must only select templates whose required ideas can be satisfied by the player's current active vocabulary. If no eligible template exists for a target idea (e.g., the player hasn't learned any word tagged "reason" yet), that idea is skipped for this session and replaced with a review idea. This guarantee is enforced at day generation time, not at runtime.

### 3.3 UI Flow

```
┌──────────────────────────────────────┐
│                                      │
│     [Cafe Scene - Top Down View]     │
│                                      │
│   Customer at counter with           │
│   speech bubble + patience bar       │
│                                      │
│          💬 "Deux cafés             │
│           s'il vous plaît"           │
│                                      │
│   [?] hint button                    │
│                                      │
├──────────────────────────────────────┤
│                                      │
│   Response bar:  [ deux ] [ café ]   │
│                                      │
│   Word bank:                         │
│   ┌──────┐ ┌──────┐ ┌────────┐      │
│   │ deux │ │café  │ │bonjour │      │
│   └──────┘ └──────┘ └────────┘      │
│   ┌──────┐ ┌──────┐ ┌────────┐      │
│   │ oui  │ │merci │ │parce   │      │
│   └──────┘ └──────┘ │que     │      │
│   ┌──────┐ ┌──────┐ └────────┘      │
│   │trois │ │bon   │ ┌────────┐      │
│   └──────┘ └──────┘ │ SEND ▶ │      │
│                      └────────┘      │
└──────────────────────────────────────┘
```

**Comprehension Design:**

Customer lines are in the target language. The player must comprehend them to respond. To prevent a comprehension wall, the following rules apply:

1. **Known-word constraint:** Customer lines are constructed from templates whose variables resolve to words in the player's active vocabulary whenever possible. If the customer says "Deux cafés s'il vous plaît", the player should already know "deux", "café", and "s'il vous plaît" at Level 1+. Template selection enforces this.

2. **Structural words are allowed to be unknown:** Grammatical glue words in the customer's line (e.g., "je voudrais", "est-ce que") may not be in the player's vocabulary. These are comprehensible from context and the hint system covers the rest.

3. **Visual context aids comprehension:** Customer sprites, animations, and scenario context provide non-verbal cues. A customer holding up two fingers while saying "deux" reinforces meaning.

4. **The hint system is the safety net:** Players who can't comprehend always have hints available (see below). The game is designed so that early-game lines are simple enough to understand without hints, but hints are always there.

**Hint System:**
- Tapping [?] reveals a hint below the customer's speech bubble.
- Hint levels (tapping multiple times reveals more):
  - Hint 1: The **idea** required — e.g. "Confirm the order"
  - Hint 2: English translation of the customer's line
- There is no Hint Level 3. The system never highlights correct words in the bank — doing so would convert retrieval into recognition, undermining the core learning mechanic.
- Each hint level used reduces the tip reward:
  - 0 hints: full tip
  - 1 hint: 75% tip
  - 2 hints: 50% tip
- Hints do NOT affect word mastery progression — the learning still counts.

**Learning Moment Card:**
After any interaction where the player scored MISSED or UNDERSTOOD, a brief **Learning Moment** card appears (1-2 seconds, dismissible by tap):

```
┌─────────────────────────────────┐
│  💡 Learning Moment             │
│                                 │
│  The customer wanted:           │
│  "Two coffees please"           │
│                                 │
│  A good response:               │
│  "oui deux café"                │
│                                 │
│         [ Got it! ]             │
└─────────────────────────────────┘
```

This shows the correct idea-expression mapping **after** the interaction is over — preserving retrieval integrity during gameplay while ensuring the player always learns from mistakes. The card appears between customers, not during the timed interaction.

---

## 4. Response Evaluation System

### 4.1 Evaluation Model: Idea Coverage

The system does **not** check grammar, word order, or sentence structure. It checks whether the player's response **covers the required ideas**.

Each customer exchange has a set of **required idea tags** and **bonus idea tags** defined in its dialogue template.

**Example:**

Customer says: "Deux cafés s'il vous plaît"

Template resolved required_ideas: `[confirmation, quantity, item]` (from `{quantity}` → "deux" → tag "quantity", `{item}` → "café" → tag "item")
bonus_ideas: `[politeness]`

```
required_ideas: [confirmation, quantity, item]
bonus_ideas: [politeness]
```

The player's response is evaluated by mapping selected words to idea tags:

| Word selected | Maps to idea tags |
|---|---|
| oui | confirmation, agreement |
| deux | quantity |
| café | item |
| s'il vous plaît | politeness |
| merci | politeness |

### 4.2 Scoring Rules

```
PERFECT  — All required ideas covered + at least 1 bonus idea
GOOD     — All required ideas covered
UNDERSTOOD — At least 50% of required ideas covered
MISSED   — Less than 50% of required ideas covered
```

**Example evaluations for "Deux cafés s'il vous plaît":**

| Player response | Ideas covered | Score |
|---|---|---|
| "oui deux café s'il vous plaît" | confirmation ✓, quantity ✓, item ✓, politeness (bonus) | PERFECT |
| "oui deux café" | confirmation ✓, quantity ✓, item ✓ | GOOD |
| "deux café" | quantity ✓, item ✓ (2 of 3 = 67%) | UNDERSTOOD |
| "oui" | confirmation ✓ (1 of 3 = 33%) | MISSED |
| "bonjour" | (none relevant) | MISSED |

### 4.3 Word-to-Idea Mapping

Every word/expression in the vocabulary system has one or more idea tags:

```json
{
  "expression_id": "oui",
  "text": "oui",
  "language": "fr",
  "idea_tags": ["confirmation", "agreement"],
  "native_text": "yes"
}
```

When the player submits a response, the system:
1. Collects all idea tags from the selected words.
2. Compares against the exchange's required_ideas and bonus_ideas.
3. Computes the score.

No grammar parsing, no NLP, no AI at evaluation time. Pure tag matching.

### 4.4 Native Language Mixing

If the player selects an English fallback word from the bank:
- The word's idea tags are still counted for evaluation.
- The score is valid (GOOD or UNDERSTOOD), but cannot achieve PERFECT.
- A subtle visual indicator shows which words were native language (e.g. English words appear in a different color in the response bar).
- This encourages gradual transition to full target language without punishing early learners.

### 4.5 Handling "MISSED" Responses

When the player scores MISSED:
1. Customer shows confused reaction.
2. The customer **rephrases** the same request using simpler language or fewer words.
3. The word bank regenerates with the same required words but **no visual highlighting or glow** — the player must still retrieve the answer themselves. The bank may reduce distractors (fewer wrong options) to make the task easier without giving the answer away.
4. The player gets a second attempt.
5. Second attempt scoring: PERFECT is downgraded to GOOD, GOOD stays GOOD, etc.
6. If the player misses the second attempt, the customer leaves frustrated. No tip. Reputation -1.
7. After a failed second attempt (or any MISSED/UNDERSTOOD result), a **Learning Moment** card appears between customers showing the correct response (see Section 3.3). This ensures the player learns the answer **after** the retrieval attempt, not during it.

---

## 5. Dialogue System Architecture

### 5.1 Dialogue Templates

Every customer exchange is generated from a **dialogue template**. Templates are data, not code.

**Template structure:**

```json
{
  "template_id": "order_simple_quantity",
  "scene": "cafe",
  "idea_category": "ordering",
  "customer_line_template": "{quantity} {item} s'il vous plaît",
  "customer_line_variants": [
    "Je voudrais {quantity} {item}",
    "{quantity} {item} s'il vous plaît",
    "Bonjour, {quantity} {item}"
  ],
  "variables": {
    "quantity": ["un", "deux", "trois"],
    "item": ["café", "cappuccino", "thé"]
  },
  "required_ideas": ["confirmation", "{quantity}", "{item}"],
  "bonus_ideas": ["politeness"],
  "difficulty": 1,
  "language_layer": "domain",
  "follow_up_template_ids": ["why_recommend", "smalltalk_like_job"]
}
```

**Dynamic idea tag resolution:** When a template's required_ideas or bonus_ideas contain a `{variable}` reference, it is resolved at generation time by looking up the idea tags of the chosen variable value. Example: if `{quantity}` resolves to "deux", the system looks up the expression "deux" and finds its idea tags: `["quantity"]`. The required idea becomes `"quantity"`. Similarly, if `{item}` resolves to "café", its tag `"item"` is used. This means **idea tags are always the static tags defined on expressions** — there are no dynamically constructed tag strings like `quantity_two`. The word "deux" has the tag `"quantity"`, and the evaluation simply checks whether the player's response includes any word tagged `"quantity"`.
```

**Template with social conversation:**

```json
{
  "template_id": "why_recommend",
  "scene": "cafe",
  "idea_category": "reason",
  "customer_line_template": "Pourquoi tu recommandes {item}?",
  "customer_line_variants": [
    "Pourquoi {item} est populaire?",
    "Pourquoi les gens aiment {item}?",
    "C'est quoi le meilleur? Pourquoi?"
  ],
  "variables": {
    "item": ["ce café", "ce thé", "le cappuccino"]
  },
  "required_ideas": ["reason"],
  "bonus_ideas": ["opinion", "quality"],
  "difficulty": 2,
  "language_layer": "universal"
}
```

### 5.2 Idea Categories

The full list of idea categories used across all templates:

| Category | Examples of ideas | Example expressions (FR) |
|---|---|---|
| **greeting** | say hello, say goodbye | bonjour, au revoir, bonsoir |
| **confirmation** | agree, confirm order | oui, d'accord, exactement |
| **quantity** | specify a number | un, deux, trois, quatre, cinq |
| **ordering** | take/confirm an order | café, thé, cappuccino |
| **politeness** | be polite | s'il vous plaît, merci, de rien |
| **reason** | explain why | parce que, car |
| **opinion** | express preference | j'aime, je préfère, c'est bon |
| **quality** | describe something | bon, délicieux, populaire, chaud |
| **negation** | decline or deny | non, pas, désolé |
| **question** | ask something | combien, pourquoi, quand |
| **time** | reference when | aujourd'hui, demain, maintenant |
| **feeling** | express emotion | content, fatigué, heureux |

### 5.3 Conversation Generation Algorithm

When a customer arrives, the system selects their conversation as follows:

```
function generate_conversation(customer, session_state):

  1. Determine number of turns based on customer personality:
     - Friendly: 1-2 turns
     - Impatient: 1 turn
     - Talkative: 2-3 turns
     - Tourist: 1-2 turns
     - Regular: 2-3 turns (increases with relationship level)

  2. For turn 1, select a dialogue template:
     a. Query eligible templates:
        - scene = current scene ("cafe")
        - difficulty <= player's current vocabulary stage
          (the difficulty field on templates maps directly to vocabulary stages 1-4;
          this is redundant with idea category gating in most cases but serves
          as a safety filter for templates that mix ideas across stages)
        - idea_category matches a target idea for this session (see Section 6.3)
     b. Filter out templates used in the last 3 customer interactions
        (prevents immediate repetition of surface-level phrasing).
     c. Weighted random selection, with higher weight for:
        - Templates targeting words the player needs more practice with
          (lower mastery level)
        - Templates the player hasn't seen recently

  2b. For turns 2+, select from the previous turn's follow_up_template_ids:
      - Each template defines a list of valid follow-up template IDs
        (see Section 5.1, follow_up_template_ids field).
      - The system picks from this list using the same weighting logic
        (prioritize ideas the player needs practice with).
      - This ensures conversational coherence — an order is followed
        by a recommendation question or small talk, not another order.
      - If follow_up_template_ids is empty, the customer's visit ends
        (even if the personality allows more turns).

  3. For each selected template:
     a. Pick a random variant from customer_line_variants.
     b. Fill variables with random valid values.
     c. Generate the word bank (see Section 3.2).

  4. Return the ordered list of turns.
```

### 5.4 Surface-Level Variation

The same idea requirement produces varied experiences through:

1. **Line variants** — each template has 3+ customer phrasings for the same idea.
2. **Variable substitution** — quantities, items, and qualifiers shuffle.
3. **Customer personality** — the same template plays differently when spoken by a friendly vs. impatient customer (patience timer, visual tone, follow-up behavior).
4. **Multi-turn sequencing** — the same "reason" template may appear as turn 1 (standalone) or turn 3 (after an order), changing the conversational context.

---

## 6. Scenario Generation System

### 6.1 Session Idea Targeting

At the start of each day, the system builds a **target idea set** for the session:

```
function build_session_targets(player_state):

  1. REVIEW WORDS: Select 3-5 words with mastery Level 1-2 that
     haven't been practiced in the last 2 sessions.
     These get high priority — at least 60% of interactions will
     target these ideas.

  2. REINFORCE WORDS: Select 2-3 words with mastery Level 3 for
     maintenance. These appear in ~20% of interactions.

  3. NEW WORDS: If player has fewer than 5 active words at Level 1,
     introduce 1-2 new words from the next vocabulary stage
     (game-recommended) or player's wishlist (player-selected).
     These appear in ~20% of interactions.

  4. Return target_idea_set with weights.
```

### 6.2 Customer Sequence Generation

```
function generate_day(player_state, day_number):

  target_ideas = build_session_targets(player_state)
  customers = []

  num_customers = 8 + min(day_number, 7)
  // Day 1: 8 customers, scaling to 15 by Day 8+

  for i in 1..num_customers:
    // Select customer type
    available_types = unlocked_customer_types(player_state)
    type = weighted_random(available_types, weights_by_personality)

    // Check if this should be a regular customer visit
    if regular_customer_is_due(player_state, day_number):
      type = next_regular_customer(player_state)

    // Generate conversation targeting session ideas
    conversation = generate_conversation(type, target_ideas)
    customers.append(customer)

  return customers
```

### 6.3 Repetition Control

The system tracks a **recency buffer** — the last 10 template IDs used. Templates in the buffer are deprioritized (not excluded, just weighted lower). This ensures:

- The same **idea** can repeat frequently (different templates targeting "reason")
- The same **phrasing** rarely repeats back-to-back
- The player experiences variety while drilling the same retrieval patterns

### 6.4 Difficulty Curve Within a Day

Customers within a single day follow a difficulty arc with a **rush hour** climax:

```
Customers 1-3:   WARM-UP — single turn, familiar ideas, long patience timer
Customers 4-6:   BUILDING — may be multi-turn, mix familiar + review ideas
Customers 7-10:  RUSH HOUR — shorter patience (-3s), faster arrivals (1s idle gap
                 instead of 3-5s), more impatient/talkative types. Tips doubled (×2).
Customers 11+:   WIND-DOWN — return to normal pacing, friendly customers
```

**Rush Hour** is the peak intensity moment of each day. It creates a natural climax that:
- Tests retrieval speed under real pressure (shorter patience + faster arrivals)
- Rewards skilled play with doubled tips (making it the primary coin-earning window)
- Mirrors a real workday rhythm (quiet morning → busy lunch rush → calm afternoon)
- Gives the player warm-up time before the challenge and cool-down time after

Rush hour begins at customer 7 (or 60% through the day's customer list, whichever is later) and lasts for 3-4 customers. The queue is more likely to form during rush hour, adding visual pressure.

---

## 7. Vocabulary System

### 7.1 Idea Cards

An Idea Card is the fundamental vocabulary unit. Each card maps one **idea** to one or more **expressions** in the target language.

```json
{
  "idea_id": "reason",
  "idea_label": "giving a reason",
  "idea_label_native": "giving a reason",
  "expressions": [
    {
      "expression_id": "parce_que",
      "text": "parce que",
      "language": "fr",
      "idea_tags": ["reason"],
      "pronunciation_hint": "par-skuh",
      "difficulty": 2
    }
  ],
  "example_usage": "J'aime le café parce que c'est bon",
  "example_translation": "I like coffee because it's good"
}
```

### 7.2 Vocabulary Acquisition Flow

**First Encounter — Game-Recommended Path:**

```
1. PRE-DAY INTRODUCTION
   Before a day begins, if new words are scheduled (see Section 6.1),
   the player sees a "New Words" card:

   ┌─────────────────────────────────┐
   │  NEW IDEA: giving a reason      │
   │                                 │
   │  🇫🇷  parce que                │
   │  🔊  "par-skuh"                │
   │                                 │
   │  "J'aime le café parce que     │
   │   c'est bon"                    │
   │  (I like coffee because         │
   │   it's good)                    │
   │                                 │
   │         [ Got it! ]             │
   └─────────────────────────────────┘

   The player taps "Got it" — the word is now active at Level 0 (introduced).

2. FIRST USE IN CONTEXT
   The system immediately schedules a template requiring this idea
   in the upcoming day's customers (typically within the first 3 customers).
   The word appears in the word bank with a subtle "NEW" badge.
   Upon first successful use, the word advances to Level 1 (newly learned).

3. ONGOING PRACTICE
   The word enters the normal rotation governed by session targeting.
```

**Player-Selected Path:**

```
1. Player opens "Word Shop" from the between-days menu.
2. Available words are organized by idea category.
3. The Word Shop shows ONLY words from the player's current stage
   and one stage ahead (as a preview). Words beyond that are hidden.
   Words from the next stage are shown with a lock icon indicating
   when they become available (e.g., "Unlocks Day 9" or "Unlocks at
   Reputation 80").
4. Player browses and taps words they want to learn.
   - Each word shows: idea, expression, pronunciation, example.
   - Words cost nothing — no artificial gating.
   - Maximum active learning words: 10 at any time (prevents overwhelm).
   - "Active learning words" = words at Level 0 or Level 1.
     Words at Level 2+ no longer count against this limit.
   - Player can deactivate a learning word (removes it from active
     rotation, resets to Level 0). This frees up a slot.
5. Selected words enter the acquisition flow at step 1 (pre-day introduction)
   on the next day.
```

### 7.3 Word Mastery Levels

```
Level 0 — INTRODUCED
  Seen on the "New Words" card but not yet used in gameplay.
  Appears in word bank with "NEW" badge.

Level 1 — NEWLY LEARNED
  Used successfully 1-2 times.
  Appears frequently in sessions (high target weight).
  Word bank may highlight it subtly.

Level 2 — FAMILIAR
  Used successfully 5+ times across 2+ different sessions.
  Appears regularly but less urgently.
  No visual hints in word bank.

Level 3 — FLUENT
  Used successfully 12+ times across 4+ sessions.
  Appears occasionally for maintenance.
  Contributes to mastery statistics.
```

**Mastery advancement rules:**
```
Level 0 → 1: First successful use in a customer interaction.
Level 1 → 2: 5 cumulative successful uses AND used in at least 2 different sessions.
Level 2 → 3: 12 cumulative successful uses AND used in at least 4 different sessions.
```

A "successful use" means the word was part of a response scored UNDERSTOOD or better, and the word's idea tag matched a required or bonus idea in that exchange.

### 7.4 Recall Mode (Level 2+ Words)

As words reach Level 2 (Familiar) and above, the game occasionally tests **true recall** by hiding a known word from the bank:

**Mechanic:**
```
1. TRIGGER: On ~15% of exchanges where a required idea maps to a Level 2+ word,
   that word is removed from the word bank.

2. VISUAL: A blank tile with a subtle idea hint appears in the bank:
   ┌────────┐
   │  💭    │
   │ reason │  ← idea label only, no target-language word shown
   └────────┘

3. INTERACTION: The player taps the blank tile to type the word from memory
   (a small text input appears). If they type it correctly (fuzzy match —
   minor typos accepted), the word is placed in the response bar.

4. If the player can't remember, they can long-press the blank tile to
   reveal the word (counts as using a hint — tip penalty applies).

5. REWARD: Successfully recalling a word from memory grants +5 bonus coins
   and counts as double mastery progress for that word.
```

**Why this matters:** The constructive word bank is powerful for partial retrieval, but Level 2+ words risk becoming "recognition-only" if they're always visible. Recall mode bridges the gap toward true production — preparing the player for real conversations where no word bank exists. This is introduced gradually (15% frequency) so it feels like an exciting challenge, not a punishment.

### 7.5 Active Word Forcing

The **Word Challenge** is a bonus objective that appears on some customer interactions.

**Mechanic:**
```
1. TRIGGER: On ~20% of customer interactions, a Word Challenge appears.
   A small banner shows above the word bank:
   "💡 Challenge: Use 'parce que' in your response!"

2. The customer's prompt does NOT require "reason" as an idea.
   Example: Customer says "Un café s'il vous plaît" (a simple order).

3. The player can respond normally (just confirm the order) for regular scoring.
   OR the player can work "parce que" into their response creatively.
   Example: "oui un café parce que c'est bon" (yes one coffee because it's good)

4. DETECTION: If the challenge word's idea tag appears in the submitted
   response AND it was not a required idea for this exchange,
   the challenge is considered completed.

5. REWARD:
   - Challenge completed: +10 bonus coins, word gets +2 mastery progress
   - Challenge ignored: no penalty, normal scoring applies

6. SELECTION: Challenge words are chosen from Level 1-2 words
   that need more practice. Never Level 0 or Level 3.
```

### 7.6 Vocabulary Compounding

**Detection:**
```
When evaluating a response, count the number of distinct
learned words (Level 1+) used.

combo_count = number of distinct active vocabulary words in the response

If combo_count >= 3: trigger COMBO bonus
```

**Reward:**
```
combo_count = 3: "Nice combo!" — +5 bonus coins
combo_count = 4: "Great combo!" — +10 bonus coins
combo_count = 5+: "Amazing combo!" — +20 bonus coins
```

**Combo visibility in HUD:**
- A persistent **combo counter** appears in the top bar during gameplay: `Combos: 3/5`
- Each day has a **daily combo target** (e.g., "Get 5 combos today"). The target scales with the player's vocabulary size (more words = higher target).
- Meeting the daily combo target awards a bonus at the end-of-day summary: +25 coins and a "Combo Master" highlight.
- The combo counter resets each day. The daily target is shown at day start.

**Combo animation:** When triggered, a "3x COMBO!" text pops above the response bar with a sparkle effect.

This rewards building longer, more complex responses, makes the transition from single-word answers to full sentences feel rewarding, and gives the player a visible daily goal beyond just serving customers.

### 7.7 Vocabulary Progression Stages

Stages gate which idea categories are available:

```
STAGE 1 — SURVIVAL (Days 1-3)
  Unlocked ideas: greeting, confirmation, quantity, politeness
  ~12 words available

STAGE 2 — DAILY (Days 4-8)
  Unlocked ideas: + ordering, negation, quality
  ~25 words available

STAGE 3 — WORKPLACE (Days 9-14)
  Unlocked ideas: + question, time
  ~35 words available

STAGE 4 — SOCIAL (Days 15+)
  Unlocked ideas: + reason, opinion, feeling
  ~50 words available
```

Stage advancement is **primarily** day-based to ensure forward momentum, but includes a **mastery guardrail**: the player must have at least **50% of the current stage's words at Level 1+** before advancing to the next stage. If the day threshold is reached but the mastery guardrail is not met, advancement is delayed until the guardrail clears. This prevents a player from being flooded with new vocabulary while still struggling with the current set.

In practice, most players will meet the guardrail naturally because the session targeting algorithm (Section 6.1) heavily prioritizes current-stage words. The guardrail is a safety net, not a gate most players will notice.

---

## 8. Customer AI System

### 8.1 Customer Types

| Type | Turns | Patience (s) | Language Layer | Behavior |
|---|---|---|---|---|
| **Friendly** | 1-2 | 20 | Domain + Universal | Patient, encouraging. On MISSED, smiles and repeats slowly. |
| **Impatient** | 1 | 10 | Domain only | Quick orders, no small talk. Taps counter if player is slow. |
| **Talkative** | 2-3 | 18 | Universal + Social | Always adds follow-up questions. Great for practicing connectors. |
| **Tourist** | 1-2 | 18 | Domain + Universal | May use simpler vocabulary. Occasionally uses English words. |
| **Regular** | 2-3 | 15 | All layers | Relationship deepens over time. Unlocks deeper conversations. |

**Unlock schedule (day-based, the primary unlock path):**
- Day 1: Friendly only
- Day 3: + Tourist
- Day 5: + Impatient
- Day 7: + Talkative
- Day 10: + Regular (first named regular appears)

Reputation milestones (Section 9.4) provide an **alternative early unlock** for fast learners — e.g., reaching reputation 5 unlocks Tourist even before Day 3. The unlock condition is: **day threshold OR reputation threshold, whichever is reached first.**

### 8.2 Reaction Logic

Customer reactions are determined by the evaluation score:

```
function react(customer, score):
  if score == PERFECT:
    play_animation: "happy"
    show_emote: ❤️
    tip = base_tip * 1.5 * hint_multiplier
    reputation_change = +1

  else if score == GOOD:
    play_animation: "smile"
    show_emote: 😊
    tip = base_tip * 1.0 * hint_multiplier
    reputation_change = 0

  else if score == UNDERSTOOD:
    play_animation: "nod"
    show_emote: (none)
    tip = base_tip * 0.5 * hint_multiplier
    reputation_change = 0

  else if score == MISSED:
    play_animation: "confused"
    show_emote: ❓
    tip = 0
    reputation_change = 0
    trigger_rephrase(customer)  // customer tries again

  // Base tip varies by customer type:
  // Friendly: 10, Impatient: 15, Talkative: 10, Tourist: 12, Regular: 12
```

### 8.3 Regular Customer Relationship System

Regular customers are **named, persistent NPCs** who return every few days.

**Data model:**
```json
{
  "regular_id": "maria",
  "name": "Maria",
  "sprite_variant": "woman_brown_hair",
  "relationship_level": 0,
  "visits": 0,
  "last_visit_day": null,
  "visit_frequency_days": 3,
  "conversation_tier": 1
}
```

**Relationship progression:**
```
Level 0 (Stranger): 0-2 visits
  - Uses generic dialogue templates
  - 1-2 turns per visit

Level 1 (Acquaintance): 3-5 visits
  - Greets player by role ("Bonjour, barista!")
  - 2 turns per visit
  - Unlocks personal small talk ("Tu aimes le café?")

Level 2 (Familiar): 6-9 visits
  - Greets warmly ("Bonjour mon ami!")
  - 2-3 turns per visit
  - Unlocks opinion/feeling conversations
  - Tips increase by 25%

Level 3 (Friend): 10+ visits
  - Custom greeting line
  - 3 turns per visit
  - Unlocks storytelling-level dialogue (Stage 4 ideas)
  - Tips increase by 50%
```

Regular customers appear automatically based on visit_frequency_days. The MVP includes **2 regular customers** (e.g. Maria and Jean-Pierre), with more unlockable through cafe upgrades.

### 8.4 Daily Challenge Customer

The **last customer of each day** (starting from Day 3) is a **Challenge Customer** — a special encounter designed as the day's climax.

**Mechanic:**
```
1. VISUAL: Challenge Customer enters with a distinct visual indicator
   (golden patience bar, small star icon above head).

2. TURNS: Always 3 turns — more than most regular interactions.
   The conversation builds in complexity across turns.

3. SCORING: Each turn is scored normally, but a bonus is awarded
   at the end based on aggregate performance:
   - 3/3 GOOD+: "Flawless Service!" — +50 bonus coins, +2 reputation
   - 2/3 GOOD+: "Good Service!" — +25 bonus coins, +1 reputation
   - 1/3 or less: No bonus (normal per-turn rewards still apply)

4. CUSTOMER TYPE: The Challenge Customer personality rotates daily
   (not always the same type). They use templates from the player's
   current and previous vocabulary stages, ensuring a comprehensive test.

5. NARRATIVE: Challenge Customers have unique one-liner flavor text
   on arrival (e.g., "A well-dressed woman walks in purposefully...")
   to make them feel special without requiring a separate art asset.
```

The Challenge Customer serves as a daily "boss encounter" — a moment of heightened stakes that gives each day a satisfying conclusion and a reason to push through wind-down customers.

**Story Arcs:** Each regular customer has a **mini narrative arc** that unfolds across visits, giving the player a reason to care about their return:

```
Maria's Story Arc (example):
  Visit 1-2: Generic orders, polite small talk
  Visit 3-4: Mentions she's looking for a new job ("Je cherche du travail")
  Visit 5-6: Asks for the player's opinion ("Tu penses que c'est bien?")
  Visit 7-8: Shares she got the job ("Je suis contente!")
  Visit 9+:  References her new job in small talk, unlocks new dialogue themes
```

Story beats are tied to visit count, not relationship level (though the two correlate). Each beat is a set of story-specific dialogue templates that are prioritized when the regular visits. Between story beats, regular customers use normal templates. This creates emotional investment without requiring complex branching narrative — each story is a simple linear sequence of 4-5 beats.

**Template gating by relationship level:** Dialogue templates can have an optional `min_relationship_level` field (default: 0). When generating a conversation for a regular customer, only templates where `min_relationship_level <= customer.relationship_level` are eligible. Generic cafe templates (min_relationship_level: 0) are always available. Personal small talk templates are gated to Level 1+. Opinion/feeling templates to Level 2+. This is how relationship progression unlocks deeper conversations.

---

## 9. Progression System

### 9.1 Currencies and Resources

The game has **two resources**:

| Resource | Earned from | Spent on |
|---|---|---|
| **Coins** | Tips from customers, combo bonuses, challenge bonuses | Cafe upgrades, decorations |
| **Reputation** | See breakdown below | Nothing — it is a cumulative score that gates unlocks |

Coins are the primary currency. Reputation is **never spent** — it only goes up (or stays flat). It acts as a progression gate for customer types and early vocabulary stage access.

**Reputation earning rules:**
| Event | Reputation change |
|---|---|
| PERFECT response | +1 |
| GOOD response | 0 |
| UNDERSTOOD response | 0 |
| MISSED (second attempt also failed) | -1 |
| Customer leaves (patience timeout) | -1 |
| Customer lost (queue overflow) | -1 |
| Day completed (all customers served) | +2 |
| Regular customer visit (any score) | +1 |

Reputation cannot go below 0.

### 9.2 Skill Progression

Skill progression is implicit — there is no "skill stat." The player's improvement is reflected in:
- Faster response times (internal metric, not shown to player)
- Fewer hints used per session
- Higher average evaluation scores
- More words at Level 2-3

The **end-of-day summary** shows these trends to make progress visible (see Section 11).

### 9.3 Reward Loop

Each customer interaction produces immediate feedback:

```
Successful exchange:
  → Coins float above counter (visual reward)
  → Customer reaction animation (emotional reward)
  → Word mastery progress (silent, background)
  → Combo animation if applicable (surprise reward)

End of day:
  → Summary screen with stats (progress reward)
  → Coins total for the day (accumulation reward)
  → "Best streak" highlight (achievement reward)
```

### 9.4 Meta Progression

Long-term progression is driven by cafe upgrades (Section 10) and vocabulary stage unlocks.

**Reputation milestones:**

| Reputation | Unlock |
|---|---|
| 5 | Tourist customer type |
| 15 | Impatient customer type |
| 25 | Talkative customer type |
| 40 | Regular customer (Maria) |
| 60 | Regular customer (Jean-Pierre) |
| 80 | Stage 3 vocabulary unlocked early (normally Day 9) |
| 100 | Stage 4 vocabulary unlocked early (normally Day 15) |

Reputation milestones allow fast learners to accelerate, while the day-based stage system ensures slower learners still progress.

---

## 10. Cafe Upgrade System

### 10.1 Upgrade Tiers

Upgrades are purchased with coins from the between-days menu.

```
TIER 1 — STARTER CAFE (Default)
  Visual: Small counter, 2 tables, basic coffee machine, plain walls
  Gameplay: Max 8 customers/day, basic customer types only
  Cost: Free (starting state)

TIER 2 — GROWING CAFE (Unlock: Day 5+, 200 coins)
  Visual: + 1 table, potted plant, menu board on wall, better lighting
  Gameplay: Max 12 customers/day, talkative customers unlocked
  New content: 3 new dialogue templates (quality-related)

TIER 3 — POPULAR CAFE (Unlock: Day 10+, 500 coins)
  Visual: + 2 tables, espresso machine upgrade, bookshelf decoration,
          window with rain animation
  Gameplay: Max 15 customers/day, all customer types available
  New content: 5 new dialogue templates (social layer)

TIER 4 — BELOVED CAFE (Unlock: Day 20+, 1000 coins)
  Visual: Full interior overhaul — cozy lighting, art on walls,
          outdoor seating visible through window
  Gameplay: Special event customers (e.g., a food critic)
  New content: Expanded regular customer conversations
```

### 10.2 Decorations

In addition to tier upgrades, players can buy individual decorations:

| Decoration | Cost | Visual Effect |
|---|---|---|
| Plant (small) | 25 coins | Adds a potted plant to a table |
| Plant (large) | 50 coins | Adds a floor plant near the door |
| Wall art | 75 coins | Painting appears on wall |
| New counter | 150 coins | Counter sprite changes |
| Cafe sign | 100 coins | Custom sign above door |

Decorations are purely cosmetic in the MVP — they give the player ownership over their space and a reason to earn coins beyond gameplay unlocks.

**Placement:** Each decoration has a **fixed, predefined position** in the cafe scene. When purchased, it appears in its designated spot automatically. The player does not choose placement. This avoids building a placement UI for MVP. Each decoration slot can only hold one item (no stacking).

### 10.3 Upgrade Effects on Gameplay

Each tier unlock introduces:
1. **More customers per day** — more practice opportunities
2. **New dialogue templates** — more variety
3. **New visual environment** — sense of achievement and ownership
4. **New customer types or regular customers** — richer interactions

---

## 11. Day / Session System

### 11.0 Session vs. Day Distinction

A **day** is a single in-game workday (8-15 customers). A **session** is the real-world play session — the time between the player opening and closing the game.

**A single day takes approximately 3-7 minutes of active gameplay** (10-15 customers × 15-30 seconds per customer visit, including idle gaps). The target of 20-30 minutes per session means **the player is expected to play 3-6 days per session**. The between-days menu is a brief pause within a session, not a session boundary.

Players can stop at any between-days screen and resume later. There is no session timer or daily real-world limit.

### 11.1 Day Flow

```
1. DAY START SCREEN
   "Day {n}" with a morning cafe illustration.
   If new words are being introduced: "New Words" card (see 7.2).
   If a Word Challenge is active: brief preview.
   Player taps "Open Shop" to begin.

2. GAMEPLAY
   Customers arrive in sequence (see Section 6.2).
   Brief idle moments (2-3 seconds) between customers
   where the cafe is visible and ambient.
   A small "X remaining" counter shows in the HUD.

3. DAY END
   After the last customer leaves:
   "Closing time!" message.
   Cafe empties.
   Transition to summary screen.

4. SUMMARY SCREEN (see 11.2)

5. BETWEEN-DAYS MENU
   Options: "Next Day", "Upgrade Cafe", "Word Shop", "My Words"
   Player can browse their vocabulary, check mastery, buy upgrades.
   No time pressure — this is the reflective/planning phase.
```

### 11.2 Summary Screen

```
┌────────────────────────────────────────┐
│           ☀️ Day {n} Complete!         │
│                                        │
│   Customers served:    12 / 14         │
│   Perfect responses:   6               │
│   Coins earned:        185 💰          │
│   Reputation:          +4 ⭐           │
│                                        │
│   ── Words ──                          │
│   Words practiced:     8               │
│   New words learned:   2               │
│   Words leveled up:    1 (parce que→L2)│
│                                        │
│   ── Achievements ──                   │
│   🏆 "Reason Master" — used 'parce    │
│      que' 5 times today                │
│                                        │
│          [ Continue → ]                │
└────────────────────────────────────────┘
```

### 11.3 Micro Achievements

Achievements trigger on specific milestones and are shown on the summary screen:

| Achievement | Condition |
|---|---|
| First Words | Complete your first customer interaction |
| Streak! | 5 PERFECT scores in a row (within one day) |
| Combo Builder | Get a 3+ word combo |
| Reason Master | Use "parce que" 5 times total |
| Regular | Serve Maria 3 times |
| Big Tipper | Earn 200+ coins in one day |
| Polyglot in Training | Have 10 words at Level 2+ |
| Full House | Serve all customers in a day with no one leaving |

Achievements are shown once when earned, then viewable in a persistent list from the between-days menu.

---

## 12. UI and HUD Design

### 12.1 Gameplay HUD

During active gameplay, the screen shows:

```
┌──────────────────────────────────────┐
│ [185💰] [42⭐] [Combo:2/5] [Day 7] │  ← Top bar
│                                      │
│                                      │
│        [Cafe scene occupies          │
│         ~60% of screen height]       │
│                                      │
│   Customer at counter with:          │
│   - Speech bubble (target language)  │
│   - Patience bar (colored timer)     │
│   - [?] hint button                  │
│                                      │
│   Customers left: 5                  │
│                                      │
├──────────────────────────────────────┤
│                                      │
│   [Response bar + Word bank          │  ← Bottom ~40%
│    occupies bottom of screen]        │  (appears during interaction,
│                                      │   hidden during idle)
│           [ SEND ▶ ]                 │
└──────────────────────────────────────┘
```

### 12.2 Key UI Elements

| Element | Location | Purpose |
|---|---|---|
| Coin counter | Top left | Shows accumulated coins |
| Reputation | Top center-left | Shows cumulative reputation |
| Combo counter | Top center-right | "Combo: 2/5" — daily combo progress |
| Day counter | Top right | Current day number |
| Patience bar | Above customer sprite | Visual timer — green → yellow → red |
| Speech bubble | Above customer | Customer's line in target language |
| Hint button [?] | Below speech bubble | Reveals progressive hints |
| Response bar | Bottom area, above word bank | Shows words the player has selected |
| Word bank | Bottom 30% of screen | 8-12 tappable word tiles |
| Send button | Bottom right | Submits response |
| Customers remaining | Below cafe scene | "5 remaining" — number of customers yet to serve |
| Challenge banner | Above word bank (when active) | "💡 Challenge: Use 'parce que'!" |

### 12.3 Feedback Indicators

| Event | Visual Feedback |
|---|---|
| PERFECT response | Customer: heart emote + happy anim. Coins: "+15 💰" floats up. Star burst effect. |
| GOOD response | Customer: smile anim. Coins: "+10 💰" floats up. |
| UNDERSTOOD response | Customer: nod anim. Coins: "+5 💰" floats up. |
| MISSED response | Customer: confused anim + "❓" emote. Screen subtly shakes. |
| Word mastery level up | Small "⬆️" icon next to the word briefly. Shown on summary screen. |
| Combo | "3x COMBO!" text pops above response bar with sparkle effect. |
| Challenge complete | "💡 Challenge Complete! +10" banner flashes briefly. |
| Customer leaves (timeout) | Customer turns, annoyed emote "😤", walks to door. |

---

## 13. Audio Design

### 13.1 Sound Effects

| Event | Sound |
|---|---|
| Customer enters | Door bell chime (two-tone, warm) |
| Speech bubble appears | Soft pop / paper unfold sound |
| Word tile tapped | Light click / tap (tactile feedback sound) |
| Word removed from response | Soft reverse click |
| Send button pressed | Whoosh / confirm sound |
| PERFECT response | Bright chime + coin clink |
| GOOD response | Soft chime + coin clink |
| UNDERSTOOD response | Neutral tone + single coin |
| MISSED response | Soft "bwom" (not punishing — more of a gentle miss indicator) |
| Combo triggered | Ascending chime sequence |
| Customer leaves angry | Door slam (not loud — subtle) |
| Day complete | Warm completion jingle (3-4 notes) |
| Achievement unlocked | Achievement chime (distinct from other sounds) |
| Cafe upgrade purchased | Construction/sparkle sound |

### 13.2 Ambient Audio

- **Base layer:** Cafe ambience — low murmur of background conversation, distant street sounds, occasional clinking of cups.
- **Coffee machine:** Intermittent steam/brewing sounds during idle moments between customers.
- **Weather:** If the cafe window shows rain (Tier 3+), soft rain ambience mixed in.

### 13.3 Music

- **Gameplay:** Looping lo-fi or light jazz background track. Low volume — should not compete with sound effects or distract from reading. Tempo: relaxed (80-100 BPM). Multiple tracks that rotate across days to prevent fatigue.
- **Summary screen:** Slightly warmer/resolved version of the gameplay theme.
- **Between-days menu:** Quiet ambient pad or no music — a moment of calm.

---

## 14. MVP Content Scope

### 14.1 MVP Vocabulary List (~45 expressions)

**Stage 1 — Survival (12 words):**

| Idea | Expression (FR) | English |
|---|---|---|
| greeting | bonjour | hello |
| greeting | bonsoir | good evening |
| farewell | au revoir | goodbye |
| confirmation | oui | yes |
| negation | non | no |
| confirmation | d'accord | okay / agreed |
| politeness | s'il vous plaît | please |
| politeness | merci | thank you |
| politeness | de rien | you're welcome |
| quantity | un | one |
| quantity | deux | two |
| quantity | trois | three |

**Stage 2 — Daily (13 words):**

| Idea | Expression (FR) | English |
|---|---|---|
| item | café | coffee |
| item | thé | tea |
| item | cappuccino | cappuccino |
| item | lait | milk |
| item | sucre | sugar |
| quality | bon | good |
| quality | chaud | hot |
| quality | froid | cold |
| ordering | je voudrais | I would like |
| negation | désolé | sorry |
| negation | pas | not |
| confirmation | exactement | exactly |
| politeness | bonne journée | have a good day |

**Stage 3 — Workplace (10 words):**

| Idea | Expression (FR) | English |
|---|---|---|
| question | combien | how much / how many |
| question | quand | when |
| quality | délicieux | delicious |
| quality | populaire | popular |
| time | aujourd'hui | today |
| time | demain | tomorrow |
| time | maintenant | now |
| quantity | quatre | four |
| quantity | cinq | five |
| ordering | l'addition | the bill |

**Stage 4 — Social (10 words):**

| Idea | Expression (FR) | English |
|---|---|---|
| reason | parce que | because |
| opinion | j'aime | I like |
| opinion | je préfère | I prefer |
| opinion | je pense | I think |
| feeling | content | happy |
| feeling | fatigué | tired |
| opinion | c'est bien | it's good / nice |
| opinion | beaucoup | a lot / very much |
| preference | favori | favorite |
| preference | meilleur | best |

### 14.2 Content Targets

| Content Type | MVP Target |
|---|---|
| Vocabulary expressions | 45 |
| Idea categories | 12 |
| Dialogue templates | 150+ (~12 per idea category) |
| Customer line variants per template | 3-4 |
| Total unique customer lines | ~500+ |
| Customer types | 5 |
| Regular customers | 2 |
| Cafe upgrade tiers | 4 |
| Decorations | 5 |
| Achievements | ~10 |

### 14.3 Scalability

The system is built to scale by adding data, not code:
- **New words:** Add entries to the vocabulary data file with idea tags.
- **New templates:** Add template entries referencing idea categories.
- **New scenes:** Add scene identifier; templates tagged to the new scene become available.
- **New customer types:** Add personality definition with turns, patience, and layer preferences.

The architecture supports **thousands of words** by keeping evaluation as tag-matching (no NLP required) and dialogue as template-driven generation.

**All content is local.** Vocabulary, dialogue templates, customer definitions, and game configuration are bundled as static JSON files shipped with the application. No network requests are needed to load or generate content. This means:
- Content updates require a new app deployment (acceptable for MVP).
- The full content set (~150 templates, ~45 expressions, ~5 customer types) is small enough to load entirely into memory at app start.
- Day generation, word bank generation, and evaluation all run synchronously in the browser with no latency.

---

## 15. Content Data Model

### 15.1 Entity Relationships

```
IdeaCategory (1) ──── has many ──── (N) IdeaCard
IdeaCard (1)     ──── has many ──── (N) Expression
Expression (1)   ──── has many ──── (N) IdeaTag
IdeaTag (N)      ──── referenced by ── (N) DialogueTemplate (required_ideas, bonus_ideas)
DialogueTemplate (1) ─ has many ──── (N) LineVariant
DialogueTemplate (1) ─ belongs to ─── (1) Scene
DialogueTemplate (1) ─ belongs to ─── (1) IdeaCategory
CustomerType (1) ──── defines ────── turns, patience, layer preferences
RegularCustomer (1) ─ extends ────── CustomerType with persistence data
```

### 15.2 Core Data Structures

**Expression:**
```json
{
  "expression_id": "parce_que",
  "text": "parce que",
  "language": "fr",
  "native_text": "because",
  "idea_tags": ["reason"],
  "difficulty": 2,
  "stage": 4,
  "pronunciation_hint": "par-skuh"
}
```

**Dialogue Template:**
```json
{
  "template_id": "order_simple_001",
  "scene": "cafe",
  "idea_category": "ordering",
  "difficulty": 1,
  "language_layer": "domain",
  "customer_lines": [
    { "text": "{quantity} {item} s'il vous plaît", "variables": {"quantity": ["un", "deux", "trois"], "item": ["café", "thé"]} },
    { "text": "Je voudrais {quantity} {item}", "variables": {"quantity": ["un", "deux", "trois"], "item": ["café", "cappuccino"]} }
  ],
  "required_ideas": ["confirmation", "{quantity}", "{item}"],
  "bonus_ideas": ["politeness"],
  "follow_up_template_ids": ["why_recommend_001", "smalltalk_like_job_001"]
}
```

**Player Vocabulary State (per expression):**
```json
{
  "expression_id": "parce_que",
  "mastery_level": 2,
  "total_successful_uses": 7,
  "sessions_used_in": 3,
  "last_used_day": 8,
  "introduced_on_day": 4
}
```

**Player State:**
```json
{
  "current_day": 8,
  "coins": 485,
  "reputation": 34,
  "cafe_tier": 2,
  "decorations_owned": ["plant_small", "wall_art"],
  "vocabulary_stage": 3,
  "active_vocabulary": ["bonjour", "oui", "non", "..."],
  "learning_queue": ["parce_que", "j_aime"],
  "regular_customers": {
    "maria": { "relationship_level": 1, "visits": 4, "last_visit_day": 6 }
  },
  "achievements_earned": ["first_words", "streak"],
  "recency_buffer": ["order_simple_001", "greeting_002", "..."]
}
```

### 15.3 English Fallback Words

Each idea tag has a defined English fallback word used when the player hasn't learned any target-language expression for that idea:

```json
{
  "idea_tag": "reason",
  "fallback_english": "because"
}
```

The word bank generator (Section 3.2) checks: for each required idea in the current exchange, does the player have an active vocabulary word with that tag? If not, include the English fallback word. The fallback word carries the same idea tag for evaluation purposes but is visually marked as English (different tile color).

Fallback definitions are part of the content data — one per idea tag. They are defined alongside idea categories, not per-expression.

### 15.4 Adding New Content

To add new vocabulary for a new scene (e.g., taxi):

1. Add new expressions to the vocabulary data file with idea tags.
2. Add new dialogue templates tagged with `"scene": "taxi"`.
3. Add a scene definition with its layout and customer types.
4. Existing universal expressions (parce que, oui, merci, etc.) automatically work in the new scene because evaluation is tag-based — no per-scene coding required.

### 15.5 Save / Persistence Model

**Storage:** Player state is persisted in **browser local storage** (`localStorage` API). No server-side persistence, no accounts, no cloud sync for MVP. The game is entirely client-side (see Section 1.3).

**Save points:**
- Player state is saved at the **end of each day** (after the summary screen).
- If the player closes the browser mid-day, progress for that day is lost — the player restarts the current day on next launch. This is acceptable because days are short (3-7 minutes).
- Between-days menu state (current screen) is also saved, so the player returns to where they left off.

**Data saved:** The full Player State object (Section 15.2) including vocabulary mastery, coins, reputation, cafe tier, decorations, regular customer relationships, achievements, and recency buffer. Serialized as JSON in a single `localStorage` key.

**The recency buffer resets at the start of each day.** This prevents cross-day staleness when the template pool is small in early game.

**Risks of local-only storage:** Clearing browser data erases all progress. This is a known MVP limitation. Future versions may add export/import (JSON file) or cloud sync. For MVP, this is acceptable — the game targets short-term validation, not long-term retention.

---

## 16. Example Gameplay Walkthrough

### Day 4 — Player has 18 active words, cafe Tier 1, 3 word at Level 2

**Day Start Screen:**
> "Day 4"
> New Word card appears:
> "NEW IDEA: giving a reason — **parce que** (par-skuh)"
> "J'aime le café parce que c'est bon" — I like coffee because it's good
> Player taps "Got it!" → parce que is now Level 0.
> Player taps "Open Shop."

---

**Customer 1 — Friendly (1 turn)**

Customer walks to counter. Speech bubble:
> "Bonjour!"

Required ideas: [greeting]
Patience: 20s

Word bank: `bonjour | au revoir | oui | merci | bonsoir | café | deux | de rien`

Player taps: **bonjour**
Player taps: **SEND**

Evaluation: greeting ✓ → **GOOD**
Customer: 😊 smile. "+10 💰"
Word "bonjour" progress: 6/12 uses toward Level 3.

---

**Customer 2 — Friendly (2 turns)**

Speech bubble:
> "Deux cafés s'il vous plaît"

Required ideas: [confirmation, quantity, item]
Bonus ideas: [politeness]
Patience: 20s

Word bank: `oui | deux | café | trois | merci | bon | thé | s'il vous plaît | non | de rien`

Player taps: **oui** **deux** **café** **s'il vous plaît**
Player taps: **SEND**

Evaluation: confirmation ✓, quantity ✓, item ✓, politeness (bonus) → **PERFECT**
Customer: ❤️ happy. "+15 💰". Star burst.

**Turn 2** — Customer follows up:
> "Merci! C'est bon le café ici?"

Required ideas: [opinion]
Bonus ideas: [quality]
Patience: 20s
💡 Challenge banner: "Use 'parce que' in your response!"

Word bank: `oui | bon | parce que [NEW] | café | j'aime | non | merci | délicieux | beaucoup | c'est bien`

Player taps: **oui** **bon** **parce que** **j'aime** **café**
Player taps: **SEND**

Evaluation: opinion (j'aime) ✓ → **GOOD**
Challenge: "parce que" used and "reason" was not required → **Challenge Complete! +10 💰**
Combo: 4 distinct learned words → "Great combo! +10 💰"
Word "parce que" advances: Level 0 → Level 1.
Customer: 😊 "+10 💰" + "+10 challenge" + "+10 combo"

---

**Customer 3 — Tourist (1 turn)**

Speech bubble:
> "Un thé... s'il vous plaît?"

Required ideas: [confirmation]
Bonus ideas: [politeness]
Patience: 18s

Word bank: `oui | un | thé | café | merci | non | d'accord | bonsoir | de rien | trois`

Player taps: **oui** **un** **thé**
Player taps: **SEND**

Evaluation: confirmation ✓ → **GOOD**
Customer: 😊 "+12 💰"

---

**Customer 4 — Impatient (1 turn)**

Speech bubble:
> "Trois cappuccinos. Vite!"

Required ideas: [confirmation, quantity, item]
Patience: 10s ⚡ (bar is already yellow)

Word bank: `trois | cappuccino | oui | deux | café | d'accord | non | un | merci | exactement`

Player hesitates... 6 seconds pass. Bar turns red.
Player taps: **oui** **trois** **cappuccino**
Player taps: **SEND** (just in time — 2 seconds left)

Evaluation: confirmation ✓, quantity ✓, item ✓ → **GOOD**
Customer: 😊 (barely). "+15 💰"

---

**Customer 5 — Friendly (2 turns)**

Speech bubble:
> "Bonjour! Un café s'il vous plaît"

Required ideas: [greeting, confirmation]
Patience: 20s

Word bank: `bonjour | oui | un | café | merci | thé | au revoir | s'il vous plaît | non | bon`

Player taps: **bonjour** **oui** **un** **café**
Player taps: **SEND**

Evaluation: greeting ✓, confirmation ✓ → **PERFECT**
Customer: ❤️ "+15 💰"

**Turn 2:**
> "Pourquoi le café est populaire ici?"

Required ideas: [reason]
Bonus ideas: [quality]
Patience: 20s

Word bank: `parce que | bon | populaire | café | oui | j'aime | beaucoup | merci | délicieux | c'est bien`

Player taps: **parce que** **c'est bien**
Player taps: **SEND**

Evaluation: reason (parce que) ✓ → **GOOD**
"parce que" usage count: 2. Progress toward Level 2.
Customer: 😊 "+10 💰"

---

*[Customers 6-10 continue with similar variety, mixing review words and the newly introduced "parce que"]*

---

**Day End:**

> "Closing time!"
> Cafe empties. Transition to summary.

**Summary Screen:**
```
☀️ Day 4 Complete!

Customers served:    10 / 10
Perfect responses:   3
Coins earned:        142 💰
Reputation:          +3 ⭐ (total: 18)

── Words ──
Words practiced:     9
New words learned:   1 (parce que)
Words leveled up:    0

── Achievements ──
🏆 "Combo Builder" — Got your first 3+ word combo!

         [ Continue → ]
```

Player taps Continue → between-days menu.
Player checks "My Words" — sees parce que at Level 1 with 2/5 uses toward Level 2.
Player buys a small plant decoration (25 coins).
Player taps "Next Day."

---

## 17. What This GDD Does NOT Cover

### 17.1 Post-MVP Features (Out of Scope)

The following are intentionally excluded from the MVP and should not be built:

- **Multiple scenes/districts** — taxi, restaurant, hotel, office, etc. The cafe is the only scene.
- **Voice input/output** — player speaking aloud, speech recognition, text-to-speech for customer lines.
- **Passive language exposure** — overhearing NPC-to-NPC conversations.
- **Multiple target languages simultaneously** — the MVP supports one language pair (e.g. English → French).
- **Multiplayer or social features** — leaderboards, friend comparisons, shared cafes.
- **Monetization systems** — in-app purchases, ads, premium currency.
- **Onboarding/tutorial beyond Day 1** — Day 1 serves as the implicit tutorial (friendly customers only, small vocabulary, forgiving patience timers). A dedicated tutorial sequence is not designed here.
- **Accessibility features** — screen reader support, colorblind modes, font size options. Important but not MVP scope.
- **Localization of UI** — the game UI is in English for MVP.

### 17.2 Design Decisions to Revisit After MVP Testing

| Decision | Why revisit |
|---|---|
| Constructive word bank vs. free typing | If players find word bank too easy (recognition, not retrieval), consider adding a free-typing mode for advanced players. |
| Patience timer values | May be too generous or too tight — tune based on player data. |
| 10 active learning word limit | May feel restrictive or insufficient — observe player behavior. |
| Word mastery thresholds (5 uses, 12 uses) | May need adjustment based on actual retention data. |
| Stage advancement by day count | If players feel gated or overwhelmed, consider switching to mastery-based advancement. |
| Coin economy balance | Upgrade costs may need tuning based on average coins earned per session. |
| Hint penalty (tip reduction only) | If players over-rely on hints, consider adding a mastery penalty. |
| Number of customers per day | 8-15 may be too few or too many for the target 20-30 min session. |
| Word Challenge frequency (20%) | May feel too rare or too intrusive. |
| Regular customer visit frequency | Every 3 days may be too sparse for emotional attachment to form. |

# Coffee Lingo — Product Brief

## Vision

A language-learning game where players learn by *living* in the language, not studying it. The player works in a foreign city where the target language is spoken everywhere. Learning happens through repeated, meaningful interactions — not flashcards, not translation drills. The game should feel like running a cafe, with language acquisition as a natural side effect.

---

## Language Learning Philosophy

The game is built on four core principles. Critically, **these are not equal** — they have a priority relationship:

### 1. Context — Learn Through Real Scenarios
A word is easier to remember when it is used to express an idea in a specific situation. The game generates situations that *require* the player to express ideas using the target language.

### 2. Repetition — The Higher Priority
The same types of scenarios must occur many times so the brain retrieves the expression repeatedly. High-frequency encounters cement recall.

**The relationship between these two conditions matters for design:**
- Context + repetition = best learning (the target state)
- Repetition without context = harder but still works (e.g. drilling a word without a scenario)
- Context without repetition = *worse* — encountering a scenario only once won't make words stick

This means when in doubt, the system should **prioritize repetition frequency even over scenario variety**. It's better to repeat the same scenario type 20 times than to show 20 different scenarios once each.

**Risk: Repetition vs. Boredom.** Repetition is good for learning but dangerous for gameplay. The key distinction is: **the idea requirement repeats, but the surface-level presentation must vary.** The player should practice "giving a reason" dozens of times, but never hear the exact same question twice in a row. Variation should come from:
- Different customer personalities asking in different ways
- Different phrasings of the same underlying question
- Different emotional tones and contexts
- Different objectives surrounding the same idea

Example — idea required: *reason*
- "Why do you like coffee?"
- "Why do you recommend this drink?"
- "Why is this popular?"
- "Why do people order this?"

All four require the player to retrieve "because" — same learning repetition, different gameplay experience.

### 3. Idea-to-Expression Mapping
Learners should think: **IDEA → EXPRESSION**, not **WORD → TRANSLATION**. Words and phrases are treated as "idea expressors" — tools for communicating meaning.

| Instead of this | The game does this |
|---|---|
| "parce que" = "because" | Idea: *giving a reason* → Expression: "parce que" |
| Memorize vocabulary list | Create a situation where you *need* to give a reason |

### 4. Communication Before Grammar
Imperfect sentences are acceptable as long as the learner successfully expresses the intended idea. Grammar accuracy is not required at early stages.

**Example acceptable learner sentence:**
> "Je aimer nourriture parce que it makes moi heureux"

The grammar is wrong, but the learner used the expressions they know to communicate their idea. This mirrors how children and immigrants naturally acquire languages.

### The Core Problem This Solves
The biggest problem with language apps is that learners *recognize* words but cannot *retrieve* them when speaking. Recognition (seeing a word and knowing what it means) is easy. Retrieval (needing to express an idea and pulling the right word from memory) is hard. This game focuses entirely on **retrieval** — the player is always in a position of needing to produce language, not just consume it.

---

## Core Concept

The player controls a character working at a **coffee shop** in a foreign city. Customers arrive, speak in the target language, and the player must understand and respond. The coffee shop serves as a **context anchor** — a believable setting that naturally generates diverse conversational situations.

Comparable games in feel and structure: Diner Dash, Overcooked, Papers Please, Cook Serve Delicious.

---

## Core Gameplay Loop

Each interaction follows this loop and takes **10–20 seconds**:

```
Customer arrives
    ↓
Customer speaks (request, question, small talk)
    ↓
Player responds (using target language expressions)
    ↓
Customer reacts (happy, confused, impatient)
    ↓
Reward (tips, reputation, etc.)
    ↓
Next customer
```

The game accepts **idea-level correctness**, not grammar perfection. Multiple response forms are valid:
- "Two coffees?" ✓
- "Deux café?" ✓
- "Two café?" ✓
- "Yes two coffee" ✓

### The Central Mechanic: Idea Pressure

The driving force behind every interaction is **Idea Pressure** — the game creates a situation where:
1. An idea must be expressed
2. The player must retrieve the expression quickly

This mimics the pressure of real conversations and is what makes the game both effective for learning and addictive as gameplay. Customers waiting, lines forming, impatient faces — these aren't just engagement tricks, they are the *learning mechanism*. Timed retrieval under pressure is what trains the brain to actually recall words in real life, not just recognize them on a screen.

---

## Three Language Layers Per Scene

Every scene mixes three categories of language, preventing vocabulary from becoming too narrow:

### 1. Scene Language (Domain)
Words specific to the coffee shop setting: *order, coffee, milk, sugar, pay, receipt*

### 2. Universal Language
Common expressions used everywhere: *because, want, like, think, today, tomorrow, good, bad, very, maybe, sorry, thank you*

These are the most important words in the language and can be practiced across any scene. **Cross-scene reinforcement** is a key design principle: once a player learns "because" in the cafe, they should encounter situations requiring it again in every future scene (taxi, restaurant, etc.). Universal words are never "done" — they compound across the entire game world.

### 3. Social Conversation
Small talk and casual exchanges: *preferences, opinions, reasons, feelings*

Example: A customer asks "Why do you like working here?" — forcing the player to express an opinion using connector words, not just coffee vocabulary.

This means **one scene can generate hundreds of possible language combinations**, creating high repetition without feeling repetitive.

---

## Vocabulary System — Idea Cards

Instead of teaching vocabulary traditionally, the game uses **Idea Cards**:

```
┌─────────────────────────┐
│  IDEA: giving a reason  │
│                         │
│  EXPRESSIONS:           │
│  • because              │
│  • parce que            │
│  • porque               │
└─────────────────────────┘
```

The game then creates situations that require expressing that idea.

### Two Paths to Word Acquisition

The game supports two complementary approaches to vocabulary introduction:

1. **Game-recommended words:** The game proactively introduces common words/phrases that are high-value for general communication (e.g. "because", "want", "like", "thank you"). These are the words every learner needs.
2. **Player-selected words:** Players can also browse a list and choose words they personally want to acquire — likely ones relevant to their life or interests. The game then injects scenarios requiring those specific ideas.

Both paths feed into the same system: once a word is "active," the game creates situations that require it.

### Active Word Forcing

Beyond waiting for a natural scenario to arise, the game should sometimes challenge the player to *force* a target word into a conversation that doesn't obviously call for it — just like a real learner might deliberately slide "parce que" into a conversation about food. This mirrors a powerful real-world learning strategy: intentionally seeking opportunities to use a new word, even when the context doesn't demand it.

### Vocabulary Compounding

As the player learns more words, the real progress signal is **combining them**. Early on, a player might only say "hello." Later, they can string together: "Je aimer nourriture parce que it makes moi heureux" — five learned words in one sentence. The system should recognize and reward this compounding, as it represents the transition from isolated word knowledge to connected expression.

### Word Mastery Levels
Words strengthen with usage:
- **Level 1** — Newly learned
- **Level 2** — Familiar
- **Level 3** — Fluent

This gives players a visible sense of language growth.

### Vocabulary Progression Stages

The *type* of language introduced should follow a natural progression:
- **Stage 1** — Survival language (greetings, yes/no, numbers, basic needs)
- **Stage 2** — Daily interactions (ordering, paying, thanking, simple opinions)
- **Stage 3** — Workplace language (instructions, clarifications, schedules)
- **Stage 4** — Social conversations (preferences, reasons, feelings, storytelling)

---

## Progression & Engagement Systems

The game layers three loops to create addiction:

### 1. Skill Loop (Moment-to-Moment)
The player gets faster and more accurate at retrieving expressions. They *feel* themselves getting better at the language.

### 2. Reward Loop (Per Interaction)
After interactions, players earn rewards: tips, coins, reputation. Without this, the game feels like practice rather than a game.

### 3. Meta Progression Loop (Session-to-Session)
This is where long-term addiction lives:
- **Upgrade the cafe** — new coffee machines, more tables, nicer interior, decorations
- **Unlock new customer types** — each bringing different conversation styles
- **Unlock new conversation topics** — expanding language exposure
- **Unlock new districts** (post-MVP) — taxi, restaurant, hotel, office, etc.

Each cafe upgrade also unlocks new scenario types, conversations, and vocabulary — tying progression directly to learning.

---

## Customer System

### Customer Personalities
Different customer types create varied interactions:
- **Friendly** — patient, encouraging
- **Impatient** — demands fast responses, creates time pressure
- **Talkative** — initiates casual conversation, more language exposure
- **Tourist** — may speak a mix of languages
- **Regular** — returns often, relationship deepens over time

### Regular Customers
Certain customers return across sessions. As the player talks to them more:
- Relationship increases
- Conversations become deeper and more complex
- Emotional attachment develops

### Customer Satisfaction & Pressure
- If the player responds quickly and correctly → customer is happy, tips more
- If the player struggles or is slow → customer becomes impatient
- Customers waiting in line create natural time pressure

This pressure improves language retrieval speed — which is exactly the learning goal.

---

## Day System

Gameplay is structured into days rather than endless sessions:

```
Day begins
    ↓
Serve ~10 customers
    ↓
Day ends — Summary screen:
  • Money earned
  • New words learned/practiced
  • Reputation change
    ↓
Next day (new customers, continued progression)
```

This creates clear progression markers and natural session boundaries.

---

## Micro Achievements

Small achievement triggers for dopamine hits:
- "Used 'because' 10 times"
- "Served 20 customers perfectly"
- Other milestone-based rewards

---

## Design Philosophy

### The #1 Rule
**The game must never feel like language homework.**

Everything should feel like running a cafe. The language learning must feel incidental — a natural consequence of gameplay, not the visible purpose.

If framed as "learning a language" → players disengage.
If framed as "running a cafe" → players stay and learn without realizing it.

### Guiding Principles
- **Short interactions** — 10-20 seconds each, perfect for mobile
- **Natural repetition** — same idea types recur across many customer interactions
- **Visible skill improvement** — players feel progress
- **Player agency** — choose what words to learn, how to respond

---

## Visual Direction

- **Style:** Top-down pixel art, inspired by **Pixel Agents** (see `art-style-example.jpg`)
- **Aesthetic:** Cozy, warm, inviting — similar feel to Stardew Valley, Coffee Talk, Animal Crossing
- **Environment details:** Plants, shelves, decorations, lighting, furniture, steam from coffee
- **Camera:** Stable, centered on the cafe — no complicated movement
- **NPC animations:** Idle, talking, walking, reactions (happy/angry/confused/thinking)
- **Visual feedback:** Speech bubbles for dialogue, emoji-style reaction indicators, tip animations
- **Cafe upgrades:** Visually reflected in the environment (bigger interior, new equipment, decorations)

### MVP Cafe Layout (Conceptual)
```
Door → Customers enter
  ↓
Tables area → Customers sit and chat
  ↓
Counter → Player interacts with customers
  ↓
Coffee machine area → Visual decoration / upgrades
```

NPCs walk from door → table → counter → exit, making the cafe feel alive.

---

## Audio Direction

Sound design to increase immersion:
- Coffee machine sounds
- Door bell when customers enter
- Cafe ambient noise
- Light background music

---

## MVP Scope

The MVP validates one hypothesis: **Does the idea → expression → repetition loop work, and is it fun?**

### MVP Contains
| Element | Target |
|---|---|
| Scenes | 1 (coffee shop) |
| Customer types | ~5 |
| Vocabulary expressions | 30–50 words/phrases |
| Interaction variations | ~200 |
| Session length | 20–30 minutes of gameplay |

**Scalability constraint:** While the MVP starts with 30-50 words, the underlying system must be architected to support **thousands of vocabulary words** across many scenes. The content architecture (scene types + idea categories + dialogue templates) should make this expansion straightforward.

### MVP Does NOT Contain
- Multiple districts/locations
- Full city world
- Multiple jobs
- Voice interaction (future extension)

### What the MVP Tests
1. Do players enjoy the interaction loop?
2. Do they remember the expressions?
3. Do they feel progress?
4. Does repetition feel natural (not boring)?

### Platform
- Designed for **mobile-first**, but building as **web first**
- Top-down view, pixel art style, fast interactions

---

## Content Architecture & Scaling

The system is designed to scale to **thousands of vocabulary words** through a template-based content architecture:

- **Scene types** define context anchors (cafe, taxi, restaurant, hotel, store, park, office)
- **Idea categories** define what must be expressed (greeting, reason, opinion, preference, agreement, disagreement, asking questions, explaining)
- **Dialogue templates** combine scene + idea to generate variations. Example template: `Customer: "Why do you [action]?" → Player must use: because`

From a small number of scenes, idea categories, and templates, the system can generate thousands of interaction variations. This can be done through AI generation (Claude can produce massive amounts of dialogue variations from templates) — whether this happens at build time or runtime is an open question.

---

## Future Extensions (Post-MVP)

Ideas discussed but explicitly scoped out of MVP:
- **New districts/jobs:** Taxi driver, restaurant, hotel receptionist, office employee, hospital — each introducing new language domains. Each new scene introduces domain vocabulary but reinforces universal words learned in previous scenes.
- **Voice interaction:** Player actually speaks sentences aloud
- **Passive language exposure:** Overhear NPC-to-NPC conversations at tables

---

## Open Questions

1. **Input method:** How does the player "respond"? Free typing? Word selection from a bank? Drag-and-drop sentence building? Voice input? This fundamentally shapes the interaction design and is the single biggest open design question.
2. **Target languages:** Which language(s) will the MVP support? Does the system need to be language-agnostic from the start?
3. **Idea-level correctness evaluation:** How does the game judge whether a response is "correct enough"? Is this rule-based, AI-evaluated, or keyword-matching? This is tightly coupled to the input method question.
4. **Native language mixing:** The philosophy explicitly allows mixing native language for unknown words (e.g. "Je aimer nourriture parce que it makes moi heureux") — how is this handled in the UI and evaluation system?
5. **Art assets:** Will the MVP use placeholder assets or commissioned pixel art? The conversation flags that AI cannot generate production-quality pixel art.
6. **Tech stack:** No technology decisions have been made yet.
7. **Vocabulary source:** Where does the curated list of 30-50 MVP words/phrases come from? Who defines the "idea → expression" mappings?
8. **Difficulty scaling within the cafe:** How does complexity increase as the player progresses within the single MVP scene? More complex sentences? Faster customers? More words required per response? How does this map to the vocabulary progression stages (survival → daily → workplace → social)?
9. **Monetization:** Not discussed at all — is this relevant for MVP planning?
10. **Dialogue generation:** Will content be pre-generated at build time or dynamically generated at runtime using AI? Pre-generated is simpler and more predictable; dynamic is more varied but adds latency and cost.
11. **"Word forcing" mechanic specifics:** How does the game challenge the player to use a target word in an unrelated conversation? Is this a bonus objective? A mini-game? A prompt?
12. **Vocabulary compounding recognition:** How does the system detect and reward when a player combines multiple learned words in a single response?

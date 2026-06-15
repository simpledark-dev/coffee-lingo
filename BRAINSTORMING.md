# Brainstorm: Discoverable Content & Secrets

## Goal
Make the game addictive by adding elements of surprise — things the player doesn't know are coming, that feel different from each other (different triggers, flows, rewards). Each discovery unlocks new game states/mechanics over time.

## Key principle
Every new discoverable thing should feel **fundamentally different** from the others — different trigger (tap, friendship, time, pattern), different flow (dialogue, animation, puzzle, collection), different reward (items, coins, rooms, mechanics, story).

---

## Ideas

### Environment secrets (exploration-driven)
1. **Tap the bookshelf 3 times** → a book falls out → it's a mini German story you can read (unlocks a "Library" collection)
2. **Tap a specific tree outside** → a cat appears → you can adopt it → it now lives in your café and occasionally "helps" (bonus coins when it sits on counter)
3. **Tap the fountain at night** (after N customers) → find a coin → starts a treasure hunt chain across multiple locations
4. **A crack in the reading room wall** → tap it → discover a hidden room behind the bookshelf (new room unlock via story, not just buying it)

### Character-driven (relationship-driven)
5. **Max friendship with someone** → they confess a secret / ask you on a "date" (special dialogue scene) → unlocks their unique furnishing gift
6. **Two specific characters in the café at the same time** → they recognize each other → triggers a special event/dialogue you witness → reward
7. **Mystery stranger on the street** → gated by coins/rep → gives you a quest / tells a story / gives a rare item
8. **A character keeps ordering the same wrong thing** → notice the pattern → confront them → they reveal they're testing you → big rep boost

### Progression unlocks (achievement-driven)
9. **Serve 100 customers total** → a newspaper appears on the counter → "Local café rated #1!" → unlocks a trophy wall / new decoration
10. **Learn all words in a category** → a "mastery gem" appears on the shelf → tapping it plays a celebration + gives a permanent bonus
11. **Reach a certain rep** → the mayor visits → special cutscene → unlocks ability to rename the café

### Time/pattern-based (surprise-driven)
12. **Play 7 days in a row** → a mysterious package appears at the door → open it → random rare reward
13. **First customer of each day** leaves a tip note with a German proverb → collect them all
14. **Full moon event** (every X days) → outside map looks different → special NPC appears only then

### Mini-games / new mechanics
15. **Find a chess piece on the ground** → unlocks a word-based mini-game at the chess table
16. **A customer drops a letter** → it's a word puzzle → solve it → they come back grateful with reward
17. **Garden plot in patio** → plant a seed → grows over real days → harvesting gives coins + unlocks new plants

### Language-tied secrets
18. **German riddle** — a customer poses a riddle in German → solve it to unlock a reward
19. **Eavesdrop** — overhear two NPCs talking outside in German → quiz on what they said → secret tip/reward if correct
20. **Graffiti word** — a word you've mastered appears graffiti'd on the outside wall → tap it for a bonus
21. **Phrase of the day** — appears on the chalkboard menu → if a customer uses that phrase, you get bonus coins for recognizing it

### Collection / catalogue
22. **Latte art collection** — each perfect serve has a chance to create unique latte art → collect them all in an album
23. **Recipe book** — unlock new drink recipes as you learn food/drink vocabulary categories
24. **Postcard wall** — characters send postcards from trips, each with a German sentence to translate → collect on a wall
25. **Music box** — find vinyl records hidden around the map → unlock new background music tracks

### Seasonal / world events
26. **Weather system** — rainy days bring more indoor customers, sunny days more patio traffic. Special umbrella item during rain
27. **Holiday events** — Oktoberfest (beer vocabulary), Weihnachten (Christmas market outside), Karneval (costumes on characters)
28. **Traveling merchant** — appears every ~5 days with rare furnishings you can't buy in the regular shop

### Cafe reputation / endgame
29. **German food critic** — as rep grows, a critic visits and writes a review (German paragraph you can read). Reaching 3 stars unlocks a neon sign outside
30. **Second cafe** — at max rep, you get invited to open a second café in a new city (whole new tilemap/theme)

### Language mastery rewards
31. **Themed decorations** — complete a vocabulary category → unlock a matching decoration (all food words → fancy menu board, all greetings → welcome mat)
32. **Fluency moments** — occasionally a customer speaks a full German sentence with no multiple choice — you select/type the meaning. Big rewards for nailing it

### Living world
33. **Character routines** — Hans comes mornings, Lena comes evenings. If you remember their usual order, they tip extra
34. **Seasons** — outside tilemap changes with seasons (snow in winter, flowers in spring). Seasonal vocabulary unlocks
35. **Cat gifts** — the stray cat (from #2) brings you random gifts from a loot table each day

### Story arcs
36. **Character storylines** — each character has a multi-week arc (e.g. Lena is studying for an exam — help her over 7 visits, each with harder vocab)
37. **Mystery letter** — arrives in pieces, one fragment per day, in German — assemble the full letter to discover a treasure location
38. **Rival cafe** — a competitor opens across the street — compete for customers by having better vocab/service

### Customization
39. **Name your cafe** — it appears on a sign outside
40. **Signature drink** — pick a German name + ingredients, customers order it
41. **Custom chalkboard** — write a German phrase that displays on your cafe wall
42. **Cafe theme colors** — unlock color palettes by completing collections

### Main storyline (combines multiple threads)
- **Act 1: Newcomer** — you're a foreigner who inherited a run-down café. Find letter fragments as you renovate. Neighborhood is quiet, some shops closed.
- **Act 2: Belonging** — characters open up with personal storylines. Piece together your relative's letter. A rival developer threatens the street. Outside map improves as you help people.
- **Act 3: Fluency** — understand complex German, community rallies against developer, discover relative's hidden room/treasure, give speech at town festival.

---

## Implementation notes
- Each discovery will likely need its own implementation (special flow/animation/gameplay)
- That's a worthy trade-off for making the game truly addictive
- We're unlocking new game state/mechanisms over time
- **Status: brainstorming phase — more discussion needed before implementation**
- Need to pick which ones to build first and flesh out the details

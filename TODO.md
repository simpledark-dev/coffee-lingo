
[] upgrade shop
    - use coins
    - buy/upgrade C,T,F,P,S
    - can have multiple options -> every user can choose how to upgrade (e.g floor X to floor Y instead of floor Z)


[] explore speech
[] deep dive assessment of learning mechanism
    - how to actually make people learn words, phrases -> can my wife learn to use french right away
    - how to talk about various topics that use various common words
[] stats
[] dictionary
[] have setting button to reset full game
[] sound effects when tapping on characters, items, etc.
[] analyze addictiveness factors
[] personality for customers
[] how should cycle works -> is Day thing is okay? why not always open
[] add music track during gameplay
[] coin earned visual & sound effect
[] better tts voice
[] draw outside street with a bunch of locked location and our coffee shop 
[] display effects and requirements for upgrade even after bought
[] characters idle at door (bug)
[] click navigate icon sometimes also clicks on character
[] upgrade successful yellow toast -> but dont want to click install there
[] bug: when buy patio, i already see a bunch of npcs there
[x] swipe up/down can be smoother
[] different convos on pois -> at each poi (e.g near shelves), the convo can be topic related to books
[x] upgardes: default items go to top

----
DONE
[x] what's rep used for?
[x] push content below notch (safe area insets)
[x] expand map
    - it can also be a place to read books, study,...-> so a 
    co-working space?
    - exterior
[x] better art
    - 16x16 -> can it be better?
[x] more characters


---
addictiveness


- the upgrades actually impact something in the game, e.g helps earn more coins/more reps per correct answer, more customers coming in (more opportunities to make money), customer's request for dialogue

- the ability to buy and not just upgrade. For example initially player only has one plant, later they can buy more plants. Same with tables/chair. Or they can buy a pet

- ability to place the bought items on any placable slots on the map. E.g they can place a table with a chair here, or a plant here, etc. -> give a sense of identity this is their cafe

- ability to unlock extra room/area in the same shop (extending the map) which requires coins/reps. This will give something new to users 

- ability to upgrade individual items of same category and not all at once. For example, say we have 3 plants, we can click on each one and upgrade individually, same with tables, chairs,.. so every upgrade action will be performed on the map (though maybe not during the learning phase? maybe have a separate mode for upgrade? idk, that's debatable. and if an item is being upgraded there should be an icon or signal next to it, and when clicked on it you see the level and progress bar)

- quests: "use X words 5 times", "serve N customers", etc. -> mini achievements

- then with the earned coins. reps, player can buy/unlock a completely 
different location (e.g clothing store, restaurant,..) -> something new and also give impression of a big world. So here we'd likely need to draw an outside scene where user can see multiple locations (including the current shop) and they can enter

- and related to the buy items, once unlocked a new location or even a new room (e.g reading room has chess board you can buy), there are NEW items to buy and these items-> makes user want to explore and get new items

- you can even have characters/customers that you're not allowed to talk to until reached a certain level. So you're unlocking various things and not just items or locations

- maybe make Reps a level and a progress bar, e.g Rep level 1 = (some title), Rep level 2 = (some title),... and yes you're gathering rep points and that will fill up the progress bar -> another thing that makes user want to fill up

-  another progression is the relationships acquired with the characters in the game. Imagine you try to make friends with certain customers (so there's also another "progress bar" which is the "friendlyness" until you reach some threshold and now you're friend with that person. So maybe you have a list of contacts  of people you've acquired. And even sometimes to unlock a location or to do some quest, you need to be acquainted with this user. So each customer/character in the game are persistent unique characters, not randomly generated per each session

- random gifts offered by each customer, or maybe they randomly appear on street. could be money, reps, or some items like pet (so you don't have to buy them) -> another factor they want to keep trying

- could have a major story line like there's an ultimate goal to achieve, idk, some story like, i want to buy island X, or i want to become president, or i want to cure my dad, etc. (so many possible stories here) -> another factor they want to keep trying, this is like a layer beyond unlocking locations


what about the slightly challenging aspect (another addictiveness factor)

nhan vat co nhieu personality -> kho tinh -+ nhieu coins/rep, de tinh -+ it coins/rep

Varied gameplay
    - assign ticket
    - texting to character mode


Story-quests nhu GTA

upgrade time -> want to speed up? train more (it could be a different gameplay)

cho nhan vat chay?

upgrade nhan vat cua minh -> quan ao, toc tai,... (chi cho dep? hoac la vi du can vao location thi can mac do lich su)

upgrade nha rieng -> de cho dep + vi du nhan vat (ba me) vao trong nha se happy hon, tang rep hon


game mode before play: ielts, toeic, normal


game show list of words
    word nao master roi -> thi cho luyen nhung dc it coins vs rep
                        -> nhu vay se force user hoc tu moi cho toi khi master
    co the cho phep chon tu de apply HOAC la co co che de tu phat hien ra nhung tu can hoc


relationship de lam gi? -> various rewards: 
    - unlock loc moi
    - tang gifts (do noi that trong nha, thu cung)
    - de lam quest moi
    - de quen thang moi' (CEO)
    - ...
    (mien la du khac nhau de user thay hung thu va unexpected, co cam giac discover)

Word Collection Book — Visual dictionary that fills up as you learn

Customer Personality System — Different customers behave differently

Sound Design & Music
    Audio is 50% of the cozy vibe. Lo-fi cafe music, door bell chime, coffee machine sounds, coin clink, success jingle, level-up fanfare. Creates a sensory experience people want to return to.

Visual

Varied gameplay (currently too repetitive) -> find ways to make it different

Relationship can vary too: friends, parents, wife, etc.

PC -> bigger map at once

some customers can tip more/less?

---
Tier 1 — High impact, builds on what you have:

- Upgrades impact gameplay (more coins/rep per answer, more customers) — This is the #1 missing piece right now. Without it, upgrades feel hollow. Easy to implement too — just check upgrade tiers when calculating rewards.
- Rep as a leveled progress bar — Super cheap to build, huge psychological pull. "Rep Level 3: Barista" feels way better than "30 reputation". Progress bars are dopamine machines.
- Quests/achievements — "Use 5 food words today" gives micro-goals within each session. Prevents the "what am I even doing" feeling.
Tier 2 — Medium effort, strong retention:

- Persistent named characters with relationships — This is a game-changer for a language learning game specifically. "Oh it's Marie again, she always orders complicated things" creates emotional stakes. The friendship progress bar is another progression axis.
- Buy/place items freely — This is where "my cafe" really kicks in. But it's architecturally significant — you'd need a placement editor, per-tile item storage, collision logic. Worth it, but big.
- Unlock new rooms/areas — You already have the reading room. Adding a kitchen, patio, etc. is a natural extension. Each room = new items + new dialogue contexts.
Tier 3 — Big vision, build later:

- Multiple locations (clothing store, restaurant) — This is essentially building multiple games. Amazing for long-term retention but massive scope. Save for v2.
- Overworld/street scene — Same. Incredible vision but needs the core loop to be solid first.
- Main storyline — Great for pulling players forward, but requires writing/narrative design. Can be layered on top later without changing mechanics.


- Gameplay Pacing: Make Failure Hurt
    Right now, the game is a bit too "cozy" for its own good. If you want the pressure to force learning, the stakes need to be real:

    Dynamic Timers: The patience bar should start at 15 seconds for new players, but drop to 5-8 seconds as your reputation grows or as "Impatient" customer types spawn.
    Real Consequences: If a customer's patience runs out, they shouldn't just politely move to the next dialogue line. They should storm out, subtract money from your register, drop your cafe rating, and eventually cause you to lose your upgrades or "fail the day." The threat of bankruptcy makes the learning mandatory.

----
learning

[] listening mode -> npc speaks, user recognizes VS speaking mode

- should have a test at the end (other than in game) -> to make people feel that oh shit they actually learned these 

- should show clear defnition, fun examples, pronunciation explanation/demo for each word

- colors, numbers, days of the week, etc. -> more fun game play

- quality of audios

- an idea: why not make all the words in the shop composable into various sentences -> however, there will be some grammar stuff
-> actually, we can purposely choose a few sentence types that are not too grammar dependent like "I (verb) (something)" or if it's grammar dependent then give them a fixed template that they can follow (e.g a question " Can (someone) (do) (something)" or "Because ...."



---
Intro
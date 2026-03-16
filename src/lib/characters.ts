export interface Character {
  id: string
  name: string
  bio: string
  gender: 'male' | 'female'
  spriteVariant: number   // 0-12 index into CUSTOMER_SPRITES
  unlockRep: number       // minimum reputation to encounter
}

// Friendship level thresholds
export const FRIENDSHIP_LEVELS = [
  { level: 1, title: 'Stranger', minFriendship: 0 },
  { level: 2, title: 'Acquaintance', minFriendship: 10 },
  { level: 3, title: 'Regular', minFriendship: 25 },
  { level: 4, title: 'Friend', minFriendship: 50 },
  { level: 5, title: 'Close Friend', minFriendship: 80 },
]

export function getFriendshipLevel(friendship: number) {
  let current = FRIENDSHIP_LEVELS[0]
  for (const lvl of FRIENDSHIP_LEVELS) {
    if (friendship >= lvl.minFriendship) current = lvl
    else break
  }
  const idx = FRIENDSHIP_LEVELS.indexOf(current)
  const next = idx < FRIENDSHIP_LEVELS.length - 1 ? FRIENDSHIP_LEVELS[idx + 1] : null
  const progress = next
    ? (friendship - current.minFriendship) / (next.minFriendship - current.minFriendship)
    : 1
  return { current, next, progress }
}

// Friendship gain per score
export const FRIENDSHIP_GAIN: Record<string, number> = {
  PERFECT: 5,
  GOOD: 3,
  UNDERSTOOD: 1,
  MISSED: 0,
}

export const CHARACTER_ROSTER: Character[] = [
  // Always available (unlockRep: 0)
  { id: 'marie',    name: 'Marie',    bio: 'A cheerful regular who loves croissants', gender: 'female', spriteVariant: 0,  unlockRep: 0 },
  { id: 'jean',     name: 'Jean',     bio: 'Retired teacher, always reads the paper', gender: 'male',   spriteVariant: 1,  unlockRep: 0 },
  { id: 'camille',  name: 'Camille',  bio: 'Art student sketching in the corner',     gender: 'female', spriteVariant: 2,  unlockRep: 0 },
  { id: 'lucas',    name: 'Lucas',    bio: 'Tech worker, needs his espresso fix',     gender: 'male',   spriteVariant: 3,  unlockRep: 0 },
  { id: 'sophie',   name: 'Sophie',   bio: 'Florist from next door',                  gender: 'female', spriteVariant: 4,  unlockRep: 0 },
  { id: 'pierre',   name: 'Pierre',   bio: 'Local chef, very picky about coffee',     gender: 'male',   spriteVariant: 5,  unlockRep: 0 },
  // Unlock at rep 10
  { id: 'amelie',   name: 'Amélie',   bio: 'Bookworm with a sweet tooth',             gender: 'female', spriteVariant: 6,  unlockRep: 10 },
  { id: 'hugo',     name: 'Hugo',     bio: 'Musician, always humming a tune',          gender: 'male',   spriteVariant: 7,  unlockRep: 10 },
  { id: 'claire',   name: 'Claire',   bio: 'Journalist chasing her next story',        gender: 'female', spriteVariant: 8,  unlockRep: 15 },
  // Unlock at rep 25+
  { id: 'nicolas',  name: 'Nicolas',  bio: 'Wine merchant with refined taste',         gender: 'male',   spriteVariant: 9,  unlockRep: 25 },
  { id: 'isabelle', name: 'Isabelle', bio: 'Fashion designer, always stylish',         gender: 'female', spriteVariant: 10, unlockRep: 30 },
  { id: 'remi',     name: 'Rémi',     bio: 'Pastry chef, your friendly rival',         gender: 'male',   spriteVariant: 11, unlockRep: 40 },
  // Unlock at rep 60+
  { id: 'colette',  name: 'Colette',  bio: 'Mystery novelist, observes everything',    gender: 'female', spriteVariant: 12, unlockRep: 60 },
  { id: 'antoine',  name: 'Antoine',  bio: 'Professor of philosophy at the Sorbonne',  gender: 'male',   spriteVariant: 0,  unlockRep: 80 },
  { id: 'juliette', name: 'Juliette', bio: 'Opera singer, dramatic flair',             gender: 'female', spriteVariant: 4,  unlockRep: 100 },
  { id: 'marcel',   name: 'Marcel',   bio: 'Retired diplomat, speaks many languages',  gender: 'male',   spriteVariant: 9,  unlockRep: 140 },
  { id: 'eloise',   name: 'Éloïse',   bio: 'Famous food critic — impress her!',        gender: 'female', spriteVariant: 10, unlockRep: 200 },
]

/**
 * Select today's roster: a mix of familiar faces and available characters.
 * Returns characterIds for each customer slot.
 */
export function selectDayRoster(
  customerCount: number,
  reputation: number,
  relationships: Record<string, { friendship: number; timesServed: number; lastSeenDay: number }>,
  currentDay: number,
): string[] {
  const unlocked = CHARACTER_ROSTER.filter(c => reputation >= c.unlockRep)
  if (unlocked.length === 0) return []

  // Prioritize: characters not seen recently + higher friendship (regulars come back)
  const scored = unlocked.map(c => {
    const rel = relationships[c.id]
    const daysSinceSeen = rel ? currentDay - rel.lastSeenDay : 999
    const friendshipBonus = rel ? rel.friendship * 0.3 : 0
    // New unlocks get a boost to ensure they appear
    const newBonus = !rel ? 50 : 0
    return { char: c, score: daysSinceSeen + friendshipBonus + newBonus + Math.random() * 20 }
  })

  scored.sort((a, b) => b.score - a.score)

  // Pick unique characters only — cap customer count to unlocked pool size
  const limit = Math.min(customerCount, scored.length)
  const selected: string[] = []
  for (let i = 0; i < limit; i++) {
    selected.push(scored[i].char.id)
  }

  // Shuffle
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]]
  }

  return selected
}

export function getCharacter(id: string): Character | undefined {
  return CHARACTER_ROSTER.find(c => c.id === id)
}

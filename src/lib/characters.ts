export interface VoiceProfile {
  pitch: number   // 0.5–2.0 (default 1.0)
  rate: number    // 0.7–1.1
  volume: number  // 0.8–1.0
}

export interface Character {
  id: string
  name: string
  bio: string
  gender: 'male' | 'female'
  spriteVariant: number   // 0-12 index into CUSTOMER_SPRITES
  unlockRep: number       // minimum reputation to encounter
  voice: VoiceProfile
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
  { id: 'marie',    name: 'Marie',    bio: 'A cheerful regular who loves croissants',  gender: 'female', spriteVariant: 0,  unlockRep: 0,   voice: { pitch: 1.15, rate: 0.95, volume: 1.0 } },
  { id: 'jean',     name: 'Jean',     bio: 'Retired teacher, always reads the paper',  gender: 'male',   spriteVariant: 1,  unlockRep: 0,   voice: { pitch: 0.85, rate: 0.80, volume: 0.9 } },
  { id: 'camille',  name: 'Camille',  bio: 'Art student sketching in the corner',      gender: 'female', spriteVariant: 2,  unlockRep: 0,   voice: { pitch: 1.20, rate: 0.90, volume: 0.85 } },
  { id: 'lucas',    name: 'Lucas',    bio: 'Tech worker, needs his espresso fix',      gender: 'male',   spriteVariant: 3,  unlockRep: 0,   voice: { pitch: 0.95, rate: 1.00, volume: 1.0 } },
  { id: 'sophie',   name: 'Sophie',   bio: 'Florist from next door',                   gender: 'female', spriteVariant: 4,  unlockRep: 0,   voice: { pitch: 1.10, rate: 0.90, volume: 0.95 } },
  { id: 'pierre',   name: 'Pierre',   bio: 'Local chef, very picky about coffee',      gender: 'male',   spriteVariant: 5,  unlockRep: 0,   voice: { pitch: 0.80, rate: 0.85, volume: 1.0 } },
  { id: 'manon',    name: 'Manon',    bio: 'Yoga instructor, orders herbal tea',        gender: 'female', spriteVariant: 13, unlockRep: 0,   voice: { pitch: 1.18, rate: 0.88, volume: 0.9 } },
  { id: 'theo',     name: 'Théo',     bio: 'Bike courier, always in a hurry',           gender: 'male',   spriteVariant: 14, unlockRep: 0,   voice: { pitch: 1.05, rate: 1.05, volume: 1.0 } },
  // Unlock at rep 10–20
  { id: 'amelie',   name: 'Amélie',   bio: 'Bookworm with a sweet tooth',              gender: 'female', spriteVariant: 6,  unlockRep: 10,  voice: { pitch: 1.25, rate: 0.85, volume: 0.85 } },
  { id: 'hugo',     name: 'Hugo',     bio: 'Musician, always humming a tune',           gender: 'male',   spriteVariant: 7,  unlockRep: 10,  voice: { pitch: 1.00, rate: 0.95, volume: 1.0 } },
  { id: 'claire',   name: 'Claire',   bio: 'Journalist chasing her next story',         gender: 'female', spriteVariant: 8,  unlockRep: 15,  voice: { pitch: 1.05, rate: 1.00, volume: 1.0 } },
  { id: 'adrien',   name: 'Adrien',   bio: 'Law student cramming for exams',            gender: 'male',   spriteVariant: 15, unlockRep: 15,  voice: { pitch: 0.90, rate: 0.95, volume: 0.95 } },
  { id: 'lea',      name: 'Léa',      bio: 'Kindergarten teacher, endlessly patient',   gender: 'female', spriteVariant: 16, unlockRep: 20,  voice: { pitch: 1.22, rate: 0.85, volume: 0.9 } },
  { id: 'louis',    name: 'Louis',    bio: 'Antique dealer, tells long stories',        gender: 'male',   spriteVariant: 17, unlockRep: 20,  voice: { pitch: 0.78, rate: 0.78, volume: 0.95 } },
  // Unlock at rep 25–45
  { id: 'nicolas',  name: 'Nicolas',  bio: 'Wine merchant with refined taste',          gender: 'male',   spriteVariant: 9,  unlockRep: 25,  voice: { pitch: 0.75, rate: 0.80, volume: 0.95 } },
  { id: 'isabelle', name: 'Isabelle', bio: 'Fashion designer, always stylish',          gender: 'female', spriteVariant: 10, unlockRep: 30,  voice: { pitch: 1.15, rate: 0.95, volume: 1.0 } },
  { id: 'remi',     name: 'Rémi',     bio: 'Pastry chef, your friendly rival',          gender: 'male',   spriteVariant: 11, unlockRep: 35,  voice: { pitch: 0.90, rate: 0.90, volume: 0.95 } },
  { id: 'nadia',    name: 'Nadia',    bio: 'Photographer, captures café moments',       gender: 'female', spriteVariant: 18, unlockRep: 35,  voice: { pitch: 1.12, rate: 0.92, volume: 0.95 } },
  { id: 'vincent',  name: 'Vincent',  bio: 'Architect, admires the café decor',         gender: 'male',   spriteVariant: 19, unlockRep: 40,  voice: { pitch: 0.88, rate: 0.88, volume: 1.0 } },
  { id: 'chloe',    name: 'Chloé',    bio: 'Dancer at the opera, graceful even seated', gender: 'female', spriteVariant: 20, unlockRep: 45,  voice: { pitch: 1.28, rate: 0.90, volume: 0.9 } },
  // Unlock at rep 50–80
  { id: 'colette',  name: 'Colette',  bio: 'Mystery novelist, observes everything',     gender: 'female', spriteVariant: 12, unlockRep: 50,  voice: { pitch: 0.85, rate: 0.75, volume: 0.9 } },
  { id: 'gabriel',  name: 'Gabriel',  bio: 'Sommelier, pairs coffee like wine',         gender: 'male',   spriteVariant: 21, unlockRep: 55,  voice: { pitch: 0.82, rate: 0.82, volume: 1.0 } },
  { id: 'margot',   name: 'Margot',   bio: 'Vintage shop owner, loves nostalgia',       gender: 'female', spriteVariant: 22, unlockRep: 60,  voice: { pitch: 1.08, rate: 0.88, volume: 0.95 } },
  { id: 'antoine',  name: 'Antoine',  bio: 'Professor of philosophy at the Sorbonne',   gender: 'male',   spriteVariant: 23, unlockRep: 70,  voice: { pitch: 0.70, rate: 0.75, volume: 0.95 } },
  { id: 'valerie',  name: 'Valérie',  bio: 'Retired ballerina, elegant and poised',     gender: 'female', spriteVariant: 24, unlockRep: 80,  voice: { pitch: 1.05, rate: 0.78, volume: 0.9 } },
  // Unlock at rep 100+
  { id: 'juliette', name: 'Juliette', bio: 'Opera singer, dramatic flair',              gender: 'female', spriteVariant: 25, unlockRep: 100, voice: { pitch: 1.30, rate: 0.85, volume: 1.0 } },
  { id: 'marcel',   name: 'Marcel',   bio: 'Retired diplomat, speaks many languages',   gender: 'male',   spriteVariant: 26, unlockRep: 120, voice: { pitch: 0.75, rate: 0.80, volume: 0.9 } },
  { id: 'fleur',    name: 'Fleur',    bio: 'Perfumer, can describe any aroma',          gender: 'female', spriteVariant: 27, unlockRep: 140, voice: { pitch: 1.20, rate: 0.82, volume: 0.85 } },
  { id: 'olivier',  name: 'Olivier',  bio: 'Film director, always scouting locations',  gender: 'male',   spriteVariant: 28, unlockRep: 160, voice: { pitch: 0.85, rate: 0.90, volume: 1.0 } },
  { id: 'eloise',   name: 'Éloïse',   bio: 'Famous food critic — impress her!',         gender: 'female', spriteVariant: 29, unlockRep: 200, voice: { pitch: 1.10, rate: 0.90, volume: 1.0 } },
  { id: 'raphael',  name: 'Raphaël',  bio: 'Michelin-star chef, the ultimate regular',  gender: 'male',   spriteVariant: 30, unlockRep: 250, voice: { pitch: 0.72, rate: 0.78, volume: 1.0 } },
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

/**
 * Pick a single character for the next customer (continuous mode).
 * Avoids characters in recentCharacterIds to prevent back-to-back repeats.
 */
export function pickNextCharacter(
  reputation: number,
  relationships: Record<string, { friendship: number; timesServed: number; lastSeenAt: number }>,
  totalCustomersServed: number,
  recentCharacterIds: string[],
  presentCharacterIds: string[] = [],
): string {
  const unlocked = CHARACTER_ROSTER.filter(c => reputation >= c.unlockRep)
  if (unlocked.length === 0) return CHARACTER_ROSTER[0].id

  // Hard exclude characters currently in the world
  const presentSet = new Set(presentCharacterIds)
  const available = unlocked.filter(c => !presentSet.has(c.id))
  // If everyone is already present, return empty to signal "don't spawn"
  if (available.length === 0) return ''
  const pool = available

  const recentSet = new Set(recentCharacterIds)

  const scored = pool.map(c => {
    const rel = relationships[c.id]
    const sinceSeen = rel ? totalCustomersServed - rel.lastSeenAt : 999
    const friendshipBonus = rel ? rel.friendship * 0.3 : 0
    const newBonus = !rel ? 50 : 0
    // Penalize recently-seen characters heavily
    const recentPenalty = recentSet.has(c.id) ? -200 : 0
    return { char: c, score: sinceSeen + friendshipBonus + newBonus + recentPenalty + Math.random() * 20 }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0].char.id
}

export function getCharacter(id: string): Character | undefined {
  return CHARACTER_ROSTER.find(c => c.id === id)
}

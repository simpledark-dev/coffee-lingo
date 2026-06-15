import type { LevelProgress } from './types'

export interface LevelActor {
  characterId: string   // fixed NPC for this slot in the sequence
  // Each entry is a request stop (a POI where the NPC shows a persistent
  // request); the value is how many questions are asked at that stop.
  // e.g. [2] = one stop, 2 questions; [1,1] = two stops, 1 question each.
  requests: number[]
}

export interface Level {
  id: number
  name: string
  starThresholds: [number, number, number]   // net coins needed for 1 / 2 / 3 stars
  actors: LevelActor[]                        // fixed sequence of NPCs (exactly N customers)
}

// POC: 3 scripted levels. Same sequence of NPCs every run; only the conversation
// content varies. Star thresholds are sized to each level's total question count
// (base earning is ~1 coin per perfect answer before upgrades).
export const LEVELS: Level[] = [
  {
    id: 1,
    name: 'Morning Rush',
    starThresholds: [2, 4, 6], // 6 questions total
    actors: [
      { characterId: 'marie', requests: [2] },     // 1 stop, 2 questions
      { characterId: 'jean', requests: [1] },      // 1 stop, 1 question
      { characterId: 'lucas', requests: [1, 1] },  // 2 stops, 1 each
      { characterId: 'sophie', requests: [1] },
    ],
  },
  {
    id: 2,
    name: 'Lunch Crowd',
    starThresholds: [4, 7, 10], // 10 questions total
    actors: [
      { characterId: 'marie', requests: [2] },
      { characterId: 'jean', requests: [1, 1] },
      { characterId: 'camille', requests: [1] },
      { characterId: 'lucas', requests: [2] },
      { characterId: 'pierre', requests: [1] },
      { characterId: 'manon', requests: [1, 1] },
    ],
  },
  {
    id: 3,
    name: 'Happy Hour',
    starThresholds: [7, 12, 16], // 16 questions total
    actors: [
      { characterId: 'marie', requests: [2] },
      { characterId: 'jean', requests: [1, 1] },
      { characterId: 'camille', requests: [3] },
      { characterId: 'lucas', requests: [1, 1] },
      { characterId: 'sophie', requests: [2] },
      { characterId: 'pierre', requests: [1] },
      { characterId: 'manon', requests: [1, 1] },
      { characterId: 'theo', requests: [2] },
    ],
  },
]

export function getLevel(id: number): Level | undefined {
  return LEVELS.find(l => l.id === id)
}

/** Number of customers (NPCs) in a level's session. */
export function customerCount(level: Level): number {
  return level.actors.length
}

/** Number of request stops across all NPCs (how many exclamations appear). */
export function requestCount(level: Level): number {
  return level.actors.reduce((sum, a) => sum + a.requests.length, 0)
}

/** Total questions the player must answer to fully clear a level. */
export function questionCount(level: Level): number {
  return level.actors.reduce((sum, a) => sum + a.requests.reduce((s, q) => s + q, 0), 0)
}

/**
 * Star rating (0-3) for net coins earned in a session.
 * 0 = below the 1-star threshold (level not accomplished).
 */
export function starsForCoins(level: Level, netCoins: number): 0 | 1 | 2 | 3 {
  const [s1, s2, s3] = level.starThresholds
  if (netCoins >= s3) return 3
  if (netCoins >= s2) return 2
  if (netCoins >= s1) return 1
  return 0
}

/**
 * A level is unlocked if it's the first level, or the previous level has
 * been accomplished (at least 1 star).
 */
export function isLevelUnlocked(
  id: number,
  progress: Record<number, LevelProgress> = {},
): boolean {
  if (id <= LEVELS[0].id) return true
  const prev = progress[id - 1]
  return !!prev && prev.stars >= 1
}

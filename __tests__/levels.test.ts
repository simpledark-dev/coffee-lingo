import { describe, it, expect } from 'vitest'
import { getLevel, starsForCoins, isLevelUnlocked, customerCount, requestCount, questionCount, type Level } from '../src/lib/levels'
import type { LevelProgress } from '../src/lib/types'

// Synthetic level with known thresholds, independent of the authored LEVELS.
const lvl1: Level = {
  id: 1,
  name: 'Test',
  starThresholds: [10, 20, 30],
  actors: [
    { characterId: 'marie', requests: [2] },     // 1 stop, 2 questions
    { characterId: 'jean', requests: [1, 1] },    // 2 stops, 1 question each
  ],
}

describe('starsForCoins', () => {
  it('gives 0 stars below the 1-star threshold', () => {
    expect(starsForCoins(lvl1, 0)).toBe(0)
    expect(starsForCoins(lvl1, 9)).toBe(0)
    expect(starsForCoins(lvl1, -5)).toBe(0)
  })

  it('awards stars exactly at each threshold boundary', () => {
    expect(starsForCoins(lvl1, 10)).toBe(1)
    expect(starsForCoins(lvl1, 20)).toBe(2)
    expect(starsForCoins(lvl1, 30)).toBe(3)
  })

  it('awards the correct tier between thresholds', () => {
    expect(starsForCoins(lvl1, 15)).toBe(1)
    expect(starsForCoins(lvl1, 25)).toBe(2)
    expect(starsForCoins(lvl1, 100)).toBe(3)
  })
})

describe('isLevelUnlocked', () => {
  it('always unlocks the first level', () => {
    expect(isLevelUnlocked(1, {})).toBe(true)
  })

  it('keeps later levels locked with no progress', () => {
    expect(isLevelUnlocked(2, {})).toBe(false)
    expect(isLevelUnlocked(3, {})).toBe(false)
  })

  it('unlocks the next level once the previous earns at least 1 star', () => {
    const progress: Record<number, LevelProgress> = { 1: { stars: 1, bestCoins: 12 } }
    expect(isLevelUnlocked(2, progress)).toBe(true)
    expect(isLevelUnlocked(3, progress)).toBe(false)
  })

  it('does not unlock the next level if the previous scored 0 stars', () => {
    const progress: Record<number, LevelProgress> = { 1: { stars: 0, bestCoins: 5 } }
    expect(isLevelUnlocked(2, progress)).toBe(false)
  })
})

describe('getLevel', () => {
  it('returns the level by id', () => {
    expect(getLevel(1)?.id).toBe(1)
  })
  it('returns undefined past the last level', () => {
    expect(getLevel(99)).toBeUndefined()
  })
})

describe('customerCount / requestCount / questionCount', () => {
  it('counts actors as customers', () => {
    expect(customerCount(lvl1)).toBe(2)
  })
  it('counts request stops (POIs with an exclamation)', () => {
    // marie: 1 stop, jean: 2 stops
    expect(requestCount(lvl1)).toBe(3)
  })
  it('counts total questions across all stops', () => {
    // marie: 2 questions, jean: 1 + 1
    expect(questionCount(lvl1)).toBe(4)
  })
  it('authored levels have at least one question each', () => {
    for (const id of [1, 2, 3]) {
      expect(questionCount(getLevel(id)!)).toBeGreaterThan(0)
    }
  })
})

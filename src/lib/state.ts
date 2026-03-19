import { Expression, PlayerState, VocabularyEntry } from './types'
import { getReadyToInstallIds, TILE_TO_UPGRADE_ID, INFRASTRUCTURE_IDS } from './upgrades'
import { getDefaultPlacements, READING_ROOM_FURNISHINGS, CAFE_ROOM_FURNISHINGS, PATIO_FURNISHINGS, ALL_FURNISHINGS } from './furnishing'
import { initializeQuests, resetDailyQuests } from './quests'

const STORAGE_KEY = 'coffee-lingo-state'

export function createInitialState(expressions: Expression[]): PlayerState {
  const vocabulary: Record<string, VocabularyEntry> = {}
  for (const expr of expressions) {
    vocabulary[expr.id] = {
      masteryLevel: 0,
      totalSuccessfulUses: 0,
      totalWrong: 0,
      successfulDays: 0,
      lastSuccessDay: null,
      todayRight: 0,
      todayWrong: 0,
      todayDate: null,
    }
  }
  return {
    totalCustomersServed: 0,
    coins: 0,
    reputation: 0,
    vocabulary,
    recencyBuffer: [],
    upgrades: {},
    relationships: {},
    unlockedRooms: [],
    placedFurnishings: {
      cafe_table_mid_left: { row: 21, col: 22 },
      cafe_table_mid_right: { row: 22, col: 26 },
      cafe_accent_plant: { row: 9, col: 24 },
    },
    furnishingUpgrades: {},
  }
}

export function loadState(): { state: PlayerState; readyToInstall: string[] } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = JSON.parse(raw) as any

    // Migration: old save with currentDay → new format
    if ('currentDay' in data && !('totalCustomersServed' in data)) {
      // Estimate totalCustomersServed from relationships
      let served = 0
      if (data.relationships) {
        for (const rel of Object.values(data.relationships) as { timesServed?: number }[]) {
          served += rel.timesServed ?? 0
        }
      }
      data.totalCustomersServed = served
      delete data.currentDay
    }

    // Migration: relationships lastSeenDay → lastSeenAt
    if (data.relationships) {
      for (const [id, rel] of Object.entries(data.relationships) as [string, Record<string, unknown>][]) {
        if ('lastSeenDay' in rel && !('lastSeenAt' in rel)) {
          (rel as Record<string, unknown>).lastSeenAt = data.totalCustomersServed ?? 0
          delete (rel as Record<string, unknown>).lastSeenDay
        }
        data.relationships[id] = rel
      }
    }

    // Migration: vocabulary — strip old fields, add new mastery fields
    if (data.vocabulary) {
      for (const [id, entry] of Object.entries(data.vocabulary) as [string, Record<string, unknown>][]) {
        delete entry.sessionsUsedIn
        delete entry.lastUsedDay
        if (entry.successfulDays === undefined) entry.successfulDays = 0
        if (entry.lastSuccessDay === undefined) entry.lastSuccessDay = null
        if (entry.todayRight === undefined) entry.todayRight = 0
        if (entry.todayWrong === undefined) entry.todayWrong = 0
        if (entry.todayDate === undefined) entry.todayDate = null
        if (entry.totalWrong === undefined) entry.totalWrong = 0
        data.vocabulary[id] = entry
      }
    }

    const state = data as PlayerState
    state.upgrades = state.upgrades ?? {}
    state.relationships = state.relationships ?? {}
    state.unlockedRooms = state.unlockedRooms ?? []
    state.placedFurnishings = state.placedFurnishings ?? {}
    state.furnishingUpgrades = state.furnishingUpgrades ?? {}
    state.wrongQueue = state.wrongQueue ?? []

    // One-time migration: patio changed from auto-unlock to purchasable
    if (!localStorage.getItem('coffee-lingo-m1')) {
      state.unlockedRooms = state.unlockedRooms.filter(r => r !== 'patio')
      localStorage.setItem('coffee-lingo-m1', '1')
    }

    // Migration m2: existing patio owners get patio furniture auto-placed
    if (state.unlockedRooms.includes('patio')) {
      if (!localStorage.getItem('coffee-lingo-m2')) {
        for (const item of PATIO_FURNISHINGS) {
          if (!state.placedFurnishings[item.id]) {
            state.placedFurnishings[item.id] = item.slots[0]
          }
        }
        localStorage.setItem('coffee-lingo-m2', '1')
      }
    }

    // Legacy migrations m3/m4 removed — they auto-placed/upgraded all furnishings
    // which caused a bug where buying one item made everything appear bought.
    // Mark them as done so they never run from old code paths.
    if (!localStorage.getItem('coffee-lingo-m3')) localStorage.setItem('coffee-lingo-m3', '1')
    if (!localStorage.getItem('coffee-lingo-m4')) localStorage.setItem('coffee-lingo-m4', '1')

    // Quest initialization + daily reset
    const today = new Date().toISOString().slice(0, 10)
    if (!state.quests) {
      state.quests = initializeQuests(today, state.coins, state.reputation)
    } else if (state.quests.date !== today) {
      state.quests = resetDailyQuests(state.quests, today)
    }

    const readyToInstall = getReadyToInstallIds(state.upgrades!, state.furnishingUpgrades)
    return { state, readyToInstall }
  } catch {
    return null
  }
}

export function saveState(state: PlayerState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/**
 * Update mastery for a single target word after a quiz.
 * correct=true: +1 use, count today as successful if rights > wrongs
 * correct=false: -5 uses (min 0), today doesn't count if wrongs >= rights
 *
 * Level thresholds require BOTH uses AND distinct successful days:
 *   Familiar:  20 uses + 2 days
 *   Confident: 50 uses + 5 days
 *   Mastered:  200 uses + 14 days
 */
export function updateMastery(
  state: PlayerState,
  targetWordId: string,
  correct: boolean,
): PlayerState {
  const entry = state.vocabulary[targetWordId]
  if (!entry) return state

  const today = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
  const updated = { ...entry }

  // Reset daily counters if it's a new day
  if (updated.todayDate !== today) {
    // Before resetting, finalize previous day if it existed
    // (in case the app was left open overnight)
    if (updated.todayDate && updated.todayRight > updated.todayWrong && updated.lastSuccessDay !== updated.todayDate) {
      updated.successfulDays += 1
      updated.lastSuccessDay = updated.todayDate
    }
    updated.todayRight = 0
    updated.todayWrong = 0
    updated.todayDate = today
  }

  if (correct) {
    updated.totalSuccessfulUses += 1
    updated.todayRight += 1
  } else {
    updated.totalSuccessfulUses = Math.max(0, updated.totalSuccessfulUses - 5)
    updated.totalWrong += 1
    updated.todayWrong += 1
  }

  // Count today toward successfulDays if rights > wrongs (and not already counted)
  if (updated.todayRight > updated.todayWrong && updated.lastSuccessDay !== today) {
    updated.successfulDays += 1
    updated.lastSuccessDay = today
  }
  // Revoke today if wrongs caught up (and today was counted)
  if (updated.todayRight <= updated.todayWrong && updated.lastSuccessDay === today) {
    updated.successfulDays = Math.max(0, updated.successfulDays - 1)
    updated.lastSuccessDay = updated.todayDate  // keep todayDate but mark as not counted
    // Set lastSuccessDay to null so it can be re-earned
    updated.lastSuccessDay = null
  }

  // Level-up thresholds: both uses AND distinct days required
  if (updated.totalSuccessfulUses >= 200 && updated.successfulDays >= 14) {
    updated.masteryLevel = 3
  } else if (updated.totalSuccessfulUses >= 50 && updated.successfulDays >= 5) {
    updated.masteryLevel = 2
  } else if (updated.totalSuccessfulUses >= 20 && updated.successfulDays >= 2) {
    updated.masteryLevel = 1
  } else {
    updated.masteryLevel = 0
  }

  const newVocabulary = { ...state.vocabulary, [targetWordId]: updated }
  return { ...state, vocabulary: newVocabulary }
}

import { Expression, PlayerState, VocabularyEntry } from './types'
import { getReadyToInstallIds } from './upgrades'

const STORAGE_KEY = 'coffee-lingo-state'

export function createInitialState(expressions: Expression[]): PlayerState {
  const vocabulary: Record<string, VocabularyEntry> = {}
  for (const expr of expressions) {
    vocabulary[expr.id] = {
      masteryLevel: 1,
      totalSuccessfulUses: 0,
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

    // Migration: vocabulary — strip sessionsUsedIn / lastUsedDay
    if (data.vocabulary) {
      for (const [id, entry] of Object.entries(data.vocabulary) as [string, Record<string, unknown>][]) {
        delete entry.sessionsUsedIn
        delete entry.lastUsedDay
        data.vocabulary[id] = entry
      }
    }

    const state = data as PlayerState
    state.upgrades = state.upgrades ?? {}
    state.relationships = state.relationships ?? {}

    const readyToInstall = getReadyToInstallIds(state.upgrades)
    return { state, readyToInstall }
  } catch {
    return null
  }
}

export function saveState(state: PlayerState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function updateMastery(
  state: PlayerState,
  usedWords: Expression[],
  requiredIdeas: string[],
  bonusIdeas: string[],
  masteryXpMultiplier: number = 1
): PlayerState {
  const allTargetIdeas = new Set([...requiredIdeas, ...bonusIdeas])
  const newVocabulary = { ...state.vocabulary }

  for (const word of usedWords) {
    const matched = word.ideaTags.some((tag) => allTargetIdeas.has(tag))
    if (!matched) continue

    const entry = newVocabulary[word.id]
    if (!entry) continue

    const updated = { ...entry }
    updated.totalSuccessfulUses += Math.random() < (masteryXpMultiplier - 1) ? 2 : 1

    // Level-up thresholds (pure use count, no session gating)
    if (updated.masteryLevel === 0 && updated.totalSuccessfulUses >= 1) {
      updated.masteryLevel = 1
    } else if (updated.masteryLevel === 1 && updated.totalSuccessfulUses >= 5) {
      updated.masteryLevel = 2
    } else if (updated.masteryLevel === 2 && updated.totalSuccessfulUses >= 12) {
      updated.masteryLevel = 3
    }

    newVocabulary[word.id] = updated
  }

  return { ...state, vocabulary: newVocabulary }
}

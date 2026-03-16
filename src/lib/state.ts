import { Expression, PlayerState, VocabularyEntry } from './types'
import { getReadyToInstallIds } from './upgrades'

const STORAGE_KEY = 'coffee-lingo-state'

export function createInitialState(expressions: Expression[]): PlayerState {
  const vocabulary: Record<string, VocabularyEntry> = {}
  for (const expr of expressions) {
    vocabulary[expr.id] = {
      masteryLevel: 1,
      totalSuccessfulUses: 0,
      sessionsUsedIn: 0,
      lastUsedDay: 0,
    }
  }
  return {
    currentDay: 1,
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
    const state = JSON.parse(raw) as PlayerState
    // Migration: ensure optional fields exist
    state.upgrades = state.upgrades ?? {}
    state.relationships = state.relationships ?? {}
    // Check which upgrades are ready to install (not auto-finalized — player must claim)
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
  currentDay: number,
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

    if (updated.lastUsedDay !== currentDay) {
      updated.sessionsUsedIn += 1
      updated.lastUsedDay = currentDay
    }

    // Check level-up thresholds
    if (updated.masteryLevel === 0 && updated.totalSuccessfulUses >= 1) {
      updated.masteryLevel = 1
    } else if (
      updated.masteryLevel === 1 &&
      updated.totalSuccessfulUses >= 5 &&
      updated.sessionsUsedIn >= 2
    ) {
      updated.masteryLevel = 2
    } else if (
      updated.masteryLevel === 2 &&
      updated.totalSuccessfulUses >= 12 &&
      updated.sessionsUsedIn >= 4
    ) {
      updated.masteryLevel = 3
    }

    newVocabulary[word.id] = updated
  }

  return { ...state, vocabulary: newVocabulary }
}

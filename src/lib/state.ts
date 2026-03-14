import { Expression, PlayerState, VocabularyEntry } from './types'

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
  }
}

export function loadState(): PlayerState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PlayerState
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
  currentDay: number
): PlayerState {
  const allTargetIdeas = new Set([...requiredIdeas, ...bonusIdeas])
  const newVocabulary = { ...state.vocabulary }

  for (const word of usedWords) {
    const matched = word.ideaTags.some((tag) => allTargetIdeas.has(tag))
    if (!matched) continue

    const entry = newVocabulary[word.id]
    if (!entry) continue

    const updated = { ...entry }
    updated.totalSuccessfulUses += 1

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

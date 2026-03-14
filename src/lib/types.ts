export interface Expression {
  id: string
  text: string
  nativeText: string
  ideaTags: string[]
  stage: number
}

export interface DialogueTemplate {
  id: string
  ideaCategory: string
  difficulty: number
  customerLines: {
    text: string
    variables: Record<string, string[]>
  }[]
  requiredIdeas: string[]
  bonusIdeas: string[]
  followUpIds: string[]
}

export interface ResolvedExchange {
  customerLine: string
  requiredIdeas: string[]
  bonusIdeas: string[]
  wordBank: Expression[]
  templateId: string
  hintIdea: string
  hintTranslation: string
}

export type Score = 'PERFECT' | 'GOOD' | 'UNDERSTOOD' | 'MISSED'

export interface EvaluationResult {
  score: Score
  coveredRequired: string[]
  coveredBonus: string[]
  tipAmount: number
}

export interface PlayerState {
  currentDay: number
  coins: number
  reputation: number
  vocabulary: Record<string, VocabularyEntry>
  recencyBuffer: string[]
}

export interface VocabularyEntry {
  masteryLevel: number
  totalSuccessfulUses: number
  sessionsUsedIn: number
  lastUsedDay: number
}

export interface DaySummary {
  customersServed: number
  totalCustomers: number
  scores: Record<Score, number>
  coinsEarned: number
  reputationChange: number
  wordsPracticed: number
  wordsLeveledUp: string[]
}

import {
  Expression,
  ResolvedExchange,
  AnswerChoice,
  CustomerConversation,
  Score,
  EvaluationResult,
  VocabularyEntry,
  WrongQueueEntry,
} from './types'
import type { UpgradeBonuses } from './upgrades'

function pickRandom<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error('Cannot pick from empty array')
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Generate a word quiz: NPC says an English word, player picks the correct French translation.
 * Returns 1 correct choice + 3 distractors.
 */
export function generateWordQuiz(
  expressions: Expression[],
  vocabulary: Record<string, VocabularyEntry>,
  recencyBuffer: string[],
  wrongQueue: WrongQueueEntry[] = [],
): { exchange: ResolvedExchange; targetWordId: string } {
  const recentSet = new Set(recencyBuffer)
  let target: Expression | undefined

  // Queue priority scales with queue size to avoid predictable alternation
  const queueChance = wrongQueue.length <= 2 ? 0.5 : wrongQueue.length <= 4 ? 0.7 : 0.9
  if (wrongQueue.length > 0 && Math.random() < queueChance) {
    // Pick from queue — try to avoid recency but ignore it if needed
    const queueIds = new Set(wrongQueue.map(e => e.wordId))
    const nonRecent = expressions.filter(e => queueIds.has(e.id) && !recentSet.has(e.id))
    const queuePool = nonRecent.length > 0
      ? nonRecent
      : expressions.filter(e => queueIds.has(e.id))
    if (queuePool.length > 0) {
      target = pickRandom(queuePool)
    }
  }

  // Fallback: weighted random toward lower mastery
  if (!target) {
    const candidates = expressions.filter(e => !recentSet.has(e.id))
    const pool = candidates.length >= 4 ? candidates : expressions

    const weighted: { expr: Expression; weight: number }[] = pool.map(expr => {
      const entry = vocabulary[expr.id]
      const level = entry?.masteryLevel ?? 0
      const neverSeen = !entry || entry.totalSuccessfulUses === 0
      // Unseen words get boosted weight to ensure all words eventually appear
      return { expr, weight: neverSeen ? 6 : (4 - level) }
    })
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0)
    let roll = Math.random() * totalWeight
    target = weighted[0].expr
    for (const w of weighted) {
      roll -= w.weight
      if (roll <= 0) { target = w.expr; break }
    }
  }

  // Pick 3 distractors — prefer same category, fall back to random
  const sameCategory = expressions.filter(
    e => e.id !== target.id && e.ideaTags[0] === target.ideaTags[0]
  )
  const otherCategory = expressions.filter(
    e => e.id !== target.id && e.ideaTags[0] !== target.ideaTags[0]
  )

  const distractors: Expression[] = []
  const shuffledSame = shuffle(sameCategory)
  const shuffledOther = shuffle(otherCategory)

  // Try to get 1-2 from same category, rest from other
  const sameCategoryCount = Math.min(shuffledSame.length, Math.random() < 0.5 ? 1 : 2)
  for (let i = 0; i < sameCategoryCount && distractors.length < 3; i++) {
    distractors.push(shuffledSame[i])
  }
  for (let i = 0; distractors.length < 3 && i < shuffledOther.length; i++) {
    distractors.push(shuffledOther[i])
  }
  // If still not enough, fill from same category
  for (let i = sameCategoryCount; distractors.length < 3 && i < shuffledSame.length; i++) {
    distractors.push(shuffledSame[i])
  }

  // Build choices
  const correctChoice: AnswerChoice = {
    id: 'correct',
    expressions: [target],
    displayText: target.text,
    score: 'PERFECT',
  }

  const wrongChoices: AnswerChoice[] = distractors.map((d, i) => ({
    id: `wrong_${i}`,
    expressions: [d],
    displayText: d.text,
    score: 'MISSED',
  }))

  const choices = shuffle([correctChoice, ...wrongChoices])

  // Category label for hint
  const categoryLabels: Record<string, string> = {
    greeting: 'Greeting',
    common: 'Common word',
    number: 'Number',
    color: 'Color',
    food: 'Food & Drink',
    animal: 'Animal',
    place: 'Place',
    family: 'Family & People',
    adjective: 'Adjective',
    verb: 'Verb',
    weather: 'Weather',
    time: 'Time',
    body: 'Body',
    thing: 'Thing',
  }

  const exchange: ResolvedExchange = {
    customerLine: target.nativeText,
    requiredIdeas: target.ideaTags,
    bonusIdeas: [],
    choices,
    templateId: target.id,
    hintIdea: categoryLabels[target.ideaTags[0]] ?? 'Word',
    hintTranslation: target.text,
  }

  return { exchange, targetWordId: target.id }
}

/**
 * Generate a single conversation (1 word quiz exchange).
 */
/**
 * Generate initial conversation with 1 exchange. Additional exchanges are added
 * dynamically during the conversation using generateWordQuiz.
 */
export function generateSingleConversation(
  expressions: Expression[],
  vocabulary: Record<string, VocabularyEntry>,
  recencyBuffer: string[],
  wrongQueue: WrongQueueEntry[] = [],
): { conversation: CustomerConversation; usedWordId: string; roundsTarget: number } {
  const { exchange, targetWordId } = generateWordQuiz(expressions, vocabulary, recencyBuffer, wrongQueue)
  return {
    conversation: { exchanges: [exchange] },
    usedWordId: targetWordId,
    roundsTarget: 5 + Math.floor(Math.random() * 4), // 5-8
  }
}

// Shared tip calculation with upgrade bonuses
function computeTip(score: Score, hintLevel: number, bonuses?: UpgradeBonuses): number {
  const SCORE_MULTIPLIERS: Record<Score, number> = {
    PERFECT: 1.5,
    GOOD: 1.0,
    UNDERSTOOD: 0.5,
    MISSED: 0,
  }
  const HINT_MULTIPLIERS = [1.0, 0.75, 0.5]
  const BASE_TIP = 10

  // Lamp bonus: reduce hint penalty
  const rawHintMult = HINT_MULTIPLIERS[hintLevel] ?? 0.5
  const hintMult = bonuses
    ? 1 - (1 - rawHintMult) * (1 - bonuses.hintPenaltyReduction)
    : rawHintMult

  let tipAmount = Math.round(
    BASE_TIP
    * SCORE_MULTIPLIERS[score]
    * hintMult
    * (bonuses?.tipMultiplier ?? 1)   // Coffee Machine
    * (bonuses?.coinMultiplier ?? 1)   // Floor
  )

  // Plant bonus: chance of bonus coins
  if (bonuses && bonuses.bonusCoinChance > 0 && score !== 'MISSED') {
    if (Math.random() < bonuses.bonusCoinChance) tipAmount += 5
  }

  return tipAmount
}

// Evaluate a choice directly using its pre-assigned score
export function evaluateChoice(
  choice: AnswerChoice,
  hintLevel: number,
  bonuses?: UpgradeBonuses
): EvaluationResult {
  const tipAmount = computeTip(choice.score, hintLevel, bonuses)

  return {
    score: choice.score,
    coveredRequired: [],
    coveredBonus: [],
    tipAmount,
  }
}

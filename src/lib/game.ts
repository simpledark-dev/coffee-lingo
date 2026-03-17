import {
  Expression,
  DialogueTemplate,
  ResolvedExchange,
  AnswerChoice,
  CustomerConversation,
  Score,
  EvaluationResult,
  VocabularyEntry,
} from './types'
import type { UpgradeBonuses } from './upgrades'

const IDEA_HINT_MAP: Record<string, string> = {
  greeting: 'Greet the customer',
  confirmation: 'Confirm or answer yes',
  ordering: 'Confirm the order',
  quantity: 'Say the quantity',
  politeness: 'Be polite',
  farewell: 'Say goodbye',
  agreement: 'Agree with the customer',
  negation: 'Decline politely',
  quality: 'Comment on quality',
  item: 'Name the item',
  wifi: 'Help with the Wi-Fi',
  compliment: 'Respond to the compliment',
  weather: 'Talk about the weather',
  recommendation: 'Recommend something',
  location: 'Give directions',
  casual: 'Chat with the customer',
}

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

export function resolveTemplate(
  template: DialogueTemplate,
  allExpressions: Expression[]
): ResolvedExchange {
  const line = pickRandom(template.customerLines)

  // Pick random values for each variable
  const chosenVariables: Record<string, string> = {}
  for (const [varName, options] of Object.entries(line.variables)) {
    chosenVariables[varName] = pickRandom(options)
  }

  // Fill variables into customer line text
  let customerLine = line.text
  for (const [varName, value] of Object.entries(chosenVariables)) {
    customerLine = customerLine.replace(new RegExp(`\\{${varName}\\}`, 'g'), value)
  }

  // Resolve requiredIdeas: {variable} references → look up expression's ideaTags
  const requiredIdeas = template.requiredIdeas.map((idea) => {
    const varMatch = idea.match(/^\{(.+)\}$/)
    if (!varMatch) return idea

    const varName = varMatch[1]
    const chosenValue = chosenVariables[varName]
    if (!chosenValue) return idea

    const expr = allExpressions.find((e) => e.text === chosenValue)
    if (!expr) return idea

    return expr.ideaTags[0]
  })

  // Generate hint
  const hintIdea = IDEA_HINT_MAP[template.ideaCategory] ?? 'Respond appropriately'

  let hintTranslation = line.text
  for (const [varName, value] of Object.entries(chosenVariables)) {
    const expr = allExpressions.find((e) => e.text === value)
    const nativeValue = expr?.nativeText ?? value
    hintTranslation = hintTranslation.replace(
      new RegExp(`\\{${varName}\\}`, 'g'),
      nativeValue
    )
  }

  // Resolve response choices — fill variables and look up expressions
  const choices: AnswerChoice[] = template.responses.map((resp, idx) => {
    // Fill variables in response text
    let displayText = resp.text
    for (const [varName, value] of Object.entries(chosenVariables)) {
      displayText = displayText.replace(new RegExp(`\\{${varName}\\}`, 'g'), value)
    }

    // Resolve expressionIds — {variable} refs → actual expression IDs
    const expressions: Expression[] = []
    for (const eid of resp.expressionIds) {
      const varMatch = eid.match(/^\{(.+)\}$/)
      if (varMatch) {
        const varName = varMatch[1]
        const chosenValue = chosenVariables[varName]
        if (chosenValue) {
          const expr = allExpressions.find((e) => e.text === chosenValue)
          if (expr) expressions.push(expr)
        }
      } else {
        const expr = allExpressions.find((e) => e.id === eid)
        if (expr) expressions.push(expr)
      }
    }

    return {
      id: `choice_${idx}`,
      expressions,
      displayText,
      score: resp.score as Score,
    }
  })

  return {
    customerLine,
    requiredIdeas,
    bonusIdeas: template.bonusIdeas,
    choices: shuffle(choices),
    templateId: template.id,
    hintIdea,
    hintTranslation,
  }
}

export function evaluate(
  selectedWords: Expression[],
  requiredIdeas: string[],
  bonusIdeas: string[],
  hintLevel: number,
  bonuses?: UpgradeBonuses
): EvaluationResult {
  const selectedTags = new Set<string>()
  for (const word of selectedWords) {
    for (const tag of word.ideaTags) {
      selectedTags.add(tag)
    }
  }

  const coveredRequired = requiredIdeas.filter((idea) => selectedTags.has(idea))
  const coveredBonus = bonusIdeas.filter((idea) => selectedTags.has(idea))

  const requiredRatio = requiredIdeas.length > 0 ? coveredRequired.length / requiredIdeas.length : 0

  let score: Score
  if (coveredRequired.length === requiredIdeas.length && coveredBonus.length > 0) {
    score = 'PERFECT'
  } else if (coveredRequired.length === requiredIdeas.length) {
    score = 'GOOD'
  } else if (requiredRatio >= 0.5) {
    score = 'UNDERSTOOD'
  } else {
    score = 'MISSED'
  }

  const tipAmount = computeTip(score, hintLevel, bonuses)

  return { score, coveredRequired, coveredBonus, tipAmount }
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

// Conversation patterns: natural multi-turn flows
// Categories are always in a sensible order:
//   openers (greeting, weather, compliment) → inquiries (wifi, recommendation, location, casual, confirmation)
//   → action (ordering) → closers (politeness, farewell)
const CONVERSATION_PATTERNS: string[][] = [
  // 1-turn
  ['ordering'],
  ['greeting'],
  ['compliment'],
  ['casual'],
  // 2-turn
  ['greeting', 'ordering'],
  ['greeting', 'wifi'],
  ['greeting', 'location'],
  ['weather', 'ordering'],
  ['compliment', 'politeness'],
  ['ordering', 'politeness'],
  ['greeting', 'casual'],
  // 3-turn
  ['greeting', 'ordering', 'politeness'],
  ['greeting', 'recommendation', 'ordering'],
  ['weather', 'ordering', 'politeness'],
  ['greeting', 'wifi', 'politeness'],
  ['compliment', 'ordering', 'politeness'],
  ['greeting', 'location', 'politeness'],
  // 4-turn
  ['greeting', 'recommendation', 'ordering', 'politeness'],
  ['greeting', 'weather', 'ordering', 'farewell'],
  ['greeting', 'casual', 'ordering', 'politeness'],
]

export function generateConversations(
  templates: DialogueTemplate[],
  expressions: Expression[],
  _playerVocabulary: Record<string, VocabularyEntry>,
  recencyBuffer: string[],
  extraCustomers: number = 0
): CustomerConversation[] {
  const TARGET_CUSTOMERS = 10 + extraCustomers
  const conversations: CustomerConversation[] = []
  const usedTemplateIds = new Set<string>()

  // Group templates by category
  const recentSet = new Set(recencyBuffer)
  const byCategory: Record<string, DialogueTemplate[]> = {}
  for (const t of templates) {
    if (!byCategory[t.ideaCategory]) byCategory[t.ideaCategory] = []
    byCategory[t.ideaCategory].push(t)
  }
  // Shuffle within each category, non-recent first
  for (const cat of Object.keys(byCategory)) {
    const nonRecent = byCategory[cat].filter((t) => !recentSet.has(t.id))
    const recent = byCategory[cat].filter((t) => recentSet.has(t.id))
    byCategory[cat] = [...shuffle(nonRecent), ...shuffle(recent)]
  }

  const patterns = shuffle([...CONVERSATION_PATTERNS])

  for (let i = 0; i < TARGET_CUSTOMERS; i++) {
    const pattern = patterns[i % patterns.length]
    const exchanges: ResolvedExchange[] = []

    for (const category of pattern) {
      const pool = byCategory[category]
      if (!pool) continue

      let template: DialogueTemplate | undefined
      for (const t of pool) {
        if (!usedTemplateIds.has(t.id)) {
          template = t
          break
        }
      }
      if (!template) template = pickRandom(pool)

      try {
        const exchange = resolveTemplate(template, expressions)
        exchanges.push(exchange)
        usedTemplateIds.add(template.id)
      } catch {
        continue
      }
    }

    if (exchanges.length > 0) {
      conversations.push({ exchanges })
    }
  }

  return conversations
}

/**
 * Generate a single conversation on demand (for continuous gameplay).
 * Returns the conversation and the template IDs used (for recency tracking).
 */
export function generateSingleConversation(
  templates: DialogueTemplate[],
  expressions: Expression[],
  _playerVocabulary: Record<string, VocabularyEntry>,
  recencyBuffer: string[],
): { conversation: CustomerConversation; usedTemplateIds: string[] } {
  const recentSet = new Set(recencyBuffer)
  const byCategory: Record<string, DialogueTemplate[]> = {}
  for (const t of templates) {
    if (!byCategory[t.ideaCategory]) byCategory[t.ideaCategory] = []
    byCategory[t.ideaCategory].push(t)
  }
  for (const cat of Object.keys(byCategory)) {
    const nonRecent = byCategory[cat].filter((t) => !recentSet.has(t.id))
    const recent = byCategory[cat].filter((t) => recentSet.has(t.id))
    byCategory[cat] = [...shuffle(nonRecent), ...shuffle(recent)]
  }

  const pattern = pickRandom(CONVERSATION_PATTERNS)
  const exchanges: ResolvedExchange[] = []
  const usedTemplateIds: string[] = []

  for (const category of pattern) {
    const pool = byCategory[category]
    if (!pool) continue
    // Prefer non-recent template
    const template = pool.find((t) => !recentSet.has(t.id)) ?? pickRandom(pool)
    try {
      const exchange = resolveTemplate(template, expressions)
      exchanges.push(exchange)
      usedTemplateIds.push(template.id)
    } catch {
      continue
    }
  }

  return {
    conversation: { exchanges: exchanges.length > 0 ? exchanges : [resolveTemplate(pickRandom(templates), expressions)] },
    usedTemplateIds,
  }
}

// Backward compat for tests
export function generateDay(
  templates: DialogueTemplate[],
  expressions: Expression[],
  playerVocabulary: Record<string, VocabularyEntry>,
  recencyBuffer: string[]
): ResolvedExchange[] {
  const conversations = generateConversations(templates, expressions, playerVocabulary, recencyBuffer)
  return conversations.flatMap((c) => c.exchanges)
}

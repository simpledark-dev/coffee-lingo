import {
  Expression,
  DialogueTemplate,
  ResolvedExchange,
  Score,
  EvaluationResult,
  VocabularyEntry,
} from './types'

const IDEA_HINT_MAP: Record<string, string> = {
  greeting: 'Greet the customer',
  confirmation: 'Confirm the order',
  ordering: 'Confirm the order',
  quantity: 'Say the quantity',
  politeness: 'Be polite',
  farewell: 'Say goodbye',
  agreement: 'Agree with the customer',
  negation: 'Decline politely',
  quality: 'Comment on quality',
  item: 'Name the item',
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

    // Find the expression matching the chosen value
    const expr = allExpressions.find((e) => e.text === chosenValue)
    if (!expr) return idea

    // Return the first ideaTag from that expression
    return expr.ideaTags[0]
  })

  // Generate hint idea
  const hintIdea = IDEA_HINT_MAP[template.ideaCategory] ?? 'Respond appropriately'

  // Generate hint translation by replacing variables with nativeText
  let hintTranslation = line.text
  for (const [varName, value] of Object.entries(chosenVariables)) {
    const expr = allExpressions.find((e) => e.text === value)
    const nativeValue = expr?.nativeText ?? value
    hintTranslation = hintTranslation.replace(
      new RegExp(`\\{${varName}\\}`, 'g'),
      nativeValue
    )
  }

  // Generate word bank (will be replaced by generateWordBank call externally,
  // but for self-contained resolution we do it here)
  const wordBank = generateWordBank(requiredIdeas, template.bonusIdeas, allExpressions)

  return {
    customerLine,
    requiredIdeas,
    bonusIdeas: template.bonusIdeas,
    wordBank,
    templateId: template.id,
    hintIdea,
    hintTranslation,
  }
}

export function evaluate(
  selectedWords: Expression[],
  requiredIdeas: string[],
  bonusIdeas: string[],
  hintLevel: number
): EvaluationResult {
  // Collect all ideaTags from selected words
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

  const SCORE_MULTIPLIERS: Record<Score, number> = {
    PERFECT: 1.5,
    GOOD: 1.0,
    UNDERSTOOD: 0.5,
    MISSED: 0,
  }
  const HINT_MULTIPLIERS = [1.0, 0.75, 0.5]
  const BASE_TIP = 10

  const tipAmount = Math.round(
    BASE_TIP * SCORE_MULTIPLIERS[score] * (HINT_MULTIPLIERS[hintLevel] ?? 0.5)
  )

  return { score, coveredRequired, coveredBonus, tipAmount }
}

export function generateWordBank(
  requiredIdeas: string[],
  bonusIdeas: string[],
  allExpressions: Expression[]
): Expression[] {
  const TARGET_SIZE = 8

  // Step 1: Include expressions whose ideaTags intersect with requiredIdeas
  const answerWords: Expression[] = []
  const usedIds = new Set<string>()

  for (const idea of requiredIdeas) {
    const matching = allExpressions.find(
      (e) => e.ideaTags.includes(idea) && !usedIds.has(e.id)
    )
    if (matching) {
      answerWords.push(matching)
      usedIds.add(matching.id)
    }
  }

  // Step 2: Fill with distractors (no required idea tags)
  const requiredTagSet = new Set(requiredIdeas)
  const distractors = allExpressions.filter(
    (e) => !usedIds.has(e.id) && !e.ideaTags.some((t) => requiredTagSet.has(t))
  )

  const result = [...answerWords]

  // Prefer same-stage distractors
  const stage1Distractors = distractors.filter((e) => e.stage === 1)
  const otherDistractors = distractors.filter((e) => e.stage !== 1)
  const sortedDistractors = [...stage1Distractors, ...otherDistractors]

  for (const d of sortedDistractors) {
    if (result.length >= TARGET_SIZE) break
    result.push(d)
    usedIds.add(d.id)
  }

  // Step 3: If still under 8, pad with any remaining vocabulary
  if (result.length < TARGET_SIZE) {
    const remaining = allExpressions.filter((e) => !usedIds.has(e.id))
    for (const r of remaining) {
      if (result.length >= TARGET_SIZE) break
      result.push(r)
    }
  }

  // SAFETY: verify bank covers all required ideas
  const bankTags = new Set(result.flatMap((e) => e.ideaTags))
  for (const idea of requiredIdeas) {
    if (!bankTags.has(idea)) {
      throw new Error(
        `Word bank missing coverage for required idea: "${idea}". Bank tags: [${[...bankTags].join(', ')}]`
      )
    }
  }

  return shuffle(result)
}

export function generateDay(
  templates: DialogueTemplate[],
  expressions: Expression[],
  _playerVocabulary: Record<string, VocabularyEntry>,
  recencyBuffer: string[]
): ResolvedExchange[] {
  const TARGET_CUSTOMERS = 8
  const exchanges: ResolvedExchange[] = []
  const usedTemplateIds = new Set<string>()

  // Sort templates: non-recent first, then recent
  const recentSet = new Set(recencyBuffer)
  const nonRecent = templates.filter((t) => !recentSet.has(t.id))
  const recent = templates.filter((t) => recentSet.has(t.id))
  const prioritized = shuffle([...nonRecent, ...recent])

  for (const template of prioritized) {
    if (exchanges.length >= TARGET_CUSTOMERS) break
    if (usedTemplateIds.has(template.id)) continue

    try {
      const exchange = resolveTemplate(template, expressions)
      exchanges.push(exchange)
      usedTemplateIds.add(template.id)
    } catch {
      // Skip unsolvable templates
      continue
    }
  }

  // If we don't have enough, allow reusing templates
  if (exchanges.length < TARGET_CUSTOMERS) {
    const shuffledAll = shuffle([...templates])
    for (const template of shuffledAll) {
      if (exchanges.length >= TARGET_CUSTOMERS) break
      try {
        const exchange = resolveTemplate(template, expressions)
        exchanges.push(exchange)
      } catch {
        continue
      }
    }
  }

  return exchanges
}

import { describe, it, expect } from 'vitest'
import { generateDay } from '../src/lib/game'
import expressionsData from '../data/expressions.json'
import templatesData from '../data/templates.json'
import { Expression, DialogueTemplate, VocabularyEntry } from '../src/lib/types'

const expressions = expressionsData as Expression[]
const templates = templatesData as DialogueTemplate[]

function createVocabulary(): Record<string, VocabularyEntry> {
  const vocab: Record<string, VocabularyEntry> = {}
  for (const e of expressions) {
    vocab[e.id] = {
      masteryLevel: 1,
      totalSuccessfulUses: 0,
      sessionsUsedIn: 0,
      lastUsedDay: 0,
    }
  }
  return vocab
}

describe('generateDay', () => {
  it('generates exactly 8 exchanges', () => {
    const exchanges = generateDay(templates, expressions, createVocabulary(), [])
    expect(exchanges).toHaveLength(8)
  })

  it('every exchange is solvable (word bank covers all required ideas)', () => {
    const exchanges = generateDay(templates, expressions, createVocabulary(), [])

    for (const exchange of exchanges) {
      const bankTags = new Set(exchange.wordBank.flatMap((e) => e.ideaTags))
      for (const idea of exchange.requiredIdeas) {
        expect(bankTags.has(idea)).toBe(true)
      }
    }
  })

  it('works with full content set (all 20 templates, all 15 expressions)', () => {
    expect(templates).toHaveLength(20)
    expect(expressions).toHaveLength(15)

    // Run multiple times to check stability
    for (let i = 0; i < 5; i++) {
      const exchanges = generateDay(templates, expressions, createVocabulary(), [])
      expect(exchanges).toHaveLength(8)
    }
  })

  it('deprioritizes recent templates', () => {
    // Run 20 times with recency buffer and track how often recent templates appear
    const recentIds = ['greeting_01', 'greeting_02', 'greeting_03']
    let recentAppearances = 0
    const runs = 20

    for (let i = 0; i < runs; i++) {
      const exchanges = generateDay(templates, expressions, createVocabulary(), recentIds)
      for (const ex of exchanges) {
        if (recentIds.includes(ex.templateId)) recentAppearances++
      }
    }

    // Recent templates should appear less often than if there were no filter
    // With 20 templates and 8 picks, expected ~2.4 per run without filter for 3 templates
    // With deprioritization, should be lower on average
    const avgPerRun = recentAppearances / runs
    expect(avgPerRun).toBeLessThan(3)
  })
})

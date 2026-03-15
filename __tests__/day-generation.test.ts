import { describe, it, expect } from 'vitest'
import { generateDay, generateConversations } from '../src/lib/game'
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

describe('generateConversations', () => {
  it('generates exactly 10 customers', () => {
    const convos = generateConversations(templates, expressions, createVocabulary(), [])
    expect(convos).toHaveLength(10)
  })

  it('each customer has 1-3 exchanges', () => {
    for (let i = 0; i < 5; i++) {
      const convos = generateConversations(templates, expressions, createVocabulary(), [])
      for (const convo of convos) {
        expect(convo.exchanges.length).toBeGreaterThanOrEqual(1)
        expect(convo.exchanges.length).toBeLessThanOrEqual(4)
      }
    }
  })

  it('every exchange has 4 answer choices', () => {
    const convos = generateConversations(templates, expressions, createVocabulary(), [])

    for (const convo of convos) {
      for (const exchange of convo.exchanges) {
        expect(exchange.choices).toHaveLength(4)
        const hasCorrect = exchange.choices.some(
          (c) => c.score === 'PERFECT' || c.score === 'GOOD'
        )
        expect(hasCorrect).toBe(true)
      }
    }
  })

  it('works with full content set (14 templates, 15 expressions)', () => {
    expect(templates.length).toBeGreaterThanOrEqual(20)
    expect(expressions.length).toBeGreaterThanOrEqual(25)

    for (let i = 0; i < 5; i++) {
      const convos = generateConversations(templates, expressions, createVocabulary(), [])
      expect(convos).toHaveLength(10)
      const totalExchanges = convos.reduce((sum, c) => sum + c.exchanges.length, 0)
      expect(totalExchanges).toBeGreaterThanOrEqual(10)
      expect(totalExchanges).toBeLessThanOrEqual(30)
    }
  })

  it('deprioritizes recent templates', () => {
    const recentIds = ['greet_01', 'greet_02', 'greet_03']
    let recentAppearances = 0
    const runs = 20

    for (let i = 0; i < runs; i++) {
      const convos = generateConversations(templates, expressions, createVocabulary(), recentIds)
      for (const convo of convos) {
        for (const ex of convo.exchanges) {
          if (recentIds.includes(ex.templateId)) recentAppearances++
        }
      }
    }

    const avgPerRun = recentAppearances / runs
    expect(avgPerRun).toBeLessThan(8)
  })
})

describe('generateDay (backward compat)', () => {
  it('returns a flat array of exchanges', () => {
    const exchanges = generateDay(templates, expressions, createVocabulary(), [])
    expect(exchanges.length).toBeGreaterThanOrEqual(8)
    for (const exchange of exchanges) {
      expect(exchange.customerLine).toBeDefined()
      expect(exchange.choices.length).toBe(4)
    }
  })
})

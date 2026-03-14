import { describe, it, expect } from 'vitest'
import { resolveTemplate } from '../src/lib/game'
import expressionsData from '../data/expressions.json'
import templatesData from '../data/templates.json'
import { Expression, DialogueTemplate } from '../src/lib/types'

const expressions = expressionsData as Expression[]
const templates = templatesData as DialogueTemplate[]

describe('answer choices', () => {
  it('each exchange has exactly 4 choices', () => {
    for (const template of templates) {
      const result = resolveTemplate(template, expressions)
      expect(result.choices).toHaveLength(4)
    }
  })

  it('each exchange has at least one PERFECT or GOOD choice', () => {
    for (const template of templates) {
      const result = resolveTemplate(template, expressions)
      const hasCorrect = result.choices.some(
        (c) => c.score === 'PERFECT' || c.score === 'GOOD'
      )
      expect(hasCorrect).toBe(true)
    }
  })

  it('each exchange has at least one MISSED or UNDERSTOOD choice', () => {
    for (const template of templates) {
      const result = resolveTemplate(template, expressions)
      const hasWrong = result.choices.some(
        (c) => c.score === 'MISSED' || c.score === 'UNDERSTOOD'
      )
      expect(hasWrong).toBe(true)
    }
  })

  it('choices have non-empty display text', () => {
    for (const template of templates) {
      const result = resolveTemplate(template, expressions)
      for (const choice of result.choices) {
        expect(choice.displayText.length).toBeGreaterThan(0)
      }
    }
  })

  it('choices have resolved expressions', () => {
    for (const template of templates) {
      const result = resolveTemplate(template, expressions)
      for (const choice of result.choices) {
        expect(choice.expressions.length).toBeGreaterThan(0)
      }
    }
  })

  it('variable-based choices resolve correctly', () => {
    const orderTemplate = templates.find((t) => t.id === 'order_01')!
    const result = resolveTemplate(orderTemplate, expressions)

    // The PERFECT choice should include an item expression
    const perfect = result.choices.find((c) => c.score === 'PERFECT')!
    const hasItemExpr = perfect.expressions.some((e) => e.ideaTags.includes('item'))
    expect(hasItemExpr).toBe(true)
  })
})

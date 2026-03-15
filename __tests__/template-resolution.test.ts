import { describe, it, expect } from 'vitest'
import { resolveTemplate } from '../src/lib/game'
import expressionsData from '../data/expressions.json'
import templatesData from '../data/templates.json'
import { Expression, DialogueTemplate } from '../src/lib/types'

const expressions = expressionsData as Expression[]
const templates = templatesData as DialogueTemplate[]

describe('resolveTemplate', () => {
  it('resolves {quantity} and {item} variables in requiredIdeas', () => {
    const orderTemplate = templates.find((t) => t.id === 'order_03')!
    const result = resolveTemplate(orderTemplate, expressions)

    expect(result.requiredIdeas).not.toContain('{quantity}')
    expect(result.requiredIdeas).not.toContain('{item}')
    expect(result.requiredIdeas).toContain('confirmation')
    expect(result.requiredIdeas.some((r) => r === 'quantity' || r === 'item')).toBe(true)
  })

  it('keeps plain string requiredIdeas unchanged', () => {
    const greetingTemplate = templates.find((t) => t.id === 'greet_01')!
    const result = resolveTemplate(greetingTemplate, expressions)

    expect(result.requiredIdeas).toContain('greeting')
  })

  it('fills variables into customer line text', () => {
    const orderTemplate = templates.find((t) => t.id === 'order_01')!
    const result = resolveTemplate(orderTemplate, expressions)

    expect(result.customerLine).not.toContain('{item}')
    const hasItem = ['café', 'thé'].some((i) => result.customerLine.includes(i))
    expect(hasItem).toBe(true)
  })

  it('fills variables into choice display text', () => {
    const orderTemplate = templates.find((t) => t.id === 'order_01')!
    const result = resolveTemplate(orderTemplate, expressions)

    for (const choice of result.choices) {
      expect(choice.displayText).not.toContain('{item}')
    }
    // At least one choice should mention the item
    const anyMentionsItem = result.choices.some((c) =>
      ['café', 'thé'].some((i) => c.displayText.includes(i))
    )
    expect(anyMentionsItem).toBe(true)
  })

  it('generates 4 shuffled choices per exchange', () => {
    const template = templates.find((t) => t.id === 'greet_01')!
    const result = resolveTemplate(template, expressions)

    expect(result.choices).toHaveLength(4)
    // At least one PERFECT or GOOD
    const hasGood = result.choices.some((c) => c.score === 'PERFECT' || c.score === 'GOOD')
    expect(hasGood).toBe(true)
  })

  it('generates hint idea and hint translation', () => {
    const orderTemplate = templates.find((t) => t.id === 'order_03')!
    const result = resolveTemplate(orderTemplate, expressions)

    expect(result.hintIdea).toBe('Confirm the order')
    expect(result.hintTranslation).toBeTruthy()
    expect(result.hintTranslation).not.toContain('{')
  })

  it('templates without variables have unchanged requiredIdeas', () => {
    const template = templates.find((t) => t.id === 'thanks_01')!
    const result = resolveTemplate(template, expressions)

    expect(result.requiredIdeas).toEqual(['politeness'])
  })
})

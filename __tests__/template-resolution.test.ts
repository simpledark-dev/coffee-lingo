import { describe, it, expect } from 'vitest'
import { resolveTemplate } from '../src/lib/game'
import expressionsData from '../data/expressions.json'
import templatesData from '../data/templates.json'
import { Expression, DialogueTemplate } from '../src/lib/types'

const expressions = expressionsData as Expression[]
const templates = templatesData as DialogueTemplate[]

describe('resolveTemplate', () => {
  it('resolves {quantity} and {item} variables to idea tags', () => {
    const orderTemplate = templates.find((t) => t.id === 'ordering_01')!
    const result = resolveTemplate(orderTemplate, expressions)

    // requiredIdeas should NOT contain "{quantity}" or "{item}"
    expect(result.requiredIdeas).not.toContain('{quantity}')
    expect(result.requiredIdeas).not.toContain('{item}')

    // Should contain the resolved tags
    expect(result.requiredIdeas).toContain('confirmation')
    expect(result.requiredIdeas).toContain('quantity')
    expect(result.requiredIdeas).toContain('item')
  })

  it('keeps plain string requiredIdeas unchanged', () => {
    const greetingTemplate = templates.find((t) => t.id === 'greeting_01')!
    const result = resolveTemplate(greetingTemplate, expressions)

    expect(result.requiredIdeas).toContain('greeting')
  })

  it('fills variables into customer line text', () => {
    const orderTemplate = templates.find((t) => t.id === 'ordering_01')!
    const result = resolveTemplate(orderTemplate, expressions)

    // Customer line should not contain {quantity} or {item}
    expect(result.customerLine).not.toContain('{quantity}')
    expect(result.customerLine).not.toContain('{item}')

    // Should contain one of the actual values
    const hasQuantity = ['un', 'deux', 'trois'].some((q) =>
      result.customerLine.includes(q)
    )
    const hasItem = ['café', 'thé'].some((i) => result.customerLine.includes(i))
    expect(hasQuantity).toBe(true)
    expect(hasItem).toBe(true)
  })

  it('generates hint idea and hint translation', () => {
    const orderTemplate = templates.find((t) => t.id === 'ordering_01')!
    const result = resolveTemplate(orderTemplate, expressions)

    expect(result.hintIdea).toBe('Confirm the order')
    expect(result.hintTranslation).toBeTruthy()
    // Hint translation should not contain {variable} references
    expect(result.hintTranslation).not.toContain('{')
  })

  it('templates without variables have unchanged requiredIdeas', () => {
    const template = templates.find((t) => t.id === 'politeness_01')!
    const result = resolveTemplate(template, expressions)

    expect(result.requiredIdeas).toEqual(['politeness'])
  })
})

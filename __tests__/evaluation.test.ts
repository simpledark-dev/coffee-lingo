import { describe, it, expect } from 'vitest'
import { evaluate } from '../src/lib/game'
import { Expression } from '../src/lib/types'

// Helper to create expression objects for testing
function expr(id: string, text: string, tags: string[]): Expression {
  return { id, text, nativeText: '', ideaTags: tags, stage: 1 }
}

const oui = expr('oui', 'oui', ['confirmation', 'agreement'])
const deux = expr('deux', 'deux', ['quantity'])
const cafe = expr('cafe', 'café', ['item'])
const svp = expr('s_il_vous_plait', "s'il vous plaît", ['politeness'])
const bonjour = expr('bonjour', 'bonjour', ['greeting'])

// Template: "Deux cafés s'il vous plaît"
// required: [confirmation, quantity, item], bonus: [politeness]
const required = ['confirmation', 'quantity', 'item']
const bonus = ['politeness']

describe('evaluate', () => {
  it('PERFECT: all required + bonus covered', () => {
    const result = evaluate([oui, deux, cafe, svp], required, bonus, 0)
    expect(result.score).toBe('PERFECT')
    expect(result.coveredRequired).toEqual(expect.arrayContaining(required))
    expect(result.coveredBonus).toEqual(['politeness'])
    expect(result.tipAmount).toBe(15) // 10 * 1.5 * 1.0
  })

  it('GOOD: all required covered, no bonus', () => {
    const result = evaluate([oui, deux, cafe], required, bonus, 0)
    expect(result.score).toBe('GOOD')
    expect(result.tipAmount).toBe(10) // 10 * 1.0 * 1.0
  })

  it('UNDERSTOOD: 2/3 required (67%)', () => {
    const result = evaluate([deux, cafe], required, bonus, 0)
    expect(result.score).toBe('UNDERSTOOD')
    expect(result.tipAmount).toBe(5) // 10 * 0.5 * 1.0
  })

  it('MISSED: 1/3 required (33%)', () => {
    const result = evaluate([oui], required, bonus, 0)
    expect(result.score).toBe('MISSED')
    expect(result.tipAmount).toBe(0)
  })

  it('MISSED: 0/3 required (greeting is not required)', () => {
    const result = evaluate([bonjour], required, bonus, 0)
    expect(result.score).toBe('MISSED')
    expect(result.tipAmount).toBe(0)
  })

  it('MISSED: empty response', () => {
    const result = evaluate([], required, bonus, 0)
    expect(result.score).toBe('MISSED')
    expect(result.tipAmount).toBe(0)
  })

  it('hint level 1 reduces tip by 25%', () => {
    const result = evaluate([oui, deux, cafe, svp], required, bonus, 1)
    expect(result.score).toBe('PERFECT')
    expect(result.tipAmount).toBe(11) // 10 * 1.5 * 0.75 = 11.25 → 11
  })

  it('hint level 2 reduces tip by 50%', () => {
    const result = evaluate([oui, deux, cafe, svp], required, bonus, 2)
    expect(result.score).toBe('PERFECT')
    expect(result.tipAmount).toBe(8) // 10 * 1.5 * 0.5 = 7.5 → 8
  })
})

import { describe, it, expect } from 'vitest'
import { generateWordBank } from '../src/lib/game'
import expressionsData from '../data/expressions.json'
import { Expression } from '../src/lib/types'

const expressions = expressionsData as Expression[]

describe('generateWordBank', () => {
  it('always contains exactly 8 tiles', () => {
    const bank = generateWordBank(['confirmation', 'quantity', 'item'], ['politeness'], expressions)
    expect(bank).toHaveLength(8)
  })

  it('contains at least one word for every required idea', () => {
    const required = ['confirmation', 'quantity', 'item']
    const bank = generateWordBank(required, ['politeness'], expressions)

    const bankTags = new Set(bank.flatMap((e) => e.ideaTags))
    for (const idea of required) {
      expect(bankTags.has(idea)).toBe(true)
    }
  })

  it('has no duplicate words', () => {
    const bank = generateWordBank(['confirmation', 'quantity', 'item'], ['politeness'], expressions)
    const ids = bank.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('is shuffled (not always same order over 10 runs)', () => {
    const results: string[][] = []
    for (let i = 0; i < 10; i++) {
      const bank = generateWordBank(['greeting'], ['politeness'], expressions)
      results.push(bank.map((e) => e.id))
    }
    // At least 2 different orderings in 10 runs
    const unique = new Set(results.map((r) => r.join(',')))
    expect(unique.size).toBeGreaterThan(1)
  })

  it('works with single required idea', () => {
    const bank = generateWordBank(['greeting'], [], expressions)
    expect(bank).toHaveLength(8)
    const bankTags = new Set(bank.flatMap((e) => e.ideaTags))
    expect(bankTags.has('greeting')).toBe(true)
  })

  it('works with multiple required ideas', () => {
    const required = ['greeting', 'confirmation', 'quantity']
    const bank = generateWordBank(required, [], expressions)
    expect(bank).toHaveLength(8)
    const bankTags = new Set(bank.flatMap((e) => e.ideaTags))
    for (const idea of required) {
      expect(bankTags.has(idea)).toBe(true)
    }
  })
})

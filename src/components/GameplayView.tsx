'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Expression, ResolvedExchange, Score, EvaluationResult, DaySummary, PlayerState } from '../lib/types'
import { evaluate } from '../lib/game'
import { updateMastery } from '../lib/state'
import HUD from './HUD'
import CafeScene from './CafeScene'
import Customer from './Customer'

interface GameplayViewProps {
  exchanges: ResolvedExchange[]
  playerState: PlayerState
  onDayEnd: (summary: DaySummary, updatedState: PlayerState) => void
}

const PATIENCE_DURATION = 20_000

type CustomerPhase = 'entering' | 'present' | 'score' | 'exiting'

export default function GameplayView({
  exchanges,
  playerState,
  onDayEnd,
}: GameplayViewProps) {
  const [customerIndex, setCustomerIndex] = useState(0)
  const [selectedWords, setSelectedWords] = useState<Expression[]>([])
  const [responding, setResponding] = useState(true)
  const [customerPhase, setCustomerPhase] = useState<CustomerPhase>('entering')
  const [lastResult, setLastResult] = useState<EvaluationResult | null>(null)
  const [hintLevel, setHintLevel] = useState(0)
  const [patiencePercent, setPatiencePercent] = useState(100)

  // Refs for accumulators (avoid stale closures)
  const accRef = useRef({
    coinsEarned: 0,
    reputationChange: 0,
    scores: { PERFECT: 0, GOOD: 0, UNDERSTOOD: 0, MISSED: 0 } as Record<Score, number>,
    wordsPracticed: new Set<string>(),
    wordsLeveledUp: [] as string[],
    state: playerState,
  })

  const [displayCoins, setDisplayCoins] = useState(playerState.coins)
  const [displayRep, setDisplayRep] = useState(playerState.reputation)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const respondingRef = useRef(true)
  const processingRef = useRef(false)

  const exchange = exchanges[customerIndex]

  // Customer entrance on mount and index change
  useEffect(() => {
    setCustomerPhase('entering')
    const timer = setTimeout(() => {
      setCustomerPhase('present')
      setResponding(true)
      respondingRef.current = true
    }, 450)
    return () => clearTimeout(timer)
  }, [customerIndex])

  // Patience timer
  useEffect(() => {
    if (customerPhase !== 'present' || !responding) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    const start = Date.now()
    setPatiencePercent(100)

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / PATIENCE_DURATION) * 100)
      setPatiencePercent(remaining)

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }, 100)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [customerIndex, customerPhase, responding])

  // Timeout detection
  const exchangeRef = useRef(exchange)
  exchangeRef.current = exchange
  const hintLevelRef = useRef(hintLevel)
  hintLevelRef.current = hintLevel

  const processResult = useCallback(
    (words: Expression[], currentExchange: ResolvedExchange, currentHintLevel: number) => {
      if (processingRef.current) return
      processingRef.current = true
      respondingRef.current = false
      setResponding(false)

      const result = evaluate(
        words,
        currentExchange.requiredIdeas,
        currentExchange.bonusIdeas,
        currentHintLevel
      )

      setLastResult(result)

      // Update accumulators
      const acc = accRef.current
      acc.coinsEarned += result.tipAmount

      let repChange = 0
      if (result.score === 'PERFECT') repChange = 1
      else if (result.score === 'MISSED') repChange = -1
      acc.reputationChange += repChange
      acc.scores[result.score] += 1

      for (const w of words) {
        acc.wordsPracticed.add(w.id)
      }

      const prevState = acc.state
      const newState = updateMastery(
        prevState,
        words,
        currentExchange.requiredIdeas,
        currentExchange.bonusIdeas,
        prevState.currentDay
      )

      for (const w of words) {
        const prevLevel = prevState.vocabulary[w.id]?.masteryLevel ?? 0
        const newLevel = newState.vocabulary[w.id]?.masteryLevel ?? 0
        if (newLevel > prevLevel) {
          acc.wordsLeveledUp.push(w.id)
        }
      }
      acc.state = newState

      setDisplayCoins(newState.coins + acc.coinsEarned)
      setDisplayRep(newState.reputation + acc.reputationChange)

      // Show score phase
      setCustomerPhase('score')

      // After 1.2s, exit customer
      setTimeout(() => {
        setCustomerPhase('exiting')

        // After exit animation, advance
        setTimeout(() => {
          advanceCustomer()
          processingRef.current = false
        }, 400)
      }, 1200)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useEffect(() => {
    if (patiencePercent <= 0 && respondingRef.current && !processingRef.current) {
      processResult([], exchangeRef.current, hintLevelRef.current)
    }
  }, [patiencePercent, processResult])

  function advanceCustomer() {
    const acc = accRef.current
    const totalServed = acc.scores.PERFECT + acc.scores.GOOD + acc.scores.UNDERSTOOD + acc.scores.MISSED

    if (totalServed >= exchanges.length) {
      const dayRepBonus = 2
      const summary: DaySummary = {
        customersServed: exchanges.length,
        totalCustomers: exchanges.length,
        scores: { ...acc.scores },
        coinsEarned: acc.coinsEarned,
        reputationChange: acc.reputationChange + dayRepBonus,
        wordsPracticed: acc.wordsPracticed.size,
        wordsLeveledUp: [...acc.wordsLeveledUp],
      }
      onDayEnd(summary, acc.state)
      return
    }

    setCustomerIndex(totalServed)
    setSelectedWords([])
    setLastResult(null)
    setHintLevel(0)
    setPatiencePercent(100)
  }

  function handleWordTap(word: Expression) {
    if (!responding || customerPhase !== 'present') return
    if (selectedWords.find((w) => w.id === word.id)) return
    setSelectedWords((prev) => [...prev, word])
  }

  function handleChipTap(word: Expression) {
    if (!responding || customerPhase !== 'present') return
    setSelectedWords((prev) => prev.filter((w) => w.id !== word.id))
  }

  function handleSend() {
    if (!responding || customerPhase !== 'present') return
    processResult(selectedWords, exchange, hintLevel)
  }

  function handleHint() {
    if (!responding || customerPhase !== 'present') return
    setHintLevel((prev) => Math.min(prev + 1, 2))
  }

  const usedWordIds = new Set(selectedWords.map((w) => w.id))

  return (
    <>
      <HUD
        day={accRef.current.state.currentDay}
        coins={displayCoins}
        reputation={displayRep}
        customersRemaining={exchanges.length - customerIndex}
        totalCustomers={exchanges.length}
      />

      <CafeScene>
        <Customer
          customerLine={exchange.customerLine}
          patiencePercent={patiencePercent}
          hintLevel={hintLevel}
          hintIdea={exchange.hintIdea}
          hintTranslation={exchange.hintTranslation}
          onHint={handleHint}
          phase={customerPhase}
          scoreResult={lastResult}
          customerKey={customerIndex}
        />
      </CafeScene>

      <div className="response-area">
        <div className="response-bar">
          {selectedWords.length === 0 ? (
            <span className="response-placeholder">Tap words to respond...</span>
          ) : (
            selectedWords.map((word) => (
              <button
                key={word.id}
                className="response-chip"
                onClick={() => handleChipTap(word)}
              >
                {word.text}
              </button>
            ))
          )}
        </div>

        <div className="word-bank">
          {exchange.wordBank.map((word) => (
            <button
              key={word.id}
              className={`word-tile ${usedWordIds.has(word.id) ? 'used' : ''}`}
              onClick={() => handleWordTap(word)}
            >
              {word.text}
            </button>
          ))}
        </div>

        <button className="send-button" onClick={handleSend}>
          Send
        </button>
      </div>
    </>
  )
}

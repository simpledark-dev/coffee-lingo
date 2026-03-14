'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { AnswerChoice, CustomerConversation, ResolvedExchange, Score, EvaluationResult, DaySummary, PlayerState } from '../lib/types'
import { evaluateChoice } from '../lib/game'
import { updateMastery } from '../lib/state'
import HUD from './HUD'
import CafeCanvas from './CafeCanvas'

interface GameplayViewProps {
  conversations: CustomerConversation[]
  playerState: PlayerState
  onDayEnd: (summary: DaySummary, updatedState: PlayerState) => void
}

const PATIENCE_DURATION = 20_000

type CustomerPhase = 'entering' | 'present' | 'score' | 'exiting' | 'idle'

export default function GameplayView({
  conversations,
  playerState,
  onDayEnd,
}: GameplayViewProps) {
  const [customerIndex, setCustomerIndex] = useState(0)
  const [turnIndex, setTurnIndex] = useState(0)
  const [responding, setResponding] = useState(false)
  const [customerPhase, setCustomerPhase] = useState<CustomerPhase>('entering')
  const [lastResult, setLastResult] = useState<EvaluationResult | null>(null)
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)
  const [hintLevel, setHintLevel] = useState(0)
  const [patiencePercent, setPatiencePercent] = useState(100)

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
  const respondingRef = useRef(false)
  const processingRef = useRef(false)

  const conversation = conversations[customerIndex]
  const exchange = conversation?.exchanges[turnIndex]
  const exchangeRef = useRef(exchange)
  exchangeRef.current = exchange
  const hintLevelRef = useRef(hintLevel)
  hintLevelRef.current = hintLevel
  const turnIndexRef = useRef(turnIndex)
  turnIndexRef.current = turnIndex
  const customerIndexRef = useRef(customerIndex)
  customerIndexRef.current = customerIndex

  // Customer entrance
  useEffect(() => {
    setCustomerPhase('entering')
    setTurnIndex(0)
    processingRef.current = false

    const timer = setTimeout(() => {
      setCustomerPhase('present')
      setResponding(true)
      respondingRef.current = true
    }, 1200)

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

      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current)
      }
    }, 100)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [customerIndex, turnIndex, customerPhase, responding])

  const processResult = useCallback(
    (choice: AnswerChoice | null, currentExchange: ResolvedExchange, currentHintLevel: number) => {
      if (processingRef.current) return
      processingRef.current = true
      respondingRef.current = false
      setResponding(false)

      // If no choice (timeout), treat as MISSED
      const result: EvaluationResult = choice
        ? evaluateChoice(choice, currentHintLevel)
        : { score: 'MISSED' as Score, coveredRequired: [], coveredBonus: [], tipAmount: 0 }

      setLastResult(result)

      const words = choice?.expressions ?? []
      const acc = accRef.current
      acc.coinsEarned += result.tipAmount

      let repChange = 0
      if (result.score === 'PERFECT') repChange = 1
      else if (result.score === 'MISSED') repChange = -1
      acc.reputationChange += repChange
      acc.scores[result.score] += 1

      for (const w of words) acc.wordsPracticed.add(w.id)

      const prevState = acc.state
      const newState = updateMastery(
        prevState, words,
        currentExchange.requiredIdeas,
        currentExchange.bonusIdeas,
        prevState.currentDay
      )

      for (const w of words) {
        const prevLevel = prevState.vocabulary[w.id]?.masteryLevel ?? 0
        const newLevel = newState.vocabulary[w.id]?.masteryLevel ?? 0
        if (newLevel > prevLevel) acc.wordsLeveledUp.push(w.id)
      }
      acc.state = newState

      setDisplayCoins(newState.coins + acc.coinsEarned)
      setDisplayRep(newState.reputation + acc.reputationChange)

      setCustomerPhase('score')

      setTimeout(() => {
        advanceTurn()
      }, 1000)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversations]
  )

  // Timeout detection
  useEffect(() => {
    if (patiencePercent <= 0 && respondingRef.current && !processingRef.current) {
      processResult(null, exchangeRef.current, hintLevelRef.current)
    }
  }, [patiencePercent, processResult])

  function advanceTurn() {
    const currentConvo = conversations[customerIndexRef.current]
    const nextTurn = turnIndexRef.current + 1

    if (nextTurn < currentConvo.exchanges.length) {
      setTurnIndex(nextTurn)
      setLastResult(null)
      setSelectedChoiceId(null)
      setHintLevel(0)
      setPatiencePercent(100)
      processingRef.current = false
      setCustomerPhase('present')
      setResponding(true)
      respondingRef.current = true
    } else {
      setCustomerPhase('exiting')
      setTimeout(() => {
        const nextCustomer = customerIndexRef.current + 1
        if (nextCustomer >= conversations.length) {
          endDay()
        } else {
          setCustomerIndex(nextCustomer)
          setLastResult(null)
          setSelectedChoiceId(null)
          setHintLevel(0)
          setPatiencePercent(100)
        }
      }, 800)
    }
  }

  function endDay() {
    const acc = accRef.current
    const summary: DaySummary = {
      customersServed: conversations.length,
      totalCustomers: conversations.length,
      scores: { ...acc.scores },
      coinsEarned: acc.coinsEarned,
      reputationChange: acc.reputationChange + 2,
      wordsPracticed: acc.wordsPracticed.size,
      wordsLeveledUp: [...acc.wordsLeveledUp],
    }
    onDayEnd(summary, acc.state)
  }

  function handleChoiceTap(choice: AnswerChoice) {
    if (!responding || customerPhase !== 'present') return
    setSelectedChoiceId(choice.id)
    processResult(choice, exchange, hintLevel)
  }

  function handleHint() {
    if (!responding || customerPhase !== 'present') return
    setHintLevel((prev) => Math.min(prev + 1, 2))
  }

  if (!exchange) return null

  const totalTurns = conversation.exchanges.length

  return (
    <>
      <HUD
        day={accRef.current.state.currentDay}
        coins={displayCoins}
        reputation={displayRep}
        customersRemaining={conversations.length - customerIndex}
        totalCustomers={conversations.length}
      />

      <CafeCanvas
        customerIndex={customerIndex}
        customerPhase={customerPhase}
        customerLine={exchange.customerLine}
        scoreResult={lastResult}
        patiencePercent={patiencePercent}
        hintLevel={hintLevel}
        hintIdea={exchange.hintIdea}
        hintTranslation={exchange.hintTranslation}
        onHint={handleHint}
      />

      <div className="response-area">
        {totalTurns > 1 && (
          <div className="turn-indicator">Turn {turnIndex + 1} of {totalTurns}</div>
        )}
        <div className="choices-grid">
          {exchange.choices.map((choice) => {
            const isSelected = selectedChoiceId === choice.id
            const showResult = selectedChoiceId !== null
            let resultClass = ''
            if (showResult && isSelected) {
              resultClass = choice.score === 'PERFECT' || choice.score === 'GOOD'
                ? 'choice-correct' : 'choice-wrong'
            }
            // After selection, highlight the best answer
            const isBest = showResult && !isSelected &&
              (choice.score === 'PERFECT' || choice.score === 'GOOD')
            return (
              <button
                key={choice.id}
                className={`choice-button ${isSelected ? 'selected' : ''} ${resultClass} ${isBest ? 'choice-hint' : ''} ${showResult && !isSelected && !isBest ? 'faded' : ''}`}
                onClick={() => handleChoiceTap(choice)}
                disabled={showResult}
              >
                {choice.displayText}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

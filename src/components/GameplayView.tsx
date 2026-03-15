'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  AnswerChoice, CustomerConversation, ResolvedExchange, Score,
  EvaluationResult, DaySummary, PlayerState, CafeState,
} from '../lib/types'
import { evaluateChoice } from '../lib/game'
import { updateMastery } from '../lib/state'
import { createCafeState, tickCafe, startConversation, endConversation, recordResult } from '../lib/cafe-sim'
import HUD from './HUD'
import CafeCanvas from './CafeCanvas'

interface GameplayViewProps {
  conversations: CustomerConversation[]
  playerState: PlayerState
  onDayEnd: (summary: DaySummary, updatedState: PlayerState) => void
}

const PATIENCE_DURATION = 20_000

// Cache French male voice
let cachedVoice: SpeechSynthesisVoice | null = null
let voicesLoaded = false

function loadVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return
  voicesLoaded = true
  // Prefer male French voices (Thomas on macOS, Google français on Chrome)
  const frenchVoices = voices.filter(v => v.lang.startsWith('fr'))
  cachedVoice =
    frenchVoices.find(v => /thomas|male|homme/i.test(v.name)) ??
    frenchVoices.find(v => !/female|femme|amélie|audrey|marie/i.test(v.name)) ??
    frenchVoices[0] ??
    null
}

// Load voices eagerly — some browsers fire this event, others have them ready immediately
if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices()
  window.speechSynthesis.onvoiceschanged = loadVoices
}

function speakFrench(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) { resolve(); return }
    if (!voicesLoaded) loadVoices()
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'fr-FR'
    utterance.rate = 0.85
    if (cachedVoice) utterance.voice = cachedVoice
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    window.speechSynthesis.speak(utterance)
  })
}

export default function GameplayView({
  conversations,
  playerState,
  onDayEnd,
}: GameplayViewProps) {
  // Simulation state (mutable ref, no re-renders on frame updates)
  const cafeStateRef = useRef<CafeState | null>(null)
  const lastFrameRef = useRef(0)

  // React state for UI updates
  const [activeExchange, setActiveExchange] = useState<ResolvedExchange | null>(null)
  const [responding, setResponding] = useState(false)
  const [lastResult, setLastResult] = useState<EvaluationResult | null>(null)
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)
  const [hintLevel, setHintLevel] = useState(0)
  const [patiencePercent, setPatiencePercent] = useState(100)
  const [displayCoins, setDisplayCoins] = useState(playerState.coins)
  const [displayRep, setDisplayRep] = useState(playerState.reputation)
  const [served, setServed] = useState(0)
  const [dayOver, setDayOver] = useState(false)

  // Refs for callback stability
  const respondingRef = useRef(false)
  const processingRef = useRef(false)
  const hintLevelRef = useRef(0)
  const patienceStartRef = useRef(0)
  const patienceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initialize simulation
  useEffect(() => {
    const state = createCafeState(conversations, conversations.length, playerState)
    cafeStateRef.current = state
    lastFrameRef.current = performance.now()
  }, [conversations, playerState])

  // Simulation loop
  useEffect(() => {
    let running = true

    function loop() {
      if (!running) return
      const state = cafeStateRef.current
      if (!state) {
        requestAnimationFrame(loop)
        return
      }

      const now = performance.now()
      const deltaMs = Math.min(now - lastFrameRef.current, 100) // cap at 100ms
      lastFrameRef.current = now

      const result = tickCafe(state, deltaMs)

      if (result.dayOver && !dayOver) {
        setDayOver(true)
        finishDay()
      }

      requestAnimationFrame(loop)
    }

    requestAnimationFrame(loop)
    return () => { running = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayOver])

  // Patience timer for active conversation
  useEffect(() => {
    if (!activeExchange || !responding) {
      if (patienceTimerRef.current) clearInterval(patienceTimerRef.current)
      return
    }

    patienceStartRef.current = Date.now()
    setPatiencePercent(100)

    patienceTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - patienceStartRef.current
      const remaining = Math.max(0, 100 - (elapsed / PATIENCE_DURATION) * 100)
      setPatiencePercent(remaining)

      if (remaining <= 0) {
        if (patienceTimerRef.current) clearInterval(patienceTimerRef.current)
        // Auto-timeout
        if (respondingRef.current && !processingRef.current) {
          processResult(null)
        }
      }
    }, 100)

    return () => {
      if (patienceTimerRef.current) clearInterval(patienceTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExchange, responding])

  const handleCustomerTap = useCallback((customerId: number) => {
    const state = cafeStateRef.current
    if (!state || state.activeConvo) return

    const convo = startConversation(state, customerId)
    if (!convo) return

    const customer = state.customers.find(c => c.id === customerId)
    if (!customer) return

    const exchange = customer.conversation.exchanges[convo.exchangeIndex]
    if (!exchange) return

    setActiveExchange(exchange)
    setLastResult(null)
    setSelectedChoiceId(null)
    setHintLevel(0)
    hintLevelRef.current = 0
    setResponding(true)
    respondingRef.current = true
    processingRef.current = false
    setPatiencePercent(100)
    speakFrench(exchange.customerLine)
  }, [])

  const processResult = useCallback((choice: AnswerChoice | null) => {
    if (processingRef.current) return
    processingRef.current = true
    respondingRef.current = false
    setResponding(false)

    const state = cafeStateRef.current
    if (!state || !state.activeConvo) return

    const customer = state.customers.find(c => c.id === state.activeConvo!.customerId)
    if (!customer) return

    const exchange = customer.conversation.exchanges[state.activeConvo.exchangeIndex]
    if (!exchange) return

    const result: EvaluationResult = choice
      ? evaluateChoice(choice, hintLevelRef.current)
      : { score: 'MISSED' as Score, coveredRequired: [], coveredBonus: [], tipAmount: 0 }

    setLastResult(result)

    // Record into accumulator
    recordResult(state, result.score, result.tipAmount)

    // Update mastery
    const words = choice?.expressions ?? []
    const acc = state.dayAccumulator
    for (const w of words) acc.wordsPracticed.add(w.id)

    const prevState = acc.playerState
    const newState = updateMastery(
      prevState, words,
      exchange.requiredIdeas, exchange.bonusIdeas,
      prevState.currentDay
    )

    for (const w of words) {
      const prevLevel = prevState.vocabulary[w.id]?.masteryLevel ?? 0
      const newLevel = newState.vocabulary[w.id]?.masteryLevel ?? 0
      if (newLevel > prevLevel) acc.wordsLeveledUp.push(w.id)
    }
    acc.playerState = newState

    setDisplayCoins(newState.coins + acc.coinsEarned)
    setDisplayRep(newState.reputation + acc.reputationChange)
    setServed(acc.customersServed)

    // Show score briefly, then advance to next exchange or end conversation
    setTimeout(() => {
      const nextIndex = state.activeConvo!.exchangeIndex + 1
      const nextExchange = customer.conversation.exchanges[nextIndex]

      if (nextExchange) {
        // Advance to next exchange in same conversation
        state.activeConvo!.exchangeIndex = nextIndex
        customer.nextExchangeIndex = nextIndex
        setActiveExchange(nextExchange)
        setLastResult(null)
        setSelectedChoiceId(null)
        setHintLevel(0)
        hintLevelRef.current = 0
        setResponding(true)
        respondingRef.current = true
        processingRef.current = false
        setPatiencePercent(100)
        speakFrench(nextExchange.customerLine)
      } else {
        // No more exchanges — end conversation
        endConversation(state)
        setActiveExchange(null)
        setLastResult(null)
        setSelectedChoiceId(null)
        processingRef.current = false
      }
    }, 1000)
  }, [])

  function finishDay() {
    const state = cafeStateRef.current
    if (!state) return

    const acc = state.dayAccumulator
    const summary: DaySummary = {
      customersServed: acc.customersServed,
      totalCustomers: state.maxToSpawn,
      scores: { ...acc.scores },
      coinsEarned: acc.coinsEarned,
      reputationChange: acc.reputationChange + 2,
      wordsPracticed: acc.wordsPracticed.size,
      wordsLeveledUp: [...acc.wordsLeveledUp],
    }
    onDayEnd(summary, acc.playerState)
  }

  function handleChoiceTap(choice: AnswerChoice) {
    if (!responding || processingRef.current) return
    setSelectedChoiceId(choice.id)
    setResponding(false)
    respondingRef.current = false
    processingRef.current = true
    // Speak the answer, then process result after TTS finishes
    speakFrench(choice.displayText).then(() => {
      processingRef.current = false // allow processResult to proceed
      processResult(choice)
    })
  }

  function handleHint() {
    if (!responding) return
    setHintLevel(prev => {
      const next = Math.min(prev + 1, 2)
      hintLevelRef.current = next
      return next
    })
  }

  // Get active customer's screen position for speech bubble
  const getActiveCustomerScreenPos = () => {
    const state = cafeStateRef.current
    if (!state?.activeConvo) return null
    const customer = state.customers.find(c => c.id === state.activeConvo!.customerId)
    if (!customer) return null
    return customer.worldPos
  }

  return (
    <>
      <HUD
        day={playerState.currentDay}
        coins={displayCoins}
        reputation={displayRep}
        customersRemaining={conversations.length - served}
        totalCustomers={conversations.length}
      />

      <CafeCanvas
        cafeStateRef={cafeStateRef}
        onCustomerTap={handleCustomerTap}
      />

      {/* Conversation overlay */}
      {activeExchange && (
        <>
          {/* Speech bubble - fixed position over canvas */}
          <div style={styles.speechOverlay}>
            <div style={styles.speechBubble}>
              <div style={styles.speechText}>{activeExchange.customerLine}</div>
              {hintLevel >= 1 && <div style={styles.hintText}>{activeExchange.hintIdea}</div>}
              {hintLevel >= 2 && <div style={styles.hintTranslation}>{activeExchange.hintTranslation}</div>}
            </div>

            {/* Patience bar */}
            <div style={styles.patienceContainer}>
              <div style={{
                ...styles.patienceBar,
                width: `${patiencePercent}%`,
                background: patiencePercent > 40 ? '#4CAF50' : patiencePercent > 15 ? '#FF9800' : '#F44336',
              }} />
            </div>

            {/* Hint button */}
            <button style={styles.hintButton} onClick={handleHint}>?</button>

            {/* Score display */}
            {lastResult && (
              <div style={styles.scoreContainer}>
                <div style={{ ...styles.scoreText, color: SCORE_COLORS[lastResult.score] }}>
                  {lastResult.score}
                </div>
                {lastResult.tipAmount > 0 && (
                  <div style={styles.tipText}>+{lastResult.tipAmount} coins</div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Choice buttons */}
      {activeExchange && (
        <div className="response-area">
          <div className="choices-grid">
            {activeExchange.choices.map((choice) => {
              const isSelected = selectedChoiceId === choice.id
              const showResult = selectedChoiceId !== null
              let resultClass = ''
              if (showResult && isSelected) {
                resultClass = choice.score === 'PERFECT' || choice.score === 'GOOD'
                  ? 'choice-correct' : 'choice-wrong'
              }
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
      )}
    </>
  )
}

const SCORE_COLORS: Record<Score, string> = {
  PERFECT: '#FFD700',
  GOOD: '#4CAF50',
  UNDERSTOOD: '#9E9E9E',
  MISSED: '#F44336',
}

const styles: Record<string, React.CSSProperties> = {
  speechOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 10,
  },
  speechBubble: {
    position: 'absolute',
    top: '15%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#FFFEF7',
    borderRadius: 12,
    padding: '10px 16px',
    minWidth: 160,
    maxWidth: 280,
    boxShadow: '0 3px 12px rgba(0,0,0,0.25)',
    textAlign: 'center',
    pointerEvents: 'auto',
    border: '2px solid #5D4037',
  },
  speechText: {
    fontSize: 16,
    fontWeight: 600,
    color: '#2C1810',
    lineHeight: 1.4,
  },
  hintText: {
    marginTop: 6,
    fontSize: 12,
    color: '#8B6F47',
    fontStyle: 'italic',
    borderTop: '1px solid rgba(139,111,71,0.2)',
    paddingTop: 4,
  },
  hintTranslation: {
    marginTop: 2,
    fontSize: 12,
    color: '#A0845C',
    fontStyle: 'italic',
  },
  patienceContainer: {
    position: 'absolute',
    top: '12%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 100,
    height: 6,
    background: 'rgba(0,0,0,0.4)',
    borderRadius: 3,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  patienceBar: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.5s linear, background 0.3s',
  },
  hintButton: {
    position: 'absolute',
    top: '16%',
    right: '8%',
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.5)',
    background: 'rgba(93,64,55,0.85)',
    color: '#FFEFD5',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
  },
  scoreContainer: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: 800,
    textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.3)',
    textTransform: 'uppercase',
  },
  tipText: {
    fontSize: 16,
    fontWeight: 600,
    color: '#FFD700',
    textShadow: '0 1px 4px rgba(0,0,0,0.6)',
  },
}

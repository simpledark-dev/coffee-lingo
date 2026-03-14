'use client'

import { useState, useEffect } from 'react'
import { PlayerState, CustomerConversation, DaySummary, Expression, DialogueTemplate } from '../src/lib/types'
import { generateConversations } from '../src/lib/game'
import { createInitialState, loadState, saveState } from '../src/lib/state'
import DayStartView from '../src/components/DayStartView'
import GameplayView from '../src/components/GameplayView'
import SummaryView from '../src/components/SummaryView'
import expressionsData from '../data/expressions.json'
import templatesData from '../data/templates.json'

const expressions = expressionsData as Expression[]
const templates = templatesData as DialogueTemplate[]

type GamePhase = 'dayStart' | 'gameplay' | 'summary'

export default function Home() {
  const [phase, setPhase] = useState<GamePhase>('dayStart')
  const [playerState, setPlayerState] = useState<PlayerState | null>(null)
  const [dayConversations, setDayConversations] = useState<CustomerConversation[]>([])
  const [daySummary, setDaySummary] = useState<DaySummary | null>(null)

  // Load state on mount
  useEffect(() => {
    const saved = loadState()
    setPlayerState(saved ?? createInitialState(expressions))
  }, [])

  if (!playerState) {
    return (
      <div id="game-container">
        <div className="day-start">
          <div className="day-subtitle">Loading...</div>
        </div>
      </div>
    )
  }

  function handleOpenShop() {
    if (!playerState) return
    const convos = generateConversations(
      templates,
      expressions,
      playerState.vocabulary,
      playerState.recencyBuffer
    )
    setDayConversations(convos)
    setPhase('gameplay')
  }

  function handleDayEnd(summary: DaySummary, updatedState: PlayerState) {
    // Update recency buffer with template IDs from this day
    const usedTemplateIds = dayConversations.flatMap((c) => c.exchanges.map((e) => e.templateId))
    const newRecencyBuffer = [...usedTemplateIds.slice(-3)]

    // Apply day-end bonuses
    const finalState: PlayerState = {
      ...updatedState,
      coins: updatedState.coins + summary.coinsEarned,
      reputation: updatedState.reputation + summary.reputationChange,
      currentDay: updatedState.currentDay + 1,
      recencyBuffer: newRecencyBuffer,
    }

    setPlayerState(finalState)
    setDaySummary(summary)
    setPhase('summary')
  }

  function handleContinue() {
    if (!playerState) return
    saveState(playerState)
    setDaySummary(null)
    setPhase('dayStart')
  }

  return (
    <div id="game-container">
      {phase === 'dayStart' && (
        <DayStartView day={playerState.currentDay} onOpenShop={handleOpenShop} />
      )}
      {phase === 'gameplay' && (
        <GameplayView
          conversations={dayConversations}
          playerState={playerState}
          onDayEnd={handleDayEnd}
        />
      )}
      {phase === 'summary' && daySummary && (
        <SummaryView
          day={playerState.currentDay - 1}
          summary={daySummary}
          onContinue={handleContinue}
        />
      )}
    </div>
  )
}

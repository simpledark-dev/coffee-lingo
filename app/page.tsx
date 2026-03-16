'use client'

import { useState, useEffect } from 'react'
import { PlayerState, CustomerConversation, DaySummary, Expression, DialogueTemplate } from '../src/lib/types'
import { generateConversations } from '../src/lib/game'
import { createInitialState, loadState, saveState } from '../src/lib/state'
import { installUpgrade } from '../src/lib/upgrades'
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
  const [readyToInstallIds, setReadyToInstallIds] = useState<string[]>([])

  // Load state on mount
  useEffect(() => {
    const result = loadState()
    if (result) {
      setPlayerState(result.state)
      if (result.readyToInstall.length > 0) {
        setReadyToInstallIds(result.readyToInstall)
      }
    } else {
      setPlayerState(createInitialState(expressions))
    }
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
    const usedTemplateIds = dayConversations.flatMap((c) => c.exchanges.map((e) => e.templateId))
    const newRecencyBuffer = [...usedTemplateIds.slice(-3)]

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

  function handlePurchase(upgradeId: string, tier: number, cost: number, durationMs: number) {
    setPlayerState((prev) => {
      if (!prev || prev.coins < cost) return prev
      const currentUpgrade = prev.upgrades?.[upgradeId]
      const updated: PlayerState = {
        ...prev,
        coins: prev.coins - cost,
        upgrades: {
          ...(prev.upgrades ?? {}),
          [upgradeId]: {
            tier: currentUpgrade?.tier ?? 0,
            upgrading: {
              toTier: tier,
              startedAt: Date.now(),
              durationMs,
            },
          },
        },
      }
      saveState(updated)
      return updated
    })
  }

  function handleDebugSet(field: 'coins' | 'reputation', value: number) {
    setPlayerState((prev) => {
      if (!prev) return prev
      const updated = { ...prev, [field]: value }
      saveState(updated)
      return updated
    })
  }

  function handleFinishUpgrade(upgradeId: string) {
    setPlayerState((prev) => {
      if (!prev?.upgrades?.[upgradeId]?.upgrading) return prev
      const level = prev.upgrades[upgradeId]
      const updated: PlayerState = {
        ...prev,
        upgrades: {
          ...prev.upgrades,
          [upgradeId]: { ...level, upgrading: { ...level.upgrading!, startedAt: 0, durationMs: 0 } },
        },
      }
      saveState(updated)
      return updated
    })
  }

  function handleReset() {
    const fresh = createInitialState(expressions)
    setPlayerState(fresh)
    setReadyToInstallIds([])
    saveState(fresh)
  }

  function handleInstall(upgradeId: string) {
    setPlayerState((prev) => {
      if (!prev?.upgrades) return prev
      const updated = installUpgrade(prev.upgrades, upgradeId)
      const newState = { ...prev, upgrades: updated }
      saveState(newState)
      return newState
    })
    // Remove from ready list
    setReadyToInstallIds((prev) => prev.filter((id) => id !== upgradeId))
  }

  return (
    <div id="game-container">
      {phase === 'dayStart' && (
        <DayStartView
          day={playerState.currentDay}
          coins={playerState.coins}
          playerState={playerState}
          readyToInstallIds={readyToInstallIds}
          onOpenShop={handleOpenShop}
          onPurchase={handlePurchase}
          onInstall={handleInstall}
          onDebugSet={handleDebugSet}
          onReset={handleReset}
          onFinishUpgrade={handleFinishUpgrade}
        />
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

'use client'

import { useState, useEffect, useMemo } from 'react'
import { PlayerState, Expression } from '../src/lib/types'
import { createInitialState, loadState, saveState } from '../src/lib/state'
import { installUpgrade, getUpgradeBonuses, getReadyToInstallIds, getUpgradeTimeRemaining } from '../src/lib/upgrades'
import { getFurnishingBonuses } from '../src/lib/furnishing'
import { FRIENDSHIP_GAIN } from '../src/lib/characters'
import GameplayView from '../src/components/GameplayView'
import expressionsData from '../data/expressions.json'

const expressions = expressionsData as Expression[]

export default function Home() {
  const [playerState, setPlayerState] = useState<PlayerState | null>(null)
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

  const furnishingBonuses = useMemo(
    () => getFurnishingBonuses(playerState?.placedFurnishings ?? {}, playerState?.furnishingUpgrades),
    [playerState?.placedFurnishings, playerState?.furnishingUpgrades]
  )
  const bonuses = useMemo(
    () => getUpgradeBonuses(playerState?.upgrades, furnishingBonuses),
    [playerState?.upgrades, furnishingBonuses]
  )

  if (!playerState) {
    return (
      <div id="game-container">
        <div className="day-start">
          <div className="day-subtitle">Loading...</div>
        </div>
      </div>
    )
  }

  function handleStateUpdate(updates: Partial<PlayerState>) {
    setPlayerState((prev) => {
      if (!prev) return prev
      const updated = { ...prev, ...updates }
      saveState(updated)
      return updated
    })
  }

  function handleFriendshipGain(characterId: string, score: string) {
    setPlayerState((prev) => {
      if (!prev) return prev
      const gain = FRIENDSHIP_GAIN[score] ?? 0
      if (gain === 0) return prev
      const rels = { ...(prev.relationships ?? {}) }
      const existing = rels[characterId] ?? { friendship: 0, timesServed: 0, lastSeenAt: prev.totalCustomersServed }
      rels[characterId] = {
        friendship: Math.min(100, existing.friendship + gain),
        timesServed: existing.timesServed + 1,
        lastSeenAt: prev.totalCustomersServed,
      }
      const updated = { ...prev, relationships: rels }
      saveState(updated)
      return updated
    })
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

  function handleInstall(upgradeId: string) {
    setPlayerState((prev) => {
      if (!prev?.upgrades) return prev
      const updated = installUpgrade(prev.upgrades, upgradeId)
      const newState = { ...prev, upgrades: updated }
      saveState(newState)
      return newState
    })
    setReadyToInstallIds((prev) => prev.filter((id) => id !== upgradeId))
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

  function handleFurnishingPurchase(itemId: string, tier: number, cost: number, durationMs: number) {
    setPlayerState((prev) => {
      if (!prev || prev.coins < cost) return prev
      const currentLevel = prev.furnishingUpgrades?.[itemId]
      const updated: PlayerState = {
        ...prev,
        coins: prev.coins - cost,
        furnishingUpgrades: {
          ...(prev.furnishingUpgrades ?? {}),
          [itemId]: {
            tier: currentLevel?.tier ?? 0,
            upgrading: { toTier: tier, startedAt: Date.now(), durationMs },
          },
        },
      }
      saveState(updated)
      return updated
    })
  }

  function handleFurnishingInstall(itemId: string) {
    setPlayerState((prev) => {
      if (!prev?.furnishingUpgrades?.[itemId]) return prev
      const level = prev.furnishingUpgrades[itemId]
      if (!level.upgrading || getUpgradeTimeRemaining(level) > 0) return prev
      const updated: PlayerState = {
        ...prev,
        furnishingUpgrades: {
          ...prev.furnishingUpgrades,
          [itemId]: { tier: level.upgrading.toTier },
        },
      }
      saveState(updated)
      return updated
    })
    setReadyToInstallIds((prev) => prev.filter((id) => id !== itemId))
  }

  function handleFurnishingFinish(itemId: string) {
    setPlayerState((prev) => {
      if (!prev?.furnishingUpgrades?.[itemId]?.upgrading) return prev
      const level = prev.furnishingUpgrades[itemId]
      const updated: PlayerState = {
        ...prev,
        furnishingUpgrades: {
          ...prev.furnishingUpgrades,
          [itemId]: { ...level, upgrading: { ...level.upgrading!, startedAt: 0, durationMs: 0 } },
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

  function handleReset() {
    const fresh = createInitialState(expressions)
    setPlayerState(fresh)
    setReadyToInstallIds([])
    saveState(fresh)
    // Mark all migrations as done so they don't auto-place furnishings
    localStorage.setItem('coffee-lingo-m1', '1')
    localStorage.setItem('coffee-lingo-m2', '1')
    localStorage.setItem('coffee-lingo-m3', '1')
    localStorage.setItem('coffee-lingo-m4', '1')
  }

  return (
    <div id="game-container">
      <GameplayView
        expressions={expressions}
        playerState={playerState}
        bonuses={bonuses}
        readyToInstallIds={readyToInstallIds}
        onStateUpdate={handleStateUpdate}
        onFriendshipGain={handleFriendshipGain}
        onPurchase={handlePurchase}
        onInstall={handleInstall}
        onFinishUpgrade={handleFinishUpgrade}
        onFurnishingPurchase={handleFurnishingPurchase}
        onFurnishingInstall={handleFurnishingInstall}
        onFurnishingFinish={handleFurnishingFinish}
        onDebugSet={handleDebugSet}
        onReset={handleReset}
      />
    </div>
  )
}

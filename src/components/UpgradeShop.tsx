'use client'

import { useState, useEffect } from 'react'
import type { PlayerState, FurnishingItem, GridPos, UpgradeLevel } from '../lib/types'
import {
  UPGRADE_CATALOG,
  INFRASTRUCTURE_IDS,
  TILE_TO_UPGRADE_ID,
  getUpgradeCatalogEntry,
  getUpgradeTimeRemaining,
  formatTimeRemaining,
  type UpgradeCatalogEntry,
} from '../lib/upgrades'
import { PALETTE, SPRITE_MAP } from '../lib/sprites'
import { playUpgradeStartSound, playInstallSound } from './GameplayView'
import { PATIO_UNLOCK_REP, PATIO_UNLOCK_COST } from '../lib/tilemap'
import { PATIO_FURNISHINGS, READING_ROOM_FURNISHINGS, CAFE_ROOM_FURNISHINGS, ALL_FURNISHINGS } from '../lib/furnishing'

interface UpgradeShopProps {
  playerState: PlayerState
  onPurchase: (upgradeId: string, tier: number, cost: number, durationMs: number) => void
  onInstall: (upgradeId: string) => void
  onFinishUpgrade: (upgradeId: string) => void
  onClose: () => void
  patioUnlocked: boolean
  onPatioUnlock: () => void
  placedFurnishings: Record<string, GridPos>
  onFurnishingBuy: (item: FurnishingItem) => void
  furnishingUpgrades: Record<string, UpgradeLevel>
  onFurnishingPurchase: (itemId: string, tier: number, cost: number, durationMs: number) => void
  onFurnishingInstall: (itemId: string) => void
  onFurnishingFinish: (itemId: string) => void
}

// Render a sprite to a data URL for preview
function spriteToDataURL(spriteKey: string, size: number): string {
  const sprite = SPRITE_MAP[spriteKey]
  if (!sprite) return ''
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const scale = size / 32
  const s = Math.ceil(scale)
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const idx = sprite[row][col]
      if (idx === 0) continue
      ctx.fillStyle = PALETTE[idx]
      ctx.fillRect(col * scale, row * scale, s, s)
    }
  }
  return canvas.toDataURL()
}

// Infrastructure catalog entries only (Floor, Coffee Machine, Counter)
const INFRA_CATALOG = UPGRADE_CATALOG.filter(e => INFRASTRUCTURE_IDS.includes(e.id))

export default function UpgradeShop({
  playerState, onPurchase, onInstall, onFinishUpgrade, onClose,
  patioUnlocked, onPatioUnlock, placedFurnishings, onFurnishingBuy,
  furnishingUpgrades, onFurnishingPurchase, onFurnishingInstall, onFurnishingFinish,
}: UpgradeShopProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const [activeTab, setActiveTab] = useState<string>('cafe')
  const upgrades = playerState.upgrades ?? {}

  // Tick every second to update countdowns
  useEffect(() => {
    const hasActive = Object.values(upgrades).some(u => u.upgrading)
      || Object.values(furnishingUpgrades).some(u => u.upgrading)
    if (!hasActive) return
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [upgrades, furnishingUpgrades])

  // --- Infrastructure upgrade helpers ---
  function getItemState(entry: UpgradeCatalogEntry): 'available' | 'upgrading' | 'ready' | 'maxed' {
    const level = upgrades[entry.id]
    if (level?.upgrading) {
      return getUpgradeTimeRemaining(level) === 0 ? 'ready' : 'upgrading'
    }
    const currentTier = level?.tier ?? 0
    if (currentTier >= entry.tiers.length) return 'maxed'
    return 'available'
  }

  function getCurrentTier(entry: UpgradeCatalogEntry): number {
    return upgrades[entry.id]?.tier ?? 0
  }

  function getNextTier(entry: UpgradeCatalogEntry) {
    const current = getCurrentTier(entry)
    return entry.tiers.find(t => t.tier === current + 1)
  }

  function getCurrentSpriteKey(entry: UpgradeCatalogEntry): string {
    const current = getCurrentTier(entry)
    if (current === 0) return entry.defaultSpriteKey
    const tierData = entry.tiers.find(t => t.tier === current)
    return tierData?.spriteKey ?? entry.defaultSpriteKey
  }

  // --- Per-item furnishing upgrade helpers ---
  function getFurnItemState(itemId: string): 'available' | 'upgrading' | 'ready' | 'maxed' | null {
    const item = ALL_FURNISHINGS.find(f => f.id === itemId)
    if (!item) return null
    const catalogId = TILE_TO_UPGRADE_ID[item.tileId]
    if (!catalogId) return null // not upgradable
    const catalog = getUpgradeCatalogEntry(catalogId)
    if (!catalog) return null
    const level = furnishingUpgrades[itemId]
    if (level?.upgrading) {
      return getUpgradeTimeRemaining(level) === 0 ? 'ready' : 'upgrading'
    }
    const currentTier = level?.tier ?? 0
    if (currentTier >= catalog.tiers.length) return 'maxed'
    return 'available'
  }

  function getFurnCurrentSpriteKey(itemId: string, item: FurnishingItem): string {
    const tier = furnishingUpgrades[itemId]?.tier ?? 0
    if (tier === 0) return item.spriteKey
    const catalogId = TILE_TO_UPGRADE_ID[item.tileId]
    if (!catalogId) return item.spriteKey
    const catalog = getUpgradeCatalogEntry(catalogId)
    const tierData = catalog?.tiers.find(t => t.tier === tier)
    return tierData?.spriteKey ?? item.spriteKey
  }

  const tabs = [
    { id: 'cafe', label: 'Café', items: CAFE_ROOM_FURNISHINGS },
    { id: 'reading', label: 'Reading', items: READING_ROOM_FURNISHINGS },
    ...(patioUnlocked ? [{ id: 'patio', label: 'Patio', items: PATIO_FURNISHINGS }] : []),
    { id: 'infra', label: 'Infra', items: [] as FurnishingItem[] },
  ]

  const activeItems = tabs.find(t => t.id === activeTab)?.items ?? []

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.title}>Upgrades</span>
          <span style={styles.coins}>{Math.round(playerState.coins)} coins</span>
          <button style={styles.closeBtn} onClick={onClose}>X</button>
        </div>

        {/* Tabs */}
        <div style={styles.tabBar}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {}),
              }}
              onClick={() => { setActiveTab(tab.id); setExpandedId(null) }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable list */}
        <div style={styles.list}>
          {/* Infrastructure upgrades (only on infra tab) */}
          {activeTab === 'infra' && (<>
          {INFRA_CATALOG.map(entry => {
            const state = getItemState(entry)
            const currentTier = getCurrentTier(entry)
            const nextTier = getNextTier(entry)
            const isExpanded = expandedId === entry.id
            const level = upgrades[entry.id]

            return (
              <div
                key={entry.id}
                style={styles.card}
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              >
                <div style={styles.cardHeader}>
                  <img
                    src={spriteToDataURL(getCurrentSpriteKey(entry), 48)}
                    width={48} height={48} alt={entry.displayName}
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div style={styles.cardInfo}>
                    <div style={styles.cardName}>{entry.displayName}</div>
                    <div style={styles.tierDots}>
                      {Array.from({ length: entry.tiers.length + 1 }, (_, i) => (
                        <span key={i} style={{ ...styles.dot, backgroundColor: i <= currentTier ? '#FFD54F' : '#5D4037' }} />
                      ))}
                    </div>
                  </div>
                  {state === 'maxed' && <span style={styles.maxBadge}>MAX</span>}
                  {state === 'ready' && <span style={styles.readyBadge}>Ready!</span>}
                  {state === 'upgrading' && level?.upgrading && (
                    <span style={styles.timerBadge}>{formatTimeRemaining(getUpgradeTimeRemaining(level))}</span>
                  )}
                </div>

                {isExpanded && state === 'available' && nextTier && (
                  <div style={styles.expandedSection}>
                    <div style={styles.comparison}>
                      <div style={styles.compareItem}>
                        <img src={spriteToDataURL(getCurrentSpriteKey(entry), 64)} width={64} height={64} alt="Current" style={{ imageRendering: 'pixelated' }} />
                        <div style={styles.compareLabel}>Current</div>
                      </div>
                      <div style={styles.arrow}>→</div>
                      <div style={styles.compareItem}>
                        <img src={spriteToDataURL(nextTier.spriteKey, 64)} width={64} height={64} alt={nextTier.name} style={{ imageRendering: 'pixelated' }} />
                        <div style={styles.compareLabel}>{nextTier.name}</div>
                      </div>
                    </div>
                    <div style={styles.description}>{nextTier.description}</div>
                    <div style={styles.bonusText}>{nextTier.bonusDescription}</div>
                    <div style={styles.timerInfo}>Build time: {formatTimeRemaining(nextTier.durationMs)}</div>
                    {playerState.reputation < nextTier.requiredReputation ? (
                      <div style={styles.repLocked}>
                        Requires {nextTier.requiredReputation} reputation (you have {playerState.reputation})
                      </div>
                    ) : (
                      <button
                        style={{ ...styles.buyBtn, opacity: playerState.coins >= nextTier.cost ? 1 : 0.4 }}
                        disabled={playerState.coins < nextTier.cost}
                        onClick={e => { e.stopPropagation(); playUpgradeStartSound(); onPurchase(entry.id, nextTier.tier, nextTier.cost, nextTier.durationMs); setExpandedId(null) }}
                      >
                        Buy — {nextTier.cost} coins
                      </button>
                    )}
                  </div>
                )}

                {isExpanded && state === 'upgrading' && level?.upgrading && (
                  <div style={styles.expandedSection}>
                    <div style={styles.comparison}>
                      <div style={styles.compareItem}>
                        <img src={spriteToDataURL(getCurrentSpriteKey(entry), 64)} width={64} height={64} alt="Current" style={{ imageRendering: 'pixelated' }} />
                      </div>
                      <div style={styles.arrow}>→</div>
                      <div style={styles.compareItem}>
                        {(() => {
                          const toTierData = entry.tiers.find(t => t.tier === level.upgrading!.toTier)
                          return toTierData ? <img src={spriteToDataURL(toTierData.spriteKey, 64)} width={64} height={64} alt={toTierData.name} style={{ imageRendering: 'pixelated', opacity: 0.5 }} /> : null
                        })()}
                      </div>
                    </div>
                    <div style={styles.progressContainer}>
                      <div style={{ ...styles.progressBar, width: `${Math.min(100, ((Date.now() - level.upgrading.startedAt) / level.upgrading.durationMs) * 100)}%` }} />
                    </div>
                    <div style={styles.timerText}>{formatTimeRemaining(getUpgradeTimeRemaining(level))}</div>
                    <button style={styles.finishBtn} onClick={e => { e.stopPropagation(); onFinishUpgrade(entry.id) }}>⏩ Finish Now</button>
                  </div>
                )}

                {isExpanded && state === 'ready' && level?.upgrading && (
                  <div style={styles.expandedSection}>
                    {(() => {
                      const toTierData = entry.tiers.find(t => t.tier === level.upgrading!.toTier)
                      return toTierData ? (
                        <>
                          <img src={spriteToDataURL(toTierData.spriteKey, 80)} width={80} height={80} alt={toTierData.name} style={{ imageRendering: 'pixelated', display: 'block', margin: '0 auto' }} />
                          <div style={{ textAlign: 'center', color: '#FFEFD5', marginTop: 8, fontWeight: 600 }}>{toTierData.name}</div>
                        </>
                      ) : null
                    })()}
                    <button style={styles.installBtn} onClick={e => { e.stopPropagation(); playInstallSound(); onInstall(entry.id) }}>Install</button>
                  </div>
                )}

                {isExpanded && state === 'maxed' && (
                  <div style={styles.expandedSection}>
                    <img src={spriteToDataURL(getCurrentSpriteKey(entry), 80)} width={80} height={80} alt={entry.displayName} style={{ imageRendering: 'pixelated', display: 'block', margin: '0 auto' }} />
                    <div style={{ textAlign: 'center', color: '#FFD54F', marginTop: 8 }}>Fully upgraded!</div>
                  </div>
                )}
              </div>
            )
          })}

          </>)}

          {/* Patio room unlock (shown on infra tab when patio not unlocked) */}
          {activeTab === 'infra' && !patioUnlocked && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🌿</div>
                <div style={styles.cardInfo}>
                  <div style={styles.cardName}>Patio Terrace</div>
                  <div style={{ fontSize: 12, color: '#BCAAA4', marginTop: 2 }}>A cozy outdoor area with bistro seating</div>
                </div>
                {playerState.reputation < PATIO_UNLOCK_REP && <span style={styles.timerBadge}>🔒</span>}
              </div>
              <div style={{ marginTop: 10 }}>
                {playerState.reputation < PATIO_UNLOCK_REP ? (
                  <div style={styles.repLocked}>Requires {PATIO_UNLOCK_REP} reputation (you have {Math.round(playerState.reputation)})</div>
                ) : (
                  <button
                    style={{ ...styles.buyBtn, opacity: playerState.coins >= PATIO_UNLOCK_COST ? 1 : 0.4 }}
                    disabled={playerState.coins < PATIO_UNLOCK_COST}
                    onClick={e => { e.stopPropagation(); onPatioUnlock() }}
                  >
                    Unlock — {PATIO_UNLOCK_COST} coins
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Room furnishing items for active tab */}
          {activeTab !== 'infra' && activeItems.map(item => {
                  const isPlaced = !!placedFurnishings[item.id]
                  const isExpanded = expandedId === `furn_${item.id}`
                  const catalogId = TILE_TO_UPGRADE_ID[item.tileId]
                  const catalog = catalogId ? getUpgradeCatalogEntry(catalogId) : undefined
                  const level = furnishingUpgrades[item.id]
                  const currentTier = level?.tier ?? 0
                  const nextTier = catalog?.tiers.find(t => t.tier === currentTier + 1)
                  const itemState = isPlaced ? getFurnItemState(item.id) : null

                  return (
                    <div
                      key={item.id}
                      style={{ ...styles.card, marginTop: 8 }}
                      onClick={() => isPlaced && setExpandedId(isExpanded ? null : `furn_${item.id}`)}
                    >
                      <div style={styles.cardHeader}>
                        <img
                          src={spriteToDataURL(isPlaced ? getFurnCurrentSpriteKey(item.id, item) : item.spriteKey, 48)}
                          width={48} height={48} alt={item.name}
                          style={{ imageRendering: 'pixelated' }}
                        />
                        <div style={styles.cardInfo}>
                          <div style={styles.cardName}>{item.name}</div>
                          {!isPlaced && (
                            <>
                              <div style={{ fontSize: 12, color: '#BCAAA4', marginTop: 2 }}>{item.description}</div>
                              <div style={{ fontSize: 11, color: '#FFD54F', marginTop: 2, fontWeight: 600 }}>{item.bonus.description}</div>
                            </>
                          )}
                          {isPlaced && catalog && (
                            <div style={styles.tierDots}>
                              {Array.from({ length: catalog.tiers.length + 1 }, (_, i) => (
                                <span key={i} style={{ ...styles.dot, backgroundColor: i <= currentTier ? '#FFD54F' : '#5D4037' }} />
                              ))}
                            </div>
                          )}
                        </div>
                        {!isPlaced && (
                          <button
                            style={{ ...styles.smallBuyBtn, opacity: playerState.coins >= item.cost ? 1 : 0.4 }}
                            disabled={playerState.coins < item.cost}
                            onClick={e => { e.stopPropagation(); onFurnishingBuy(item) }}
                          >
                            Buy — {item.cost}
                          </button>
                        )}
                        {isPlaced && itemState === 'maxed' && <span style={styles.maxBadge}>MAX</span>}
                        {isPlaced && itemState === 'ready' && <span style={styles.readyBadge}>Ready!</span>}
                        {isPlaced && itemState === 'upgrading' && level?.upgrading && (
                          <span style={styles.timerBadge}>{formatTimeRemaining(getUpgradeTimeRemaining(level))}</span>
                        )}
                        {isPlaced && itemState === 'available' && !catalog && <span style={styles.placedBadge}>Placed</span>}
                      </div>

                      {/* Upgrade UI for placed items */}
                      {isPlaced && isExpanded && itemState === 'available' && nextTier && catalog && (
                        <div style={styles.expandedSection}>
                          <div style={styles.comparison}>
                            <div style={styles.compareItem}>
                              <img src={spriteToDataURL(getFurnCurrentSpriteKey(item.id, item), 64)} width={64} height={64} alt="Current" style={{ imageRendering: 'pixelated' }} />
                              <div style={styles.compareLabel}>Current</div>
                            </div>
                            <div style={styles.arrow}>→</div>
                            <div style={styles.compareItem}>
                              <img src={spriteToDataURL(nextTier.spriteKey, 64)} width={64} height={64} alt={nextTier.name} style={{ imageRendering: 'pixelated' }} />
                              <div style={styles.compareLabel}>{nextTier.name}</div>
                            </div>
                          </div>
                          <div style={styles.description}>{nextTier.description}</div>
                          <div style={styles.bonusText}>{nextTier.bonusDescription}</div>
                          <div style={styles.timerInfo}>Build time: {formatTimeRemaining(nextTier.durationMs)}</div>
                          {playerState.reputation < nextTier.requiredReputation ? (
                            <div style={styles.repLocked}>
                              Requires {nextTier.requiredReputation} reputation (you have {playerState.reputation})
                            </div>
                          ) : (
                            <button
                              style={{ ...styles.buyBtn, opacity: playerState.coins >= nextTier.cost ? 1 : 0.4 }}
                              disabled={playerState.coins < nextTier.cost}
                              onClick={e => { e.stopPropagation(); playUpgradeStartSound(); onFurnishingPurchase(item.id, nextTier.tier, nextTier.cost, nextTier.durationMs); setExpandedId(null) }}
                            >
                              Upgrade — {nextTier.cost} coins
                            </button>
                          )}
                        </div>
                      )}

                      {isPlaced && isExpanded && itemState === 'upgrading' && level?.upgrading && catalog && (
                        <div style={styles.expandedSection}>
                          <div style={styles.comparison}>
                            <div style={styles.compareItem}>
                              <img src={spriteToDataURL(getFurnCurrentSpriteKey(item.id, item), 64)} width={64} height={64} alt="Current" style={{ imageRendering: 'pixelated' }} />
                            </div>
                            <div style={styles.arrow}>→</div>
                            <div style={styles.compareItem}>
                              {(() => {
                                const toTierData = catalog.tiers.find(t => t.tier === level.upgrading!.toTier)
                                return toTierData ? <img src={spriteToDataURL(toTierData.spriteKey, 64)} width={64} height={64} alt={toTierData.name} style={{ imageRendering: 'pixelated', opacity: 0.5 }} /> : null
                              })()}
                            </div>
                          </div>
                          <div style={styles.progressContainer}>
                            <div style={{ ...styles.progressBar, width: `${Math.min(100, ((Date.now() - level.upgrading.startedAt) / level.upgrading.durationMs) * 100)}%` }} />
                          </div>
                          <div style={styles.timerText}>{formatTimeRemaining(getUpgradeTimeRemaining(level))}</div>
                          <button style={styles.finishBtn} onClick={e => { e.stopPropagation(); onFurnishingFinish(item.id) }}>⏩ Finish Now</button>
                        </div>
                      )}

                      {isPlaced && isExpanded && itemState === 'ready' && level?.upgrading && catalog && (
                        <div style={styles.expandedSection}>
                          {(() => {
                            const toTierData = catalog.tiers.find(t => t.tier === level.upgrading!.toTier)
                            return toTierData ? (
                              <>
                                <img src={spriteToDataURL(toTierData.spriteKey, 80)} width={80} height={80} alt={toTierData.name} style={{ imageRendering: 'pixelated', display: 'block', margin: '0 auto' }} />
                                <div style={{ textAlign: 'center', color: '#FFEFD5', marginTop: 8, fontWeight: 600 }}>{toTierData.name}</div>
                              </>
                            ) : null
                          })()}
                          <button style={styles.installBtn} onClick={e => { e.stopPropagation(); playInstallSound(); onFurnishingInstall(item.id) }}>Install</button>
                        </div>
                      )}

                      {isPlaced && isExpanded && itemState === 'maxed' && (
                        <div style={styles.expandedSection}>
                          <img src={spriteToDataURL(getFurnCurrentSpriteKey(item.id, item), 80)} width={80} height={80} alt={item.name} style={{ imageRendering: 'pixelated', display: 'block', margin: '0 auto' }} />
                          <div style={{ textAlign: 'center', color: '#FFD54F', marginTop: 8 }}>Fully upgraded!</div>
                        </div>
                      )}
                    </div>
                  )
                })}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  panel: {
    width: '100%',
    maxWidth: 400,
    minHeight: '85vh',
    maxHeight: '85vh',
    backgroundColor: '#3E2723',
    borderRadius: 16,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '2px solid #5D4037',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '2px solid #5D4037',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 700,
    color: '#FFEFD5',
  },
  coins: {
    fontSize: 14,
    color: '#FFD54F',
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#FFEFD5',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    padding: '4px 8px',
  },
  tabBar: {
    display: 'flex',
    borderBottom: '2px solid #5D4037',
    padding: '0 8px',
    gap: 0,
  },
  tab: {
    flex: 1,
    padding: '10px 0',
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid' as const,
    borderBottomColor: 'transparent',
    marginBottom: -2,
    color: '#8D6E63',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
  tabActive: {
    color: '#FFD54F',
    borderBottomColor: '#FFD54F',
  },
  list: {
    overflowY: 'auto',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  card: {
    backgroundColor: '#4E342E',
    borderRadius: 10,
    padding: 12,
    cursor: 'pointer',
    border: '1px solid #6D4C41',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#FFEFD5',
  },
  tierDots: {
    display: 'flex',
    gap: 4,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    display: 'inline-block',
  },
  maxBadge: {
    backgroundColor: '#FFD54F',
    color: '#3E2723',
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 8,
  },
  timerBadge: {
    backgroundColor: '#5D4037',
    color: '#FFCC80',
    fontSize: 12,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 8,
  },
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid #6D4C41',
  },
  comparison: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  compareItem: {
    textAlign: 'center' as const,
  },
  compareLabel: {
    fontSize: 11,
    color: '#BCAAA4',
    marginTop: 4,
  },
  arrow: {
    fontSize: 24,
    color: '#FFD54F',
  },
  description: {
    fontSize: 13,
    color: '#BCAAA4',
    textAlign: 'center' as const,
    marginTop: 8,
  },
  bonusText: {
    fontSize: 13,
    color: '#FFD54F',
    textAlign: 'center' as const,
    marginTop: 6,
    fontWeight: 600,
  },
  timerInfo: {
    fontSize: 12,
    color: '#8D6E63',
    textAlign: 'center' as const,
    marginTop: 4,
  },
  buyBtn: {
    display: 'block',
    width: '100%',
    marginTop: 10,
    padding: '10px 0',
    backgroundColor: '#FFD54F',
    color: '#3E2723',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  progressContainer: {
    marginTop: 10,
    height: 8,
    backgroundColor: '#3E2723',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD54F',
    borderRadius: 4,
    transition: 'width 1s linear',
  },
  timerText: {
    fontSize: 13,
    color: '#FFCC80',
    textAlign: 'center' as const,
    marginTop: 6,
  },
  readyBadge: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 8,
  },
  installBtn: {
    display: 'block',
    width: '100%',
    marginTop: 12,
    padding: '12px 0',
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: 700,
    color: '#8D6E63',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: -2,
  },
  repLocked: {
    marginTop: 10,
    padding: '8px 12px',
    backgroundColor: '#3E2723',
    borderRadius: 8,
    textAlign: 'center' as const,
    fontSize: 13,
    color: '#EF5350',
    fontWeight: 600,
  },
  finishBtn: {
    display: 'block',
    width: '100%',
    marginTop: 8,
    padding: '6px 0',
    backgroundColor: 'transparent',
    color: '#8D6E63',
    border: '1px solid #5D4037',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
  },
  smallBuyBtn: {
    padding: '4px 10px',
    backgroundColor: '#FFD54F',
    color: '#3E2723',
    border: 'none',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  placedBadge: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 8,
  },
}

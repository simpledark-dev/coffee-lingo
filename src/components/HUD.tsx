'use client'

import { getRepLevel } from '../lib/upgrades'

interface HUDProps {
  coins: number
  reputation: number
  onQuestsTap?: () => void
  hasClaimableQuest?: boolean
}

export default function HUD({
  coins,
  reputation,
  onQuestsTap,
  hasClaimableQuest,
}: HUDProps) {
  const rep = getRepLevel(reputation)

  return (
    <div style={styles.hud}>
      {/* Coins */}
      <div style={styles.stat}>
        <span style={styles.statIcon}>💰</span>
        <span style={styles.coinValue}>{Math.round(coins)}</span>
      </div>

      {/* Rep */}
      <div style={styles.stat}>
        <span style={styles.statIcon}>⭐</span>
        <div style={styles.repGroup}>
          <span style={styles.repTitle}>{rep.current.title}</span>
          <div style={styles.repBarOuter}>
            <div style={{ ...styles.repBarInner, width: `${rep.progress * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Quests */}
      <div
        onClick={onQuestsTap}
        style={styles.questButton}
      >
        📋
        {hasClaimableQuest && <span style={styles.badge} />}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  hud: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'calc(8px + env(safe-area-inset-top)) 12px 8px',
    background: 'linear-gradient(180deg, #4E342E 0%, #3E2723 100%)',
    borderBottom: '1px solid #6D4C41',
    flexShrink: 0,
    gap: 8,
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  statIcon: {
    fontSize: 14,
    lineHeight: 1,
  },
  coinValue: {
    color: '#FFD54F',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'monospace',
  },
  repGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  },
  repTitle: {
    color: '#FFEFD5',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'monospace',
    lineHeight: 1,
  },
  repBarOuter: {
    width: 72,
    height: 7,
    backgroundColor: '#2C1A12',
    borderRadius: 3,
    overflow: 'hidden',
    border: '1px solid #5D4037',
  },
  repBarInner: {
    height: '100%',
    backgroundColor: '#FFD54F',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  questButton: {
    cursor: 'pointer',
    position: 'relative' as const,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    background: 'rgba(93, 64, 55, 0.85)',
    border: '1.5px solid rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
    fontSize: 14,
  },
  badge: {
    position: 'absolute' as const,
    top: -3,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#F44336',
    border: '1.5px solid #3E2723',
  },
}

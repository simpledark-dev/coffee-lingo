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
    <div className="hud">
      <span className="hud-item hud-coins">{Math.round(coins)} coins</span>
      <span className="hud-item hud-rep" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {rep.current.title} ({reputation} Rep)
        <span style={{ width: 40, height: 6, backgroundColor: '#3E2723', borderRadius: 3, display: 'inline-block', overflow: 'hidden', border: '1px solid #5D4037' }}>
          <span style={{ display: 'block', height: '100%', width: `${rep.progress * 100}%`, backgroundColor: '#FFD54F', borderRadius: 3 }} />
        </span>
      </span>
      <span
        onClick={onQuestsTap}
        style={{
          cursor: 'pointer',
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          background: 'rgba(93, 64, 55, 0.85)',
          border: '1.5px solid rgba(255, 255, 255, 0.3)',
          borderRadius: 6,
          fontSize: 14,
        }}
      >
        📋
        {hasClaimableQuest && (
          <span style={{
            position: 'absolute',
            top: -3,
            right: -3,
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: '#F44336',
            border: '2px solid rgba(93, 64, 55, 0.85)',
          }} />
        )}
      </span>
    </div>
  )
}

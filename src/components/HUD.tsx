'use client'

import { getRepLevel } from '../lib/upgrades'

interface HUDProps {
  coins: number
  reputation: number
  customersServed: number
}

export default function HUD({
  coins,
  reputation,
  customersServed,
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
      <span className="hud-item">☕ {customersServed}</span>
    </div>
  )
}

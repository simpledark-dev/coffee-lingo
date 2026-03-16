'use client'

import { getRepLevel } from '../lib/upgrades'

interface HUDProps {
  day: number
  coins: number
  reputation: number
  customersRemaining: number
  totalCustomers: number
}

export default function HUD({
  day,
  coins,
  reputation,
  customersRemaining,
  totalCustomers,
}: HUDProps) {
  const rep = getRepLevel(reputation)

  return (
    <div className="hud">
      <span className="hud-item">Day {day}</span>
      <span className="hud-item hud-coins">{coins} coins</span>
      <span className="hud-item hud-rep" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {reputation} Rep
        <span style={{ width: 40, height: 6, backgroundColor: '#5D4037', borderRadius: 3, display: 'inline-block', overflow: 'hidden' }}>
          <span style={{ display: 'block', height: '100%', width: `${rep.progress * 100}%`, backgroundColor: '#FFD54F', borderRadius: 3 }} />
        </span>
      </span>
      <span className="hud-item">
        {totalCustomers - customersRemaining}/{totalCustomers}
      </span>
    </div>
  )
}

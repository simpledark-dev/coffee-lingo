'use client'

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
  return (
    <div className="hud">
      <span className="hud-item">Day {day}</span>
      <span className="hud-item hud-coins">{coins} coins</span>
      <span className="hud-item hud-rep">Rep: {reputation}</span>
      <span className="hud-item">
        {totalCustomers - customersRemaining}/{totalCustomers}
      </span>
    </div>
  )
}

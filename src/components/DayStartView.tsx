'use client'

interface DayStartViewProps {
  day: number
  onOpenShop: () => void
}

export default function DayStartView({ day, onOpenShop }: DayStartViewProps) {
  return (
    <div className="day-start">
      <div>
        <div className="day-number">Day {day}</div>
        <div className="day-subtitle">Time to open the cafe</div>
      </div>
      <button className="open-shop-button" onClick={onOpenShop}>
        Open Shop
      </button>
    </div>
  )
}

import { useState, useRef, useEffect, type ReactNode } from 'react'

interface TooltipProps {
  text: string
  shortcut?: string
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export function Tooltip({ text, shortcut, children, side = 'bottom', delay = 400 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    timer.current = setTimeout(() => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      let x = 0, y = 0
      switch (side) {
        case 'bottom':
          x = rect.left + rect.width / 2
          y = rect.bottom + 6
          break
        case 'top':
          x = rect.left + rect.width / 2
          y = rect.top - 6
          break
        case 'right':
          x = rect.right + 6
          y = rect.top + rect.height / 2
          break
        case 'left':
          x = rect.left - 6
          y = rect.top + rect.height / 2
          break
      }
      setPos({ x, y })
      setVisible(true)
    }, delay)
  }

  const hide = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setVisible(false)
  }

  useEffect(() => {
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [])

  return (
    <div
      ref={ref}
      onPointerEnter={show}
      onPointerLeave={hide}
      onPointerDown={hide}
      className="inline-flex"
    >
      {children}
      {visible && <TooltipPortal text={text} shortcut={shortcut} side={side} pos={pos} />}
    </div>
  )
}

function TooltipPortal({ text, shortcut, side, pos }: {
  text: string; shortcut?: string; side: string; pos: { x: number; y: number }
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [adjusted, setAdjusted] = useState(pos)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const rect = el.getBoundingClientRect()
    let { x, y } = pos

    // Anchor based on side
    switch (side) {
      case 'bottom':
        x -= rect.width / 2
        break
      case 'top':
        x -= rect.width / 2
        y -= rect.height
        break
      case 'right':
        y -= rect.height / 2
        break
      case 'left':
        x -= rect.width
        y -= rect.height / 2
        break
    }

    // Clamp to viewport
    x = Math.max(4, Math.min(x, window.innerWidth - rect.width - 4))
    y = Math.max(4, Math.min(y, window.innerHeight - rect.height - 4))

    setAdjusted({ x, y })
  }, [pos, side])

  return (
    <div
      ref={ref}
      className="fixed z-[999] pointer-events-none"
      style={{ left: adjusted.x, top: adjusted.y }}
    >
      <div className="bg-neutral-950 border border-neutral-600 px-2 py-1 text-xs text-neutral-200 whitespace-nowrap flex items-center gap-1.5 shadow-lg">
        <span>{text}</span>
        {shortcut && (
          <span className="text-neutral-500 border border-neutral-700 bg-neutral-800 px-1 py-px text-[10px] leading-tight">{shortcut}</span>
        )}
      </div>
    </div>
  )
}

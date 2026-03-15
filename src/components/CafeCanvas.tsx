'use client'

import { useRef, useEffect, useCallback } from 'react'
import {
  PALETTE,
  SPRITE_MAP,
  FLOOR_WOOD,
  WALL,
  CUSTOMER_SPRITES,
  EXCLAMATION,
} from '../lib/sprites'
import {
  TILE_SIZE,
  SCALE,
  GRID_COLS,
  GRID_ROWS,
  CAFE_LAYOUT,
  T,
} from '../lib/tilemap'
import type { CafeState } from '../lib/types'

interface CafeCanvasProps {
  cafeStateRef: React.RefObject<CafeState | null>
  onCustomerTap: (customerId: number) => void
}

const TILE_PX = TILE_SIZE * SCALE
const WORLD_W = GRID_COLS * TILE_PX
const WORLD_H = GRID_ROWS * TILE_PX

const TILE_ID_TO_SPRITE: Record<string, string> = {
  [T.FLOOR]: 'FLOOR_WOOD',
  [T.WALL]: 'WALL',
  [T.COUNTER]: 'COUNTER_TOP',
  [T.COUNTER_L]: 'COUNTER_END_L',
  [T.TABLE]: 'TABLE',
  [T.CHAIR_U]: 'CHAIR',
  [T.CHAIR_D]: 'CHAIR',
  [T.SHELF]: 'SHELF',
  [T.MENU]: 'MENU_BOARD',
  [T.DOOR]: 'DOOR',
  [T.MACHINE]: 'COFFEE_MACHINE',
  [T.LAMP]: 'LAMP',
  [T.PLANT]: 'PLANT',
  [T.CUP]: 'COFFEE_CUP',
  [T.WINDOW]: 'WINDOW',
}

const NEEDS_FLOOR = new Set<string>([
  T.TABLE, T.CHAIR_U, T.CHAIR_D, T.MACHINE, T.LAMP, T.PLANT, T.CUP,
  T.SHELF, T.MENU, T.DOOR,
])

function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: number[][],
  x: number,
  y: number,
  scale: number
) {
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const colorIdx = sprite[row][col]
      if (colorIdx === 0) continue
      ctx.fillStyle = PALETTE[colorIdx]
      ctx.fillRect(x + col * scale, y + row * scale, scale, scale)
    }
  }
}

export default function CafeCanvas({
  cafeStateRef,
  onCustomerTap,
}: CafeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>(0)

  // Camera
  const cameraXRef = useRef(0)
  const cameraYRef = useRef(0)
  const viewWRef = useRef(390)
  const viewHRef = useRef(500)

  // Touch state for panning + tap detection
  const touchStartYRef = useRef(0)
  const touchStartXRef = useRef(0)
  const cameraStartYRef = useRef(0)
  const isDraggingRef = useRef(false)
  const touchMovedRef = useRef(0) // total distance moved

  // Exclamation pulse animation
  const tickRef = useRef(0)

  const drawScene = useCallback((ctx: CanvasRenderingContext2D, camX: number, camY: number, viewW: number, viewH: number) => {
    ctx.clearRect(0, 0, viewW, viewH)

    const startCol = Math.max(0, Math.floor(camX / TILE_PX))
    const endCol = Math.min(GRID_COLS - 1, Math.floor((camX + viewW) / TILE_PX))
    const startRow = Math.max(0, Math.floor(camY / TILE_PX))
    const endRow = Math.min(GRID_ROWS - 1, Math.floor((camY + viewH) / TILE_PX))

    ctx.save()
    ctx.translate(-camX, -camY)

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tileId = CAFE_LAYOUT[row]?.[col] ?? T.EMPTY
        const px = col * TILE_PX
        const py = row * TILE_PX

        if (tileId === T.EMPTY) continue

        if (NEEDS_FLOOR.has(tileId)) {
          drawSprite(ctx, FLOOR_WOOD, px, py, SCALE)
        }

        if (tileId === T.WALL) {
          drawSprite(ctx, WALL, px, py, SCALE)
          continue
        }

        const spriteName = TILE_ID_TO_SPRITE[tileId]
        if (spriteName && SPRITE_MAP[spriteName]) {
          drawSprite(ctx, SPRITE_MAP[spriteName], px, py, SCALE)
        } else if (tileId === T.FLOOR) {
          drawSprite(ctx, FLOOR_WOOD, px, py, SCALE)
        }
      }
    }

    ctx.restore()
  }, [])

  // Resize canvas
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      canvas.width = width
      canvas.height = height
      viewWRef.current = width
      viewHRef.current = height
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // Set default camera Y
  useEffect(() => {
    // Default to showing counter area (row 19)
    const counterY = 19 * TILE_PX
    cameraYRef.current = Math.max(0, counterY - viewHRef.current * 0.4)
  }, [])

  // Touch panning + tap detection
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return
      isDraggingRef.current = true
      touchStartYRef.current = e.touches[0].clientY
      touchStartXRef.current = e.touches[0].clientX
      cameraStartYRef.current = cameraYRef.current
      touchMovedRef.current = 0
    }

    function onTouchMove(e: TouchEvent) {
      if (!isDraggingRef.current || e.touches.length !== 1) return
      e.preventDefault()
      const dy = touchStartYRef.current - e.touches[0].clientY
      const dx = touchStartXRef.current - e.touches[0].clientX
      touchMovedRef.current = Math.sqrt(dx * dx + dy * dy)
      const maxY = Math.max(0, WORLD_H - viewHRef.current)
      cameraYRef.current = Math.max(0, Math.min(maxY, cameraStartYRef.current + dy))
    }

    function onTouchEnd(e: TouchEvent) {
      if (isDraggingRef.current && touchMovedRef.current < 10) {
        // This was a tap, not a drag
        const touch = e.changedTouches[0]
        if (touch) handleTap(touch.clientX, touch.clientY)
      }
      isDraggingRef.current = false
    }

    function onMouseDown(e: MouseEvent) {
      isDraggingRef.current = true
      touchStartYRef.current = e.clientY
      touchStartXRef.current = e.clientX
      cameraStartYRef.current = cameraYRef.current
      touchMovedRef.current = 0
    }

    function onMouseMove(e: MouseEvent) {
      if (!isDraggingRef.current) return
      const dy = touchStartYRef.current - e.clientY
      const dx = touchStartXRef.current - e.clientX
      touchMovedRef.current = Math.sqrt(dx * dx + dy * dy)
      const maxY = Math.max(0, WORLD_H - viewHRef.current)
      cameraYRef.current = Math.max(0, Math.min(maxY, cameraStartYRef.current + dy))
    }

    function onMouseUp(e: MouseEvent) {
      if (isDraggingRef.current && touchMovedRef.current < 10) {
        handleTap(e.clientX, e.clientY)
      }
      isDraggingRef.current = false
    }

    function handleTap(clientX: number, clientY: number) {
      const canvas = canvasRef.current
      const state = cafeStateRef.current
      if (!canvas || !state) return
      if (state.activeConvo) return // already in conversation

      const rect = canvas.getBoundingClientRect()
      const canvasX = clientX - rect.left
      const canvasY = clientY - rect.top
      const worldX = canvasX + cameraXRef.current
      const worldY = canvasY + cameraYRef.current

      // Hit-test against exclamation-phase customers
      const TAP_RADIUS = 60
      for (const customer of state.customers) {
        if (customer.phase !== 'exclamation') continue
        const cx = customer.worldPos.x + TILE_PX / 2
        const cy = customer.worldPos.y + TILE_PX / 2
        const dist = Math.sqrt((worldX - cx) ** 2 + (worldY - cy) ** 2)
        if (dist < TAP_RADIUS) {
          onCustomerTap(customer.id)
          return
        }
      }
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: false })
    container.addEventListener('touchend', onTouchEnd)
    container.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
      container.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [cafeStateRef, onCustomerTap])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let running = true

    function frame() {
      if (!running || !ctx) return

      tickRef.current++
      const viewW = viewWRef.current
      const viewH = viewHRef.current

      // Camera X centered
      cameraXRef.current = Math.max(0, (WORLD_W - viewW) / 2)
      cameraYRef.current = Math.max(0, Math.min(WORLD_H - viewH, cameraYRef.current))

      const camX = Math.round(cameraXRef.current)
      const camY = Math.round(cameraYRef.current)

      ctx.imageSmoothingEnabled = false
      drawScene(ctx, camX, camY, viewW, viewH)

      // Draw barista behind counter (row 20, col 8, facing up)
      ctx.save()
      ctx.translate(-camX, -camY)
      const baristaSprite = CUSTOMER_SPRITES[0].up
      drawSprite(ctx, baristaSprite, 4 * TILE_PX, 20 * TILE_PX, SCALE)
      ctx.restore()

      // Draw customers sorted by Y for depth
      const state = cafeStateRef.current
      if (state) {
        const sorted = [...state.customers].sort((a, b) => a.worldPos.y - b.worldPos.y)

        ctx.save()
        ctx.translate(-camX, -camY)

        for (const customer of sorted) {
          const spriteSet = CUSTOMER_SPRITES[customer.spriteVariant % CUSTOMER_SPRITES.length]
          const sprite = spriteSet[customer.facingDir]
          drawSprite(ctx, sprite, customer.worldPos.x, customer.worldPos.y, SCALE)

          // Draw exclamation mark
          if (customer.phase === 'exclamation') {
            const pulse = 1 + 0.15 * Math.sin(tickRef.current * 0.1)
            const exSize = SCALE * pulse
            const exX = customer.worldPos.x + TILE_PX / 2 - (8 * exSize) / 2
            const exY = customer.worldPos.y - 12 * exSize
            drawSprite(ctx, EXCLAMATION, exX, exY, exSize)
          }

          // Draw highlight for conversing customer
          if (customer.phase === 'conversing') {
            ctx.strokeStyle = '#FFD700'
            ctx.lineWidth = 2
            ctx.strokeRect(
              customer.worldPos.x + 2,
              customer.worldPos.y + 2,
              TILE_PX - 4,
              TILE_PX - 4,
            )
          }
        }

        ctx.restore()
      }

      animRef.current = requestAnimationFrame(frame)
    }

    frame()

    return () => {
      running = false
      cancelAnimationFrame(animRef.current)
    }
  }, [drawScene, cafeStateRef])

  return (
    <div ref={containerRef} style={styles.container}>
      <canvas ref={canvasRef} style={styles.canvas} />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    background: '#3E2723',
  },
  canvas: {
    width: '100%',
    height: '100%',
    imageRendering: 'pixelated',
    display: 'block',
  },
}

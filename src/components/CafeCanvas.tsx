'use client'

import { useRef, useEffect, useCallback } from 'react'
import {
  PALETTE,
  SPRITE_MAP,
  FLOOR_WOOD,
  WALL,
  COUNTER_TOP,
  COUNTER_END_L,
  CUSTOMER_SPRITES,
} from '../lib/sprites'
import type { CustomerDirection } from '../lib/sprites'
import {
  TILE_SIZE,
  SCALE,
  GRID_COLS,
  GRID_ROWS,
  CAFE_LAYOUT,
  T,
  CUSTOMER_POS,
  DOOR_POS,
} from '../lib/tilemap'
import { Score } from '../lib/types'

interface CafeCanvasProps {
  customerIndex: number
  customerPhase: 'entering' | 'present' | 'score' | 'exiting' | 'idle'
  customerLine: string
  scoreResult?: { score: Score; tipAmount: number } | null
  patiencePercent: number
  hintLevel: number
  hintIdea: string
  hintTranslation: string
  onHint: () => void
}

// World size in pixels
const WORLD_W = GRID_COLS * TILE_SIZE * SCALE
const WORLD_H = GRID_ROWS * TILE_SIZE * SCALE

const TILE_PX = TILE_SIZE * SCALE // 64px per tile

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

// Floor tiles that go under objects
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
      if (colorIdx === 0) continue // transparent
      ctx.fillStyle = PALETTE[colorIdx]
      ctx.fillRect(
        x + col * scale,
        y + row * scale,
        scale,
        scale
      )
    }
  }
}

export default function CafeCanvas({
  customerIndex,
  customerPhase,
  customerLine,
  scoreResult,
  patiencePercent,
  hintLevel,
  hintIdea,
  hintTranslation,
  onHint,
}: CafeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>(0)
  const customerXRef = useRef(DOOR_POS.col * TILE_PX)
  const targetXRef = useRef(CUSTOMER_POS.col * TILE_PX)

  // Camera position in world pixels (top-left of viewport)
  const cameraXRef = useRef(0)
  const cameraYRef = useRef(0)
  // Touch panning state
  const touchStartYRef = useRef(0)
  const cameraStartYRef = useRef(0)
  const isDraggingRef = useRef(false)
  // Viewport size (set from container)
  const viewWRef = useRef(390)
  const viewHRef = useRef(500)

  const customerVariant = customerIndex % CUSTOMER_SPRITES.length
  const customerSpriteSet = CUSTOMER_SPRITES[customerVariant]
  const customerDirRef = useRef<CustomerDirection>('down')

  const drawScene = useCallback((ctx: CanvasRenderingContext2D, camX: number, camY: number, viewW: number, viewH: number) => {
    ctx.clearRect(0, 0, viewW, viewH)

    // Frustum culling: only draw visible tiles
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

        // Draw floor under objects that need it
        if (NEEDS_FLOOR.has(tileId)) {
          drawSprite(ctx, FLOOR_WOOD, px, py, SCALE)
        }

        // Wall tiles rendered directly
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

  const drawCustomer = useCallback((ctx: CanvasRenderingContext2D, cx: number, camX: number, camY: number, dir: CustomerDirection) => {
    ctx.save()
    ctx.translate(-camX, -camY)
    const cy = CUSTOMER_POS.row * TILE_PX
    drawSprite(ctx, customerSpriteSet[dir], cx, cy, SCALE)
    ctx.restore()
  }, [customerSpriteSet])

  // Resize canvas to match container
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      const dpr = 1 // keep pixel art crisp, no DPR scaling
      canvas.width = width
      canvas.height = height
      viewWRef.current = width
      viewHRef.current = height
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // Set default camera Y to show counter/customer area
  useEffect(() => {
    const viewH = viewHRef.current
    const counterY = CUSTOMER_POS.row * TILE_PX
    cameraYRef.current = Math.max(0, counterY - viewH * 0.4)
  }, [])

  // Touch panning (vertical only)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return
      isDraggingRef.current = true
      touchStartYRef.current = e.touches[0].clientY
      cameraStartYRef.current = cameraYRef.current
    }

    function onTouchMove(e: TouchEvent) {
      if (!isDraggingRef.current || e.touches.length !== 1) return
      e.preventDefault() // prevent page scroll
      const deltaY = touchStartYRef.current - e.touches[0].clientY
      const maxY = Math.max(0, WORLD_H - viewHRef.current)
      cameraYRef.current = Math.max(0, Math.min(maxY, cameraStartYRef.current + deltaY))
    }

    function onTouchEnd() {
      isDraggingRef.current = false
    }

    // Mouse support for desktop testing
    function onMouseDown(e: MouseEvent) {
      isDraggingRef.current = true
      touchStartYRef.current = e.clientY
      cameraStartYRef.current = cameraYRef.current
    }

    function onMouseMove(e: MouseEvent) {
      if (!isDraggingRef.current) return
      const deltaY = touchStartYRef.current - e.clientY
      const maxY = Math.max(0, WORLD_H - viewHRef.current)
      cameraYRef.current = Math.max(0, Math.min(maxY, cameraStartYRef.current + deltaY))
    }

    function onMouseUp() {
      isDraggingRef.current = false
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
  }, [])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false

    const targetX = CUSTOMER_POS.col * TILE_PX
    const doorX = (DOOR_POS.col + 2) * TILE_PX
    const exitX = -2 * TILE_PX

    if (customerPhase === 'entering') {
      customerXRef.current = doorX
      targetXRef.current = targetX
    } else if (customerPhase === 'exiting') {
      targetXRef.current = exitX
    } else if (customerPhase === 'present' || customerPhase === 'score') {
      targetXRef.current = targetX
    }

    let running = true

    function frame() {
      if (!running || !ctx) return

      const viewW = viewWRef.current
      const viewH = viewHRef.current

      // Animate customer walk
      const diff = targetXRef.current - customerXRef.current
      const WALK_SPEED = 3
      if (Math.abs(diff) > WALK_SPEED) {
        customerXRef.current += Math.sign(diff) * WALK_SPEED
        // Face the direction of movement
        customerDirRef.current = diff < 0 ? 'left' : 'right'
      } else {
        customerXRef.current = targetXRef.current
        // Once stopped, face down (toward counter/player)
        if (customerPhase === 'present' || customerPhase === 'score') {
          customerDirRef.current = 'down'
        }
      }

      // Camera X: always centered horizontally
      cameraXRef.current = Math.max(0, (WORLD_W - viewW) / 2)
      // Camera Y: user-controlled via touch drag, clamped to world bounds
      cameraYRef.current = Math.max(0, Math.min(WORLD_H - viewH, cameraYRef.current))

      const camX = Math.round(cameraXRef.current)
      const camY = Math.round(cameraYRef.current)

      ctx.imageSmoothingEnabled = false
      drawScene(ctx, camX, camY, viewW, viewH)

      if (customerPhase !== 'idle') {
        drawCustomer(ctx, customerXRef.current, camX, camY, customerDirRef.current)
      }

      animRef.current = requestAnimationFrame(frame)
    }

    frame()

    return () => {
      running = false
      cancelAnimationFrame(animRef.current)
    }
  }, [customerPhase, customerIndex, drawScene, drawCustomer])

  return (
    <div ref={containerRef} style={styles.container}>
      <canvas
        ref={canvasRef}
        style={styles.canvas}
      />
      {/* Overlay UI elements on top of canvas */}
      <div style={styles.overlay}>
        {/* Speech bubble */}
        {(customerPhase === 'present' || customerPhase === 'entering') && (
          <div style={{
            ...styles.speechBubble,
            opacity: customerPhase === 'present' ? 1 : 0,
            transition: 'opacity 0.3s',
          }}>
            <div style={styles.speechText}>{customerLine}</div>
            {hintLevel >= 1 && <div style={styles.hintText}>{hintIdea}</div>}
            {hintLevel >= 2 && <div style={styles.hintTranslation}>{hintTranslation}</div>}
            <div style={styles.speechTail} />
          </div>
        )}

        {/* Patience bar */}
        {customerPhase === 'present' && (
          <div style={styles.patienceContainer}>
            <div style={{
              ...styles.patienceBar,
              width: `${patiencePercent}%`,
              background: patiencePercent > 40 ? '#4CAF50' : patiencePercent > 15 ? '#FF9800' : '#F44336',
            }} />
          </div>
        )}

        {/* Hint button */}
        {customerPhase === 'present' && (
          <button style={styles.hintButton} onClick={onHint}>?</button>
        )}

        {/* Score display */}
        {customerPhase === 'score' && scoreResult && (
          <div style={styles.scoreContainer}>
            <div style={{ ...styles.scoreText, color: SCORE_COLORS[scoreResult.score] }}>
              {scoreResult.score}
            </div>
            {scoreResult.tipAmount > 0 && (
              <div style={styles.tipText}>+{scoreResult.tipAmount} coins</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const SCORE_COLORS: Record<Score, string> = {
  PERFECT: '#FFD700',
  GOOD: '#4CAF50',
  UNDERSTOOD: '#9E9E9E',
  MISSED: '#F44336',
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speechBubble: {
    position: 'absolute',
    top: '15%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#FFFEF7',
    borderRadius: 12,
    padding: '10px 16px',
    minWidth: 160,
    maxWidth: 280,
    boxShadow: '0 3px 12px rgba(0,0,0,0.25)',
    textAlign: 'center',
    pointerEvents: 'auto',
    border: '2px solid #5D4037',
    zIndex: 10,
  },
  speechText: {
    fontSize: 16,
    fontWeight: 600,
    color: '#2C1810',
    lineHeight: 1.4,
  },
  speechTail: {
    position: 'absolute',
    bottom: -10,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    borderTop: '8px solid #FFFEF7',
    filter: 'drop-shadow(0 2px 1px rgba(0,0,0,0.15))',
  },
  hintText: {
    marginTop: 6,
    fontSize: 12,
    color: '#8B6F47',
    fontStyle: 'italic',
    borderTop: '1px solid rgba(139,111,71,0.2)',
    paddingTop: 4,
  },
  hintTranslation: {
    marginTop: 2,
    fontSize: 12,
    color: '#A0845C',
    fontStyle: 'italic',
  },
  patienceContainer: {
    position: 'absolute',
    top: '12%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 100,
    height: 6,
    background: 'rgba(0,0,0,0.4)',
    borderRadius: 3,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.2)',
    zIndex: 11,
  },
  patienceBar: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.5s linear, background 0.3s',
  },
  hintButton: {
    position: 'absolute',
    top: '16%',
    right: '8%',
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.5)',
    background: 'rgba(93,64,55,0.85)',
    color: '#FFEFD5',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
    zIndex: 12,
  },
  scoreContainer: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: 800,
    textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.3)',
    textTransform: 'uppercase',
  },
  tipText: {
    fontSize: 16,
    fontWeight: 600,
    color: '#FFD700',
    textShadow: '0 1px 4px rgba(0,0,0,0.6)',
  },
}

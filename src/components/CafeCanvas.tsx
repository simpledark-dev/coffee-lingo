'use client'

import { useRef, useEffect, useCallback } from 'react'
import {
  PALETTE,
  SPRITE_MAP,
  FLOOR_WOOD,
  WALL,
  COUNTER_TOP,
  COUNTER_END_L,
  CUSTOMERS,
} from '../lib/sprites'
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
  // Customer state
  customerIndex: number
  customerPhase: 'entering' | 'present' | 'score' | 'exiting' | 'idle'
  // Speech bubble
  customerLine: string
  // Score
  scoreResult?: { score: Score; tipAmount: number } | null
  // Patience
  patiencePercent: number
  // Hint
  hintLevel: number
  hintIdea: string
  hintTranslation: string
  onHint: () => void
}

const CANVAS_W = GRID_COLS * TILE_SIZE * SCALE
const CANVAS_H = GRID_ROWS * TILE_SIZE * SCALE

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
}

// Floor tiles that go under objects
const NEEDS_FLOOR = new Set<string>([
  T.TABLE, T.CHAIR_U, T.CHAIR_D, T.MACHINE, T.LAMP, T.PLANT, T.CUP,
  T.SHELF, T.MENU,
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
  const animRef = useRef<number>(0)
  const customerXRef = useRef(DOOR_POS.col * TILE_SIZE * SCALE)
  const targetXRef = useRef(CUSTOMER_POS.col * TILE_SIZE * SCALE)

  const customerVariant = customerIndex % CUSTOMERS.length
  const customerSprite = CUSTOMERS[customerVariant]

  const drawScene = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    // Draw tilemap
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tileId = CAFE_LAYOUT[row]?.[col] ?? T.EMPTY
        const px = col * TILE_SIZE * SCALE
        const py = row * TILE_SIZE * SCALE

        if (tileId === T.EMPTY) continue

        // Draw floor under objects that need it
        if (NEEDS_FLOOR.has(tileId)) {
          drawSprite(ctx, FLOOR_WOOD, px, py, SCALE)
        }

        // Draw the sprite for wall tiles
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
  }, [])

  const drawCustomer = useCallback((ctx: CanvasRenderingContext2D, cx: number) => {
    const cy = CUSTOMER_POS.row * TILE_SIZE * SCALE
    drawSprite(ctx, customerSprite, cx, cy, SCALE)
  }, [customerSprite])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false

    const targetX = CUSTOMER_POS.col * TILE_SIZE * SCALE
    const doorX = (DOOR_POS.col + 2) * TILE_SIZE * SCALE
    const exitX = -2 * TILE_SIZE * SCALE

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

      // Animate customer position at constant speed
      const diff = targetXRef.current - customerXRef.current
      const WALK_SPEED = 3 // pixels per frame
      if (Math.abs(diff) > WALK_SPEED) {
        customerXRef.current += Math.sign(diff) * WALK_SPEED
      } else {
        customerXRef.current = targetXRef.current
      }

      drawScene(ctx)

      // Draw customer if visible
      if (customerPhase !== 'idle') {
        drawCustomer(ctx, customerXRef.current)
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
    <div style={styles.container}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
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
    objectFit: 'contain',
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

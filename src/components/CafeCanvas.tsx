'use client'

import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import {
  PALETTE,
  SPRITE_MAP,
  FLOOR_STYLES,
  WALL,
  CUSTOMER_SPRITES,
  EXCLAMATION,
  POND_VARIANTS,
  FOUNTAIN_L,
  FOUNTAIN_R,
} from '../lib/sprites'
import type { FloorStyleKey } from '../lib/sprites'
import { getCharacter } from '../lib/characters'
import {
  TILE_SIZE,
  SCALE,
  GRID_COLS,
  GRID_ROWS,
  CAFE_LAYOUT,
  ROOM_COLS,
  OUTSIDE_COLS,
  OUTSIDE_ROWS,
  OUTSIDE_LAYOUT,
  CAFE_OUTSIDE_DOOR,
  DOOR_POS,
  T,
} from '../lib/tilemap'
import type { CafeState } from '../lib/types'
import { getActiveSpriteKey } from '../lib/upgrades'

interface CafeCanvasProps {
  cafeStateRef: React.RefObject<CafeState | null>
  onCustomerTap: (customerId: number) => void
  onCharacterTap?: (characterId: string) => void
  onContactsTap?: () => void
  upgrades?: Record<string, import('../lib/types').UpgradeLevel>
}

const TILE_PX = TILE_SIZE * SCALE
const WORLD_H = GRID_ROWS * TILE_PX
const ROOM_W = ROOM_COLS * TILE_PX // width of one room in pixels

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
  [T.BOOKSHELF]: 'BOOKSHELF',
  [T.GRASS]: 'GRASS',
  [T.HEDGE]: 'HEDGE',
  [T.PATH]: 'PATH_TILE',
  [T.FLOWER]: 'FLOWER',
  [T.BENCH]: 'BENCH',
  [T.FOUNTAIN]: 'FOUNTAIN',
  [T.TREE]: 'TREE',
  [T.LANTERN]: 'LANTERN',
  [T.POND]: 'POND',
  [T.CHESS]: 'CHESS_TABLE',
  // Outside scene tiles
  [T.ROAD]: 'ROAD',
  [T.ROAD_LINE]: 'ROAD_LINE',
  [T.SIDEWALK]: 'SIDEWALK',
  [T.SHOP_WALL]: 'SHOP_WALL',
  [T.SHOP_WALL_LIGHT]: 'SHOP_WALL_LIGHT',
  [T.AWNING_RED]: 'AWNING_RED',
  [T.AWNING_BLUE]: 'AWNING_BLUE',
  [T.AWNING_GREEN]: 'AWNING_GREEN',
  [T.AWNING_BROWN]: 'AWNING_BROWN',
  [T.SHOP_WINDOW]: 'SHOP_WINDOW',
  [T.LOCKED_DOOR]: 'LOCKED_DOOR',
  [T.CAFE_DOOR]: 'CAFE_DOOR',
  [T.STREET_LAMP]: 'STREET_LAMP',
  [T.OUTDOOR_PLANT]: 'OUTDOOR_PLANT',
  [T.CURB]: 'CURB',
  [T.CURB_R]: 'CURB_R',
  [T.ROOF]: 'ROOF',
}

const NEEDS_FLOOR = new Set<string>([
  T.TABLE, T.CHAIR_U, T.CHAIR_D, T.MACHINE, T.LAMP, T.PLANT, T.CUP,
  T.SHELF, T.MENU, T.DOOR, T.BOOKSHELF, T.CHESS,
])

// Swipe thresholds
const GESTURE_DEAD_ZONE = 10 // px before locking direction
const SWIPE_THRESHOLD = 60   // px to trigger room switch
const ROOM_SWITCH_SPEED = 0.04 // camera lerp factor per frame (lower = slower, 0.01–0.2)

// --- Sprite cache: pre-render each sprite once to an offscreen canvas ---
type SpriteCache = Map<number[][], HTMLCanvasElement>

function cacheSprite(cache: SpriteCache, sprite: number[][], scale: number) {
  if (cache.has(sprite)) return
  const w = Math.ceil(sprite[0].length * scale)
  const h = Math.ceil(sprite.length * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const s = Math.ceil(scale)
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const colorIdx = sprite[row][col]
      if (colorIdx === 0) continue
      ctx.fillStyle = PALETTE[colorIdx]
      ctx.fillRect(col * scale, row * scale, s, s)
    }
  }
  cache.set(sprite, canvas)
}

function buildSpriteCache(scale: number): SpriteCache {
  const cache: SpriteCache = new Map()
  for (const sprite of Object.values(SPRITE_MAP)) {
    cacheSprite(cache, sprite, scale)
  }
  for (const variant of CUSTOMER_SPRITES) {
    for (const dir of ['down', 'up', 'left', 'right'] as const) {
      cacheSprite(cache, variant[dir], scale)
    }
  }
  cacheSprite(cache, EXCLAMATION, scale)
  // Pond autotile variants
  for (const sprite of Object.values(POND_VARIANTS)) {
    cacheSprite(cache, sprite, scale)
  }
  // Fountain halves
  cacheSprite(cache, FOUNTAIN_L, scale)
  cacheSprite(cache, FOUNTAIN_R, scale)
  return cache
}

function drawCached(
  ctx: CanvasRenderingContext2D,
  cache: SpriteCache,
  sprite: number[][],
  x: number,
  y: number,
) {
  const cached = cache.get(sprite)
  if (cached) ctx.drawImage(cached, x, y)
}

export default function CafeCanvas({
  cafeStateRef,
  onCustomerTap,
  onCharacterTap,
  onContactsTap,
  upgrades,
}: CafeCanvasProps) {
  // Build dynamic tile→sprite map based on upgrade tiers
  const resolvedTileSprite: Record<string, string> = useMemo(() => ({
    ...TILE_ID_TO_SPRITE,
    [T.MACHINE]: getActiveSpriteKey('COFFEE_MACHINE', upgrades),
    [T.TABLE]: getActiveSpriteKey('TABLE', upgrades),
    [T.CHAIR_U]: getActiveSpriteKey('CHAIR', upgrades),
    [T.CHAIR_D]: getActiveSpriteKey('CHAIR', upgrades),
    [T.PLANT]: getActiveSpriteKey('PLANT', upgrades),
    [T.SHELF]: getActiveSpriteKey('SHELF', upgrades),
    [T.LAMP]: getActiveSpriteKey('LAMP', upgrades),
    [T.COUNTER]: getActiveSpriteKey('COUNTER', upgrades),
    [T.COUNTER_L]: getActiveSpriteKey('COUNTER', upgrades),
  }), [upgrades])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>(0)

  // Camera
  const cameraXRef = useRef(ROOM_W) // start in cafe (room 1)
  const cameraYRef = useRef(0)
  const targetCamXRef = useRef(ROOM_W) // smooth animation target
  const viewWRef = useRef(390)
  const viewHRef = useRef(500)

  // Current room (0 = reading, 1 = cafe)
  const currentRoomRef = useRef(1)
  const [currentRoom, setCurrentRoom] = useState(1)

  // Floor style — derived from upgrade tier
  const unlockedFloors = useMemo<FloorStyleKey[]>(() => {
    const floors: FloorStyleKey[] = ['FLOOR_WOOD', 'FLOOR_TILE']
    const floorTier = upgrades?.['FLOOR']?.tier ?? 0
    if (floorTier >= 1) floors.push('FLOOR_HERRINGBONE')
    if (floorTier >= 2) floors.push('FLOOR_MARBLE')
    return floors
  }, [upgrades])
  const [floorStyle, setFloorStyle] = useState<FloorStyleKey>('FLOOR_WOOD')
  const floorSpriteRef = useRef(FLOOR_STYLES.FLOOR_WOOD)

  // Touch state for panning + swipe + tap detection
  const touchStartYRef = useRef(0)
  const touchStartXRef = useRef(0)
  const cameraStartYRef = useRef(0)
  const isDraggingRef = useRef(false)
  const touchMovedRef = useRef(0)
  const gestureDirRef = useRef<'none' | 'horizontal' | 'vertical'>('none')
  const swipeDxRef = useRef(0)

  // Exclamation pulse animation
  const tickRef = useRef(0)

  // Check if other room has exclamation customers
  const [otherRoomAlert, setOtherRoomAlert] = useState(false)

  // Scene: interior (cafe + reading room) or outside
  const [scene, setScene] = useState<'interior' | 'outside'>('interior')
  const sceneRef = useRef<'interior' | 'outside'>('interior')
  const outsideCamYRef = useRef(0)
  const outsideCamStartYRef = useRef(0)

  // Full map popup
  const [showMap, setShowMap] = useState(false)
  const mapCanvasRef = useRef<HTMLCanvasElement>(null)

  function getRoomCamX(room: number): number {
    const roomLeft = room * ROOM_W
    // Center the room within the viewport; clamp so we don't go past room edges
    const offset = Math.max(0, (ROOM_W - viewWRef.current) / 2)
    return roomLeft + offset
  }

  function switchToRoom(room: number) {
    currentRoomRef.current = room
    setCurrentRoom(room)
    targetCamXRef.current = getRoomCamX(room)
  }

  const drawScene = useCallback((ctx: CanvasRenderingContext2D, cache: SpriteCache, camX: number, camY: number, viewW: number, viewH: number) => {
    ctx.clearRect(0, 0, viewW, viewH)
    const floor = floorSpriteRef.current

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
          drawCached(ctx, cache, floor, px, py)
        }

        if (tileId === T.WALL) {
          drawCached(ctx, cache, WALL, px, py)
          continue
        }

        if (tileId === T.FLOOR) {
          drawCached(ctx, cache, floor, px, py)
          continue
        }

        // Pond autotile: check neighbors to pick seamless variant
        if (tileId === T.POND) {
          const t = (CAFE_LAYOUT[row - 1]?.[col] === T.POND) ? 1 : 0
          const r = (CAFE_LAYOUT[row]?.[col + 1] === T.POND) ? 1 : 0
          const b = (CAFE_LAYOUT[row + 1]?.[col] === T.POND) ? 1 : 0
          const l = (CAFE_LAYOUT[row]?.[col - 1] === T.POND) ? 1 : 0
          const variant = POND_VARIANTS[`${t}${r}${b}${l}`]
          if (variant) drawCached(ctx, cache, variant, px, py)
          continue
        }

        // Fountain: pick left or right half based on neighbor
        if (tileId === T.FOUNTAIN) {
          const rightIsFountain = CAFE_LAYOUT[row]?.[col + 1] === T.FOUNTAIN
          drawCached(ctx, cache, rightIsFountain ? FOUNTAIN_L : FOUNTAIN_R, px, py)
          continue
        }

        const spriteName = resolvedTileSprite[tileId]
        if (spriteName && SPRITE_MAP[spriteName]) {
          drawCached(ctx, cache, SPRITE_MAP[spriteName], px, py)
        }
      }
    }

    ctx.restore()
  }, [resolvedTileSprite])

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

  // Set default camera position (cafe room, counter area)
  useEffect(() => {
    const counterY = 27 * TILE_PX
    cameraYRef.current = Math.max(0, counterY - viewHRef.current * 0.4)
    // Center camera X on cafe room
    const camX = getRoomCamX(1)
    cameraXRef.current = camX
    targetCamXRef.current = camX
  }, [])

  // Touch panning + horizontal swipe + tap detection
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return
      isDraggingRef.current = true
      touchStartYRef.current = e.touches[0].clientY
      touchStartXRef.current = e.touches[0].clientX
      cameraStartYRef.current = cameraYRef.current
      outsideCamStartYRef.current = outsideCamYRef.current
      touchMovedRef.current = 0
      gestureDirRef.current = 'none'
      swipeDxRef.current = 0
    }

    function onTouchMove(e: TouchEvent) {
      if (!isDraggingRef.current || e.touches.length !== 1) return
      e.preventDefault()
      const dy = touchStartYRef.current - e.touches[0].clientY
      const dx = touchStartXRef.current - e.touches[0].clientX
      const totalMove = Math.sqrt(dx * dx + dy * dy)
      touchMovedRef.current = totalMove

      // Lock gesture direction after dead zone
      if (gestureDirRef.current === 'none' && totalMove > GESTURE_DEAD_ZONE) {
        gestureDirRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
      }

      if (gestureDirRef.current === 'vertical') {
        if (sceneRef.current === 'outside') {
          const outsideH = OUTSIDE_ROWS * TILE_PX
          const maxY = Math.max(0, outsideH - viewHRef.current)
          outsideCamYRef.current = Math.max(0, Math.min(maxY, outsideCamStartYRef.current + dy))
        } else {
          const maxY = Math.max(0, WORLD_H - viewHRef.current)
          cameraYRef.current = Math.max(0, Math.min(maxY, cameraStartYRef.current + dy))
        }
      } else if (gestureDirRef.current === 'horizontal') {
        swipeDxRef.current = dx
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (isDraggingRef.current) {
        if (touchMovedRef.current < 10) {
          const touch = e.changedTouches[0]
          if (touch) handleTap(touch.clientX, touch.clientY)
        } else if (gestureDirRef.current === 'horizontal') {
          // Check for room switch
          if (swipeDxRef.current > SWIPE_THRESHOLD && currentRoomRef.current === 0) {
            switchToRoom(1)
          } else if (swipeDxRef.current < -SWIPE_THRESHOLD && currentRoomRef.current === 1) {
            switchToRoom(0)
          }
        }
      }
      isDraggingRef.current = false
      gestureDirRef.current = 'none'
      swipeDxRef.current = 0
    }

    function onMouseDown(e: MouseEvent) {
      isDraggingRef.current = true
      touchStartYRef.current = e.clientY
      touchStartXRef.current = e.clientX
      cameraStartYRef.current = cameraYRef.current
      outsideCamStartYRef.current = outsideCamYRef.current
      touchMovedRef.current = 0
      gestureDirRef.current = 'none'
      swipeDxRef.current = 0
    }

    function onMouseMove(e: MouseEvent) {
      if (!isDraggingRef.current) return
      const dy = touchStartYRef.current - e.clientY
      const dx = touchStartXRef.current - e.clientX
      const totalMove = Math.sqrt(dx * dx + dy * dy)
      touchMovedRef.current = totalMove

      if (gestureDirRef.current === 'none' && totalMove > GESTURE_DEAD_ZONE) {
        gestureDirRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
      }

      if (gestureDirRef.current === 'vertical') {
        if (sceneRef.current === 'outside') {
          const outsideH = OUTSIDE_ROWS * TILE_PX
          const maxY = Math.max(0, outsideH - viewHRef.current)
          outsideCamYRef.current = Math.max(0, Math.min(maxY, outsideCamStartYRef.current + dy))
        } else {
          const maxY = Math.max(0, WORLD_H - viewHRef.current)
          cameraYRef.current = Math.max(0, Math.min(maxY, cameraStartYRef.current + dy))
        }
      } else if (gestureDirRef.current === 'horizontal') {
        swipeDxRef.current = dx
      }
    }

    function onMouseUp(e: MouseEvent) {
      if (isDraggingRef.current) {
        if (touchMovedRef.current < 10) {
          handleTap(e.clientX, e.clientY)
        } else if (gestureDirRef.current === 'horizontal') {
          if (swipeDxRef.current > SWIPE_THRESHOLD && currentRoomRef.current === 0) {
            switchToRoom(1)
          } else if (swipeDxRef.current < -SWIPE_THRESHOLD && currentRoomRef.current === 1) {
            switchToRoom(0)
          }
        }
      }
      isDraggingRef.current = false
      gestureDirRef.current = 'none'
      swipeDxRef.current = 0
    }

    function handleTap(clientX: number, clientY: number) {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const canvasX = clientX - rect.left
      const canvasY = clientY - rect.top

      // Outside scene: check café door tap to go inside
      if (sceneRef.current === 'outside') {
        const outsideW = OUTSIDE_COLS * TILE_PX
        const ocamX = Math.round(Math.max(0, (outsideW - viewWRef.current) / 2))
        const ocamY = outsideCamYRef.current
        const oworldX = canvasX + ocamX
        const oworldY = canvasY + ocamY
        const cafeDoorWX = CAFE_OUTSIDE_DOOR.col * TILE_PX + TILE_PX / 2
        const cafeDoorWY = CAFE_OUTSIDE_DOOR.row * TILE_PX + TILE_PX / 2
        if (Math.sqrt((oworldX - cafeDoorWX) ** 2 + (oworldY - cafeDoorWY) ** 2) < 50) {
          sceneRef.current = 'interior'
          setScene('interior')
        }
        return
      }

      // Interior scene
      const worldX = canvasX + cameraXRef.current
      const worldY = canvasY + cameraYRef.current

      // Check exit arrow tap (left of door tile)
      const doorWorldX = DOOR_POS.col * TILE_PX - TILE_PX / 2
      const doorWorldY = DOOR_POS.row * TILE_PX + TILE_PX / 2
      if (Math.sqrt((worldX - doorWorldX) ** 2 + (worldY - doorWorldY) ** 2) < 50) {
        sceneRef.current = 'outside'
        setScene('outside')
        // Center camera on the café (rows 7-11, center ~row 9)
        const cafeCenterY = 9 * TILE_PX
        outsideCamYRef.current = Math.max(0, cafeCenterY - viewHRef.current / 2)
        return
      }

      const state = cafeStateRef.current
      if (!state) return
      if (state.activeConvo) return

      const TAP_RADIUS = 60
      // Priority: exclamation customers first (interactive)
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
      // Then: any non-exclamation customer → show info
      for (const customer of state.customers) {
        if (customer.phase === 'exclamation' || customer.phase === 'exiting') continue
        const cx = customer.worldPos.x + TILE_PX / 2
        const cy = customer.worldPos.y + TILE_PX / 2
        const dist = Math.sqrt((worldX - cx) ** 2 + (worldY - cy) ** 2)
        if (dist < TAP_RADIUS) {
          onCharacterTap?.(customer.characterId)
          return
        }
      }
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      if (sceneRef.current === 'outside') {
        const outsideH = OUTSIDE_ROWS * TILE_PX
        const maxY = Math.max(0, outsideH - viewHRef.current)
        outsideCamYRef.current = Math.max(0, Math.min(maxY, outsideCamYRef.current + e.deltaY))
      } else {
        const maxY = Math.max(0, WORLD_H - viewHRef.current)
        cameraYRef.current = Math.max(0, Math.min(maxY, cameraYRef.current + e.deltaY))
      }
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: false })
    container.addEventListener('touchend', onTouchEnd)
    container.addEventListener('mousedown', onMouseDown)
    container.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
      container.removeEventListener('mousedown', onMouseDown)
      container.removeEventListener('wheel', onWheel)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [cafeStateRef, onCustomerTap, onCharacterTap])

  // Animation loop (re-runs when floor style changes to rebuild cache)
  useEffect(() => {
    floorSpriteRef.current = FLOOR_STYLES[floorStyle]

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    if (!ctx) return

    const spriteCache = buildSpriteCache(SCALE)
    // Ensure active floor is in the cache
    cacheSprite(spriteCache, floorSpriteRef.current, SCALE)
    let running = true
    let alertCheckCounter = 0

    function drawInterior(viewW: number, viewH: number) {
      // Smooth camera X toward target room (recalc centering for current viewport)
      targetCamXRef.current = getRoomCamX(currentRoomRef.current)
      const targetX = targetCamXRef.current
      const diff = targetX - cameraXRef.current
      if (Math.abs(diff) > 0.5) {
        cameraXRef.current += diff * ROOM_SWITCH_SPEED
      } else {
        cameraXRef.current = targetX
      }

      cameraYRef.current = Math.max(0, Math.min(WORLD_H - viewH, cameraYRef.current))

      const camX = Math.round(cameraXRef.current)
      const camY = Math.round(cameraYRef.current)

      ctx.imageSmoothingEnabled = false
      drawScene(ctx, spriteCache, camX, camY, viewW, viewH)

      // Draw barista behind counter (row 20, col 14 in cafe room)
      ctx.save()
      ctx.translate(-camX, -camY)
      const baristaSprite = CUSTOMER_SPRITES[0].up
      drawCached(ctx, spriteCache, baristaSprite, 14 * TILE_PX, 28 * TILE_PX)
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
          drawCached(ctx, spriteCache, sprite, customer.worldPos.x, customer.worldPos.y)

          // Draw name above head (unless exclamation is showing)
          if (customer.phase !== 'exclamation') {
            const char = getCharacter(customer.characterId)
            if (char) {
              const nameX = customer.worldPos.x + TILE_PX / 2
              const nameY = customer.worldPos.y - 4
              ctx.font = `bold ${Math.round(8 * SCALE)}px sans-serif`
              ctx.textAlign = 'center'
              ctx.fillStyle = 'rgba(0,0,0,0.5)'
              ctx.fillText(char.name, nameX + 1, nameY + 1)
              ctx.fillStyle = '#FFEFD5'
              ctx.fillText(char.name, nameX, nameY)
            }
          }

          if (customer.phase === 'exclamation') {
            const pulse = 1 + 0.15 * Math.sin(tickRef.current * 0.1)
            const exSize = SCALE * pulse
            const cachedEx = spriteCache.get(EXCLAMATION)
            if (cachedEx) {
              const exW = 16 * exSize
              const exH = 16 * exSize
              const exX = customer.worldPos.x + TILE_PX / 2 - exW / 2
              const exY = customer.worldPos.y - 20 * exSize
              ctx.drawImage(cachedEx, exX, exY, exW, exH)
            }
          }

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

        // Periodically check for exclamation in other room (every ~30 frames)
        alertCheckCounter++
        if (alertCheckCounter >= 30) {
          alertCheckCounter = 0
          const room = currentRoomRef.current
          const hasAlert = state.customers.some(c => {
            if (c.phase !== 'exclamation') return false
            const customerRoom = c.worldPos.x < ROOM_W ? 0 : 1
            return customerRoom !== room
          })
          setOtherRoomAlert(hasAlert)
        }
      }

      // Draw exit arrow on the door tile
      const doorWorldX = DOOR_POS.col * TILE_PX
      const doorWorldY = DOOR_POS.row * TILE_PX
      const arrowScreenX = doorWorldX - TILE_PX / 2 - camX
      const arrowScreenY = doorWorldY + TILE_PX / 2 - camY
      // Only draw if visible
      if (arrowScreenX > -40 && arrowScreenX < viewW + 40 && arrowScreenY > -40 && arrowScreenY < viewH + 40) {
        const pulse = 0.8 + 0.2 * Math.sin(tickRef.current * 0.08)
        ctx.save()
        ctx.globalAlpha = pulse
        ctx.font = `bold ${Math.round(14 * SCALE)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#FFD54F'
        ctx.shadowColor = 'rgba(0,0,0,0.6)'
        ctx.shadowBlur = 4
        ctx.fillText('▶', arrowScreenX, arrowScreenY)
        ctx.shadowBlur = 0
        ctx.font = `bold ${Math.round(5 * SCALE)}px sans-serif`
        ctx.fillStyle = '#FFEFD5'
        ctx.fillText('EXIT', arrowScreenX, arrowScreenY + 16 * SCALE)
        ctx.restore()
      }
    }

    function drawOutside(viewW: number, viewH: number) {
      const outsideW = OUTSIDE_COLS * TILE_PX
      const outsideH = OUTSIDE_ROWS * TILE_PX
      const maxY = Math.max(0, outsideH - viewH)
      outsideCamYRef.current = Math.max(0, Math.min(maxY, outsideCamYRef.current))
      const camY = Math.round(outsideCamYRef.current)
      // Center horizontally
      const camX = Math.round(Math.max(0, (outsideW - viewW) / 2))

      ctx.clearRect(0, 0, viewW, viewH)
      ctx.imageSmoothingEnabled = false

      const startCol = Math.max(0, Math.floor(camX / TILE_PX))
      const endCol = Math.min(OUTSIDE_COLS - 1, Math.floor((camX + viewW) / TILE_PX))
      const startRow = Math.max(0, Math.floor(camY / TILE_PX))
      const endRow = Math.min(OUTSIDE_ROWS - 1, Math.floor((camY + viewH) / TILE_PX))

      ctx.save()
      ctx.translate(-camX, -camY)
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const tileId = OUTSIDE_LAYOUT[row]?.[col] ?? T.EMPTY
          if (tileId === T.EMPTY) continue
          const px = col * TILE_PX
          const py = row * TILE_PX
          const spriteName = TILE_ID_TO_SPRITE[tileId]
          if (spriteName && SPRITE_MAP[spriteName]) {
            drawCached(ctx, spriteCache, SPRITE_MAP[spriteName], px, py)
          }
        }
      }
      ctx.restore()

      // Draw shop signs with colored accent bar
      const signs: { name: string; row: number; textColor: string; barColor: string }[] = [
        { name: 'Boulangerie', row: 1, textColor: '#FFEFD5', barColor: '#EF5350' },
        { name: 'Coffee Lingo', row: 7, textColor: '#FFD54F', barColor: '#5D4037' },
        { name: 'Librairie', row: 13, textColor: '#FFEFD5', barColor: '#42A5F5' },
        { name: 'Fleuriste', row: 18, textColor: '#FFEFD5', barColor: '#81C784' },
      ]
      for (const sign of signs) {
        const barX = 0 * TILE_PX - camX
        const barY = sign.row * TILE_PX - camY
        if (barY > -TILE_PX && barY < viewH + TILE_PX) {
          // Colored accent bar across the shop front
          ctx.fillStyle = sign.barColor
          ctx.fillRect(barX, barY, 4 * TILE_PX, TILE_PX * 0.55)
          // Bottom shadow
          ctx.fillStyle = 'rgba(0,0,0,0.2)'
          ctx.fillRect(barX, barY + TILE_PX * 0.55, 4 * TILE_PX, 3)
          // Sign text
          const sx = 2 * TILE_PX - camX
          const sy = barY + TILE_PX * 0.35
          ctx.save()
          ctx.font = `bold ${Math.round(7 * SCALE)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.fillStyle = 'rgba(0,0,0,0.4)'
          ctx.fillText(sign.name, sx + 1, sy + 1)
          ctx.fillStyle = sign.textColor
          ctx.fillText(sign.name, sx, sy)
          ctx.restore()
        }
      }

      // Draw enter arrow on the café door
      const cafeDoorX = CAFE_OUTSIDE_DOOR.col * TILE_PX + TILE_PX / 2 - camX
      const cafeDoorY = CAFE_OUTSIDE_DOOR.row * TILE_PX + TILE_PX / 2 - camY
      if (cafeDoorY > -40 && cafeDoorY < viewH + 40) {
        const pulse = 0.8 + 0.2 * Math.sin(tickRef.current * 0.08)
        ctx.save()
        ctx.globalAlpha = pulse
        ctx.font = `bold ${Math.round(14 * SCALE)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#FFD54F'
        ctx.shadowColor = 'rgba(0,0,0,0.6)'
        ctx.shadowBlur = 4
        ctx.fillText('▶', cafeDoorX, cafeDoorY)
        ctx.shadowBlur = 0
        ctx.font = `bold ${Math.round(5 * SCALE)}px sans-serif`
        ctx.fillStyle = '#FFEFD5'
        ctx.fillText('ENTER', cafeDoorX, cafeDoorY + 16 * SCALE)
        ctx.restore()
      }
    }

    function frame() {
      if (!running || !ctx) return

      tickRef.current++
      const viewW = viewWRef.current
      const viewH = viewHRef.current

      if (sceneRef.current === 'outside') {
        drawOutside(viewW, viewH)
      } else {
        drawInterior(viewW, viewH)
      }

      animRef.current = requestAnimationFrame(frame)
    }

    frame()

    return () => {
      running = false
      cancelAnimationFrame(animRef.current)
    }
  }, [drawScene, cafeStateRef, floorStyle, resolvedTileSprite])

  // Render full map onto popup canvas when opened
  useEffect(() => {
    if (!showMap) return
    const canvas = mapCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const mapScale = 0.5
    const pxPerTile = TILE_SIZE * mapScale
    canvas.width = GRID_COLS * pxPerTile
    canvas.height = GRID_ROWS * pxPerTile

    const cache = buildSpriteCache(mapScale)
    cacheSprite(cache, floorSpriteRef.current, mapScale)

    ctx.imageSmoothingEnabled = false

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tileId = CAFE_LAYOUT[row]?.[col] ?? T.EMPTY
        const px = col * pxPerTile
        const py = row * pxPerTile

        if (tileId === T.EMPTY) continue

        if (NEEDS_FLOOR.has(tileId)) {
          drawCached(ctx, cache, floorSpriteRef.current, px, py)
        }

        if (tileId === T.WALL) {
          drawCached(ctx, cache, WALL, px, py)
          continue
        }

        if (tileId === T.FLOOR) {
          drawCached(ctx, cache, floorSpriteRef.current, px, py)
          continue
        }

        if (tileId === T.POND) {
          const t = (CAFE_LAYOUT[row - 1]?.[col] === T.POND) ? 1 : 0
          const r = (CAFE_LAYOUT[row]?.[col + 1] === T.POND) ? 1 : 0
          const b = (CAFE_LAYOUT[row + 1]?.[col] === T.POND) ? 1 : 0
          const l = (CAFE_LAYOUT[row]?.[col - 1] === T.POND) ? 1 : 0
          const variant = POND_VARIANTS[`${t}${r}${b}${l}`]
          if (variant) drawCached(ctx, cache, variant, px, py)
          continue
        }

        if (tileId === T.FOUNTAIN) {
          const rightIsFountain = CAFE_LAYOUT[row]?.[col + 1] === T.FOUNTAIN
          drawCached(ctx, cache, rightIsFountain ? FOUNTAIN_L : FOUNTAIN_R, px, py)
          continue
        }

        const spriteName = resolvedTileSprite[tileId]
        if (spriteName && SPRITE_MAP[spriteName]) {
          drawCached(ctx, cache, SPRITE_MAP[spriteName], px, py)
        }
      }
    }
  }, [showMap, floorStyle])

  return (
    <div ref={containerRef} style={styles.container}>
      <canvas ref={canvasRef} style={styles.canvas} />
      {scene === 'interior' && (
        <>
          {/* Room switch arrow button */}
          <button
            style={{
              ...styles.roomArrow,
              ...(currentRoom === 1 ? styles.roomArrowLeft : styles.roomArrowRight),
            }}
            onClick={() => switchToRoom(currentRoom === 1 ? 0 : 1)}
          >
            {currentRoom === 1 ? '◀' : '▶'}
            {otherRoomAlert && <span style={styles.alertDot} />}
          </button>
          {/* Room label */}
          <div style={styles.roomLabel}>
            {currentRoom === 0 ? 'Reading Room' : 'Café'}
          </div>
          {/* Floor style toggle */}
          <button
            style={styles.floorToggle}
            onClick={() => setFloorStyle(f => {
              const i = unlockedFloors.indexOf(f)
              return unlockedFloors[(i + 1) % unlockedFloors.length]
            })}
          >
            {({ FLOOR_WOOD: '🪵', FLOOR_TILE: '🔲', FLOOR_HERRINGBONE: '🪵', FLOOR_MARBLE: '⬜' } as Record<string, string>)[floorStyle] ?? '🪵'}
          </button>
        </>
      )}
      {scene === 'outside' && (
        <div style={styles.roomLabel}>Outside</div>
      )}
      {/* Bottom buttons — always visible */}
      <button
        style={styles.contactsButton}
        onClick={() => onContactsTap?.()}
      >
        👥
      </button>
      <button
        style={styles.mapButton}
        onClick={() => setShowMap(true)}
      >
        🗺
      </button>
      {/* Full map popup */}
      {showMap && (
        <div style={styles.mapOverlay} onClick={() => setShowMap(false)}>
          <div style={styles.mapPopup} onClick={e => e.stopPropagation()}>
            <div style={styles.mapHeader}>
              <span>Full Map</span>
              <button style={styles.mapClose} onClick={() => setShowMap(false)}>✕</button>
            </div>
            <div style={styles.mapBody}>
              <canvas ref={mapCanvasRef} style={styles.mapCanvas} />
            </div>
          </div>
        </div>
      )}
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
  roomArrow: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 36,
    height: 60,
    background: 'rgba(93, 64, 55, 0.85)',
    color: '#FFEFD5',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  },
  roomArrowLeft: {
    left: 6,
  },
  roomArrowRight: {
    right: 6,
  },
  alertDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#FFD700',
    border: '1px solid #5D4037',
    animation: 'pulse 1s infinite',
  },
  roomLabel: {
    position: 'absolute',
    top: 8,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(93, 64, 55, 0.75)',
    color: '#FFEFD5',
    padding: '4px 12px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.5,
    zIndex: 5,
  },
  floorToggle: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 36,
    height: 36,
    background: 'rgba(93, 64, 55, 0.85)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  },
  contactsButton: {
    position: 'absolute',
    bottom: 10,
    right: 94,
    width: 36,
    height: 36,
    background: 'rgba(93, 64, 55, 0.85)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  },
  mapButton: {
    position: 'absolute',
    bottom: 10,
    right: 52,
    width: 36,
    height: 36,
    background: 'rgba(93, 64, 55, 0.85)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  },
  mapOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  mapPopup: {
    background: '#3E2723',
    borderRadius: 12,
    border: '2px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
    maxWidth: '90vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  mapHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    color: '#FFEFD5',
    fontSize: 14,
    fontWeight: 600,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  mapClose: {
    background: 'none',
    border: 'none',
    color: '#FFEFD5',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
  },
  mapBody: {
    overflow: 'auto',
    padding: 8,
  },
  mapCanvas: {
    imageRendering: 'pixelated' as const,
    display: 'block',
  },
}

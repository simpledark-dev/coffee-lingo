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
import type { WorldState, FurnishingItem, GridPos } from '../lib/types'
import { getActiveSpriteKey, getUpgradeTimeRemaining } from '../lib/upgrades'
import { getEffectiveTile, buildFurnishingSpriteMap, buildPositionToItemMap } from '../lib/furnishing'

interface CafeCanvasProps {
  cafeStateRef: React.RefObject<WorldState | null>
  onCustomerTap: (customerId: number) => void
  onCharacterTap?: (characterId: string) => void
  onContactsTap?: () => void
  onUpgradesTap?: () => void
  onDictionaryTap?: () => void
  onSettingsTap?: () => void
  onSceneChange?: (scene: 'interior' | 'outside') => void
  upgrades?: Record<string, import('../lib/types').UpgradeLevel>
  patioUnlocked?: boolean
  onPatioLockTap?: () => void
  placingItem?: FurnishingItem | null
  placingSlots?: GridPos[]
  onPlace?: (pos: GridPos) => void
  onCancelPlace?: () => void
  placedFurnishings?: Record<string, import('../lib/types').GridPos>
  furnishingUpgrades?: Record<string, import('../lib/types').UpgradeLevel>
  onFurnishingTap?: (itemId: string) => void
  hideBottomButtons?: boolean
  hasReadyUpgrades?: boolean
  lockInteraction?: boolean
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
const ROOM_SWITCH_SPEED = 0.06 // camera lerp factor per frame (lower = slower, 0.01–0.2)
const INERTIA_FRICTION = 0.92   // per-frame friction (0.85 = stops fast, 0.95 = slides long)
const INERTIA_SCALE = 12        // velocity multiplier (higher = faster initial coast)

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
  onDictionaryTap,
  onUpgradesTap,
  onSettingsTap,
  onSceneChange,
  upgrades,
  patioUnlocked = false,
  onPatioLockTap,
  placingItem,
  placingSlots,
  onPlace,
  onCancelPlace,
  placedFurnishings,
  furnishingUpgrades,
  onFurnishingTap,
  hideBottomButtons,
  hasReadyUpgrades,
  lockInteraction,
}: CafeCanvasProps) {
  // Build dynamic tile→sprite map based on upgrade tiers (infrastructure only)
  const resolvedTileSprite: Record<string, string> = useMemo(() => ({
    ...TILE_ID_TO_SPRITE,
    [T.MACHINE]: getActiveSpriteKey('COFFEE_MACHINE', upgrades),
    [T.COUNTER]: getActiveSpriteKey('COUNTER', upgrades),
    [T.COUNTER_L]: getActiveSpriteKey('COUNTER', upgrades),
  }), [upgrades])

  // Position-based sprite map for per-item furnishing upgrades
  const furnishingSpriteMap = useMemo(
    () => buildFurnishingSpriteMap(placedFurnishings ?? {}, furnishingUpgrades),
    [placedFurnishings, furnishingUpgrades]
  )
  const furnishingSpriteMapRef = useRef(furnishingSpriteMap)
  furnishingSpriteMapRef.current = furnishingSpriteMap

  const posToItemMap = useMemo(
    () => buildPositionToItemMap(placedFurnishings ?? {}),
    [placedFurnishings]
  )
  const posToItemMapRef = useRef(posToItemMap)
  posToItemMapRef.current = posToItemMap
  const onFurnishingTapRef = useRef(onFurnishingTap)
  onFurnishingTapRef.current = onFurnishingTap
  const furnishingUpgradesRef = useRef(furnishingUpgrades)
  furnishingUpgradesRef.current = furnishingUpgrades
  const placedFurnishingsRef = useRef(placedFurnishings)
  placedFurnishingsRef.current = placedFurnishings

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>(0)

  // Camera
  const cameraXRef = useRef(ROOM_W * 2) // start in cafe (room 2)
  const cameraYRef = useRef(0)
  const targetCamXRef = useRef(ROOM_W * 2) // smooth animation target
  const targetCamYRef = useRef<number | null>(null) // smooth Y animation (null = no target)
  const viewWRef = useRef(390)
  const viewHRef = useRef(500)

  // Current room (0 = patio, 1 = reading, 2 = cafe)
  const currentRoomRef = useRef(2)
  const [currentRoom, setCurrentRoom] = useState(2)
  const patioUnlockedRef = useRef(patioUnlocked)
  patioUnlockedRef.current = patioUnlocked
  const lockInteractionRef = useRef(lockInteraction)
  lockInteractionRef.current = lockInteraction
  const placingSlotsRef = useRef(placingSlots)
  placingSlotsRef.current = placingSlots
  const placingItemRef = useRef(placingItem)
  placingItemRef.current = placingItem
  const onPlaceRef = useRef(onPlace)
  onPlaceRef.current = onPlace

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
  const lastTouchYRef = useRef(0)
  const lastTouchTimeRef = useRef(0)
  const velocityYRef = useRef(0)

  // Exclamation pulse animation
  const tickRef = useRef(0)

  // Check if other room has exclamation customers
  const [otherRoomAlert, setOtherRoomAlert] = useState(false)

  // Scene: interior (cafe + reading room) or outside
  const [scene, setScene] = useState<'interior' | 'outside'>('interior')
  const sceneRef = useRef<'interior' | 'outside'>('interior')
  const outsideCamYRef = useRef(0)
  const outsideCamStartYRef = useRef(0)

  // Outside scene: shops aligned to tile-grid rows
  // Each shop's { startRow, endRow } matches OUTSIDE_LAYOUT
  const OUTSIDE_SHOPS = useMemo(() => [
    { name: 'Boulangerie', wallColor: '#D4A373', wallDark: '#C4956A', awningColor: '#C62828', awningStripe: '#A01919', trimColor: '#8B5E3C', locked: true, startRow: 1, endRow: 3 },
    { name: 'Coffee Lingo', wallColor: '#5D4037', wallDark: '#4E342E', awningColor: '#6D4C41', awningStripe: '#4E342E', trimColor: '#3E2723', locked: false, startRow: 5, endRow: 8 },
    { name: 'Librairie', wallColor: '#B0BEC5', wallDark: '#90A4AE', awningColor: '#1565C0', awningStripe: '#0D47A1', trimColor: '#546E7A', locked: true, startRow: 10, endRow: 12 },
    { name: 'Fleuriste', wallColor: '#C8E6C9', wallDark: '#A5D6A7', awningColor: '#2E7D32', awningStripe: '#1B5E20', trimColor: '#4CAF50', locked: true, startRow: 14, endRow: 16 },
  ], [])

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

  // Auto-navigate to the item's room when entering placement mode
  useEffect(() => {
    if (!placingItem) return
    const targetRoom = placingItem.room === 'patio' ? 0 : placingItem.room === 'reading' ? 1 : 2
    if (currentRoomRef.current !== targetRoom) {
      switchToRoom(targetRoom)
    }
    // Smooth-scroll Y to center on the placement slots
    const slots = placingSlotsRef.current
    if (slots && slots.length > 0) {
      const avgRow = slots.reduce((sum, s) => sum + s.row, 0) / slots.length
      const targetY = avgRow * TILE_PX - viewHRef.current / 2
      const maxY = Math.max(0, WORLD_H - viewHRef.current)
      targetCamYRef.current = Math.max(0, Math.min(maxY, targetY))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placingItem])

  const drawScene = useCallback((ctx: CanvasRenderingContext2D, cache: SpriteCache, camX: number, camY: number, viewW: number, viewH: number) => {
    ctx.clearRect(0, 0, viewW, viewH)
    const floor = floorSpriteRef.current

    const startCol = Math.max(0, Math.floor(camX / TILE_PX))
    const endCol = Math.min(GRID_COLS - 1, Math.floor((camX + viewW) / TILE_PX))
    const startRow = Math.max(0, Math.floor(camY / TILE_PX))
    const endRow = Math.min(GRID_ROWS - 1, Math.floor((camY + viewH) / TILE_PX))

    ctx.save()
    ctx.translate(-camX, -camY)

    const tileOverrides = cafeStateRef.current?.tileOverrides
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tileId = tileOverrides?.size ? getEffectiveTile(row, col, tileOverrides) : (CAFE_LAYOUT[row]?.[col] ?? T.EMPTY)
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

        // Per-item furnishing sprite takes priority, then category fallback
        const posKey = `${row},${col}`
        const spriteName = furnishingSpriteMapRef.current.get(posKey) ?? resolvedTileSprite[tileId]
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
      if (lockInteractionRef.current) return
      if (e.touches.length !== 1) return
      isDraggingRef.current = true
      touchStartYRef.current = e.touches[0].clientY
      touchStartXRef.current = e.touches[0].clientX
      cameraStartYRef.current = cameraYRef.current
      outsideCamStartYRef.current = outsideCamYRef.current
      touchMovedRef.current = 0
      gestureDirRef.current = 'none'
      swipeDxRef.current = 0
      lastTouchYRef.current = e.touches[0].clientY
      lastTouchTimeRef.current = Date.now()
      velocityYRef.current = 0
    }

    function onTouchMove(e: TouchEvent) {
      if (!isDraggingRef.current || e.touches.length !== 1) return
      // Don't preventDefault on button taps — it suppresses click on mobile
      const target = e.target as Element
      if (!target.closest?.('button')) e.preventDefault()
      const dy = touchStartYRef.current - e.touches[0].clientY
      const dx = touchStartXRef.current - e.touches[0].clientX
      const totalMove = Math.sqrt(dx * dx + dy * dy)
      touchMovedRef.current = totalMove

      // Lock gesture direction after dead zone
      if (gestureDirRef.current === 'none' && totalMove > GESTURE_DEAD_ZONE) {
        gestureDirRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
      }

      if (gestureDirRef.current === 'vertical') {
        // Track velocity for inertia
        const now = Date.now()
        const dt = now - lastTouchTimeRef.current
        if (dt > 0) {
          const moveDy = lastTouchYRef.current - e.touches[0].clientY
          velocityYRef.current = moveDy / dt // px per ms
        }
        lastTouchYRef.current = e.touches[0].clientY
        lastTouchTimeRef.current = now

        if (sceneRef.current === 'outside') {
          const outsideH = OUTSIDE_ROWS * TILE_PX
          const maxY = Math.max(0, outsideH - viewHRef.current)
          outsideCamYRef.current = Math.max(0, Math.min(maxY, outsideCamStartYRef.current + dy))
        } else {
          const maxY = Math.max(0, WORLD_H - viewHRef.current)
          cameraYRef.current = Math.max(0, Math.min(maxY, cameraStartYRef.current + dy))
          targetCamYRef.current = null // cancel smooth scroll on manual drag
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
          velocityYRef.current = 0
        } else if (gestureDirRef.current === 'horizontal') {
          // Check for room switch
          const minRoom = patioUnlockedRef.current ? 0 : 1
          if (swipeDxRef.current > SWIPE_THRESHOLD && currentRoomRef.current < 2) {
            switchToRoom(currentRoomRef.current + 1)
          } else if (swipeDxRef.current < -SWIPE_THRESHOLD && currentRoomRef.current > minRoom) {
            switchToRoom(currentRoomRef.current - 1)
          }
          velocityYRef.current = 0
        }
        // else: vertical gesture ends — velocity is preserved for inertia
      }
      isDraggingRef.current = false
      gestureDirRef.current = 'none'
      swipeDxRef.current = 0
    }

    function onMouseDown(e: MouseEvent) {
      if (lockInteractionRef.current) return
      isDraggingRef.current = true
      touchStartYRef.current = e.clientY
      touchStartXRef.current = e.clientX
      cameraStartYRef.current = cameraYRef.current
      outsideCamStartYRef.current = outsideCamYRef.current
      touchMovedRef.current = 0
      gestureDirRef.current = 'none'
      swipeDxRef.current = 0
      lastTouchYRef.current = e.clientY
      lastTouchTimeRef.current = Date.now()
      velocityYRef.current = 0
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
        const now = Date.now()
        const dt = now - lastTouchTimeRef.current
        if (dt > 0) {
          const moveDy = lastTouchYRef.current - e.clientY
          velocityYRef.current = moveDy / dt
        }
        lastTouchYRef.current = e.clientY
        lastTouchTimeRef.current = now

        if (sceneRef.current === 'outside') {
          const outsideH = OUTSIDE_ROWS * TILE_PX
          const maxY = Math.max(0, outsideH - viewHRef.current)
          outsideCamYRef.current = Math.max(0, Math.min(maxY, outsideCamStartYRef.current + dy))
        } else {
          const maxY = Math.max(0, WORLD_H - viewHRef.current)
          cameraYRef.current = Math.max(0, Math.min(maxY, cameraStartYRef.current + dy))
          targetCamYRef.current = null // cancel smooth scroll on manual drag
        }
      } else if (gestureDirRef.current === 'horizontal') {
        swipeDxRef.current = dx
      }
    }

    function onMouseUp(e: MouseEvent) {
      if (isDraggingRef.current) {
        if (touchMovedRef.current < 10) {
          handleTap(e.clientX, e.clientY)
          velocityYRef.current = 0
        } else if (gestureDirRef.current === 'horizontal') {
          const minRoom = patioUnlockedRef.current ? 0 : 1
          if (swipeDxRef.current > SWIPE_THRESHOLD && currentRoomRef.current < 2) {
            switchToRoom(currentRoomRef.current + 1)
          } else if (swipeDxRef.current < -SWIPE_THRESHOLD && currentRoomRef.current > minRoom) {
            switchToRoom(currentRoomRef.current - 1)
          }
          velocityYRef.current = 0
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

      // Outside scene: check if tapping the Coffee Lingo shop
      if (sceneRef.current === 'outside') {
        const camY = outsideCamYRef.current
        const outsideW = OUTSIDE_COLS * TILE_PX
        const bgCamX = Math.max(0, (outsideW - viewWRef.current) / 2)
        const worldX = canvasX + bgCamX
        const worldY = canvasY + camY
        // Check tap on outside characters (info popup)
        const outsideState = cafeStateRef.current
        if (outsideState) {
          const TAP_R = 60
          for (const customer of outsideState.characters) {
            if (customer.location !== 'outside') continue
            const cx = customer.outsideWorldPos.x + TILE_PX / 2
            const cy = customer.outsideWorldPos.y + TILE_PX / 2
            if (Math.sqrt((worldX - cx) ** 2 + (worldY - cy) ** 2) < TAP_R) {
              onCharacterTap?.(customer.characterId)
              return
            }
          }
        }

        // Café occupies rows 5-8, cols 0-3
        const cafeX0 = 0
        const cafeX1 = 4 * TILE_PX
        const cafeY0 = 5 * TILE_PX
        const cafeY1 = 9 * TILE_PX
        if (worldX >= cafeX0 && worldX <= cafeX1 && worldY >= cafeY0 && worldY <= cafeY1) {
          sceneRef.current = 'interior'
          setScene('interior')
          onSceneChange?.('interior')
          // Ensure camera is on the café room (room 2)
          switchToRoom(2)
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
        onSceneChange?.('outside')
        // Center camera on the café (rows 5-8, center ~row 6)
        const cafeCenterY = 6 * TILE_PX
        outsideCamYRef.current = Math.max(0, cafeCenterY - viewHRef.current / 2)
        return
      }

      // Check placement slot tap
      if (placingSlotsRef.current && placingSlotsRef.current.length > 0) {
        const tappedCol = Math.floor(worldX / TILE_PX)
        const tappedRow = Math.floor(worldY / TILE_PX)
        for (const slot of placingSlotsRef.current) {
          if (slot.row === tappedRow && slot.col === tappedCol) {
            onPlaceRef.current?.(slot)
            return
          }
        }
        return // in placement mode, ignore other taps
      }

      // Check patio lock tap (border col 10-11, rows 21-22 center)
      if (!patioUnlockedRef.current) {
        const lockX = 11 * TILE_PX
        const lockY = 21.5 * TILE_PX
        if (Math.sqrt((worldX - lockX) ** 2 + (worldY - lockY) ** 2) < TILE_PX * 0.7) {
          onPatioLockTap?.()
          return
        }
      }

      const state = cafeStateRef.current
      if (!state) return
      if (state.activeConvo) return

      // Priority: exclamation customers first (interactive)
      // Hitbox includes the exclamation mark above the character
      const PAD = TILE_PX * 0.2 // shrink hitbox to ~60% of tile
      for (const customer of state.characters) {
        if (customer.location !== 'interior' || customer.phase !== 'exclamation') continue
        const left = customer.worldPos.x + PAD
        const top = customer.worldPos.y - TILE_PX * 0.6 // extend upward for exclamation
        const width = TILE_PX - PAD * 2
        const height = TILE_PX * 1.6 - PAD // body + exclamation area
        if (worldX >= left && worldX < left + width && worldY >= top && worldY < top + height) {
          onCustomerTap(customer.id)
          return
        }
      }
      // Check if tapped on a placed furnishing tile (before character info, so tables win)
      const tappedCol = Math.floor(worldX / TILE_PX)
      const tappedRow = Math.floor(worldY / TILE_PX)
      const tappedItemId = posToItemMapRef.current.get(`${tappedRow},${tappedCol}`)
      if (tappedItemId) {
        onFurnishingTapRef.current?.(tappedItemId)
        return
      }

      // Then: any non-exclamation interior customer → show info
      for (const customer of state.characters) {
        if (customer.location !== 'interior') continue
        if (customer.phase === 'exclamation') continue
        const left = customer.worldPos.x + PAD
        const top = customer.worldPos.y + PAD
        const size = TILE_PX - PAD * 2
        if (worldX >= left && worldX < left + size && worldY >= top && worldY < top + size) {
          onCharacterTap?.(customer.characterId)
          return
        }
      }

      // (furnishing tap already handled above)
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

      // Smooth camera Y toward target (if set)
      if (targetCamYRef.current !== null) {
        const diffY = targetCamYRef.current - cameraYRef.current
        if (Math.abs(diffY) > 0.5) {
          cameraYRef.current += diffY * ROOM_SWITCH_SPEED
        } else {
          cameraYRef.current = targetCamYRef.current
          targetCamYRef.current = null
        }
      }
      // Apply vertical inertia when not dragging (skip when modal open)
      if (!lockInteractionRef.current && !isDraggingRef.current && Math.abs(velocityYRef.current) > 0.01) {
        cameraYRef.current += velocityYRef.current * INERTIA_SCALE // ~16ms per frame
        velocityYRef.current *= INERTIA_FRICTION // friction
        if (Math.abs(velocityYRef.current) < 0.01) velocityYRef.current = 0
      } else if (lockInteractionRef.current) {
        velocityYRef.current = 0
      }

      cameraYRef.current = Math.max(0, Math.min(WORLD_H - viewH, cameraYRef.current))

      const camX = Math.round(cameraXRef.current)
      const camY = Math.round(cameraYRef.current)

      ctx.imageSmoothingEnabled = false
      drawScene(ctx, spriteCache, camX, camY, viewW, viewH)

      // Draw barista behind counter (row 28, col 24 in cafe room)
      ctx.save()
      ctx.translate(-camX, -camY)
      const baristaSprite = CUSTOMER_SPRITES[0].up
      drawCached(ctx, spriteCache, baristaSprite, 24 * TILE_PX, 28 * TILE_PX)
      ctx.restore()

      // Upgrade button moved to HTML overlay (bottom bar)

      // Draw customers sorted by Y for depth
      const state = cafeStateRef.current
      if (state) {
        const sorted = state.characters.filter(c => c.location === 'interior').sort((a, b) => a.worldPos.y - b.worldPos.y)

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
          const hasAlert = state.characters.some(c => {
            if (c.location !== 'interior' || c.phase !== 'exclamation') return false
            const customerRoom = Math.floor(c.worldPos.x / ROOM_W)
            return customerRoom !== room
          })
          setOtherRoomAlert(hasAlert)
        }
      }

      // When patio is locked, draw wall over the doorway tiles (col 10, rows 21-22)
      if (!patioUnlockedRef.current) {
        for (const dr of [21, 22]) {
          const wallPx = 10 * TILE_PX - camX
          const wallPy = dr * TILE_PX - camY
          if (wallPx > -TILE_PX && wallPx < viewW + TILE_PX && wallPy > -TILE_PX && wallPy < viewH + TILE_PX) {
            drawCached(ctx, spriteCache, WALL, wallPx, wallPy)
          }
        }
      }

      // Draw patio lock centered on the wall/floor border (between col 10 and col 11)
      if (!patioUnlockedRef.current) {
        const lockWorldX = 11 * TILE_PX                   // border between col 10 (wall) and col 11 (floor)
        const lockWorldY = 21.5 * TILE_PX                // center between rows 21-22
        const lockScreenX = lockWorldX - camX
        const lockScreenY = lockWorldY - camY
        if (lockScreenX > -TILE_PX && lockScreenX < viewW + TILE_PX &&
          lockScreenY > -TILE_PX && lockScreenY < viewH + TILE_PX) {
          ctx.save()
          // Lock background circle
          ctx.beginPath()
          ctx.arc(lockScreenX, lockScreenY, TILE_PX * 0.42, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(62, 39, 35, 0.85)'
          ctx.fill()
          ctx.strokeStyle = '#FFD54F'
          ctx.lineWidth = 2
          ctx.stroke()
          // Lock emoji
          ctx.font = `${Math.round(12 * SCALE)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('🔒', lockScreenX, lockScreenY)
          ctx.restore()
        }
      }

      // Draw furnishing upgrade indicators on all tiles belonging to the item
      const fUpgrades = furnishingUpgradesRef.current
      const fPlaced = placedFurnishingsRef.current
      if (fUpgrades && fPlaced) {
        // Build set of positions per upgrading item using posToItemMap
        const posMap = posToItemMapRef.current
        const drawnItems = new Set<string>()
        for (const [posKey, itemId] of posMap.entries()) {
          if (drawnItems.has(itemId)) continue
          const level = fUpgrades[itemId]
          if (!level?.upgrading) continue
          // Find the first visible tile for this item
          const [rowStr, colStr] = posKey.split(',')
          const tileRow = Number(rowStr)
          const tileCol = Number(colStr)
          const sx = tileCol * TILE_PX - camX
          const sy = tileRow * TILE_PX - camY
          if (sx < -TILE_PX || sx > viewW + TILE_PX || sy < -TILE_PX || sy > viewH + TILE_PX) continue
          drawnItems.add(itemId)

          const remaining = getUpgradeTimeRemaining(level)
          const iconSize = 14
          const cx = sx + TILE_PX / 2
          const cy = sy + TILE_PX / 2

          if (remaining === 0) {
            // Ready to install — green circle with checkmark
            ctx.save()
            const pulse = 0.7 + 0.3 * Math.sin(tickRef.current * 0.1)
            ctx.beginPath()
            ctx.arc(cx, cy, iconSize / 2 + 1, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(76, 175, 80, ${pulse})`
            ctx.fill()
            ctx.strokeStyle = '#fff'
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.moveTo(cx - 4, cy)
            ctx.lineTo(cx - 1, cy + 3)
            ctx.lineTo(cx + 4, cy - 3)
            ctx.stroke()
            ctx.restore()
          } else {
            // Upgrading — small circular progress indicator
            const progress = level.upgrading.durationMs > 0
              ? 1 - remaining / level.upgrading.durationMs : 0
            ctx.save()
            ctx.beginPath()
            ctx.arc(cx, cy, iconSize / 2, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
            ctx.fill()
            ctx.beginPath()
            ctx.moveTo(cx, cy)
            ctx.arc(cx, cy, iconSize / 2,
              -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2)
            ctx.closePath()
            ctx.fillStyle = '#FFD54F'
            ctx.fill()
            ctx.restore()
          }
        }
      }

      // Draw placement mode glowing slots (including group tiles)
      if (placingSlotsRef.current && placingSlotsRef.current.length > 0) {
        const pulse = 0.4 + 0.3 * Math.sin(tickRef.current * 0.08)
        const group = placingItemRef.current?.group
        for (const slot of placingSlotsRef.current) {
          // Collect all tiles to highlight: base slot + group offsets
          const tiles = [{ row: slot.row, col: slot.col }]
          if (group) {
            for (const g of group) {
              tiles.push({ row: slot.row + g.dr, col: slot.col + g.dc })
            }
          }
          for (const tile of tiles) {
            const sx = tile.col * TILE_PX - camX
            const sy = tile.row * TILE_PX - camY
            if (sx > -TILE_PX && sx < viewW + TILE_PX && sy > -TILE_PX && sy < viewH + TILE_PX) {
              ctx.save()
              ctx.globalAlpha = pulse
              ctx.fillStyle = '#FFD54F'
              ctx.fillRect(sx + 2, sy + 2, TILE_PX - 4, TILE_PX - 4)
              ctx.restore()
              ctx.strokeStyle = '#FFD54F'
              ctx.lineWidth = 2
              ctx.strokeRect(sx + 1, sy + 1, TILE_PX - 2, TILE_PX - 2)
            }
          }
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
        ctx.shadowColor = 'rgba(0,0,0,0.6)'
        ctx.shadowBlur = 4
        // Draw triangle arrow instead of emoji for cross-platform consistency
        const arrowSize = 8 * SCALE
        ctx.fillStyle = '#FFD54F'
        ctx.beginPath()
        ctx.moveTo(arrowScreenX - arrowSize / 2, arrowScreenY - arrowSize)
        ctx.lineTo(arrowScreenX + arrowSize, arrowScreenY)
        ctx.lineTo(arrowScreenX - arrowSize / 2, arrowScreenY + arrowSize)
        ctx.closePath()
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.font = `bold ${Math.round(5 * SCALE)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#FFEFD5'
        ctx.fillText('EXIT', arrowScreenX, arrowScreenY + 16 * SCALE)
        ctx.restore()
      }
    }

    // Outside scene — tile background + colored shop rectangles aligned to tile grid
    const outsideTotalH = OUTSIDE_ROWS * TILE_PX
    const SHOP_COLS = 4 // shops span cols 0-3

    function drawOutside(viewW: number, viewH: number) {
      // Apply vertical inertia when not dragging (skip when modal open)
      if (!lockInteractionRef.current && !isDraggingRef.current && Math.abs(velocityYRef.current) > 0.01) {
        outsideCamYRef.current += velocityYRef.current * INERTIA_SCALE
        velocityYRef.current *= INERTIA_FRICTION
        if (Math.abs(velocityYRef.current) < 0.01) velocityYRef.current = 0
      } else if (lockInteractionRef.current) {
        velocityYRef.current = 0
      }

      const maxY = Math.max(0, outsideTotalH - viewH)
      outsideCamYRef.current = Math.max(0, Math.min(maxY, outsideCamYRef.current))
      const camY = Math.round(outsideCamYRef.current)

      ctx.clearRect(0, 0, viewW, viewH)
      ctx.imageSmoothingEnabled = false

      // Tile-based background — 1:1 scrolling with camY
      const outsideW = OUTSIDE_COLS * TILE_PX
      const bgCamX = Math.round(Math.max(0, (outsideW - viewW) / 2))
      const startCol = Math.max(0, Math.floor(bgCamX / TILE_PX))
      const endCol = Math.min(OUTSIDE_COLS - 1, Math.floor((bgCamX + viewW) / TILE_PX))
      const startRow = Math.max(0, Math.floor(camY / TILE_PX))
      const endRow = Math.min(OUTSIDE_ROWS - 1, Math.floor((camY + viewH) / TILE_PX))

      // Set of tile IDs that get replaced by rectangles (skip drawing these)
      const SHOP_TILE_IDS: Set<string> = new Set([T.SHOP_WALL, T.SHOP_WALL_LIGHT, T.SHOP_WINDOW, T.LOCKED_DOOR, T.CAFE_DOOR])

      ctx.save()
      ctx.translate(-bgCamX, -camY)

      // Draw non-shop tiles
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const tileId = OUTSIDE_LAYOUT[row]?.[col] ?? T.EMPTY
          if (tileId === T.EMPTY) continue
          // Skip shop wall/window/door tiles in cols 0-3 — rectangles replace them
          if (col < SHOP_COLS && SHOP_TILE_IDS.has(tileId)) continue
          const px = col * TILE_PX
          const py = row * TILE_PX
          const spriteName = TILE_ID_TO_SPRITE[tileId]
          if (spriteName && SPRITE_MAP[spriteName]) {
            drawCached(ctx, spriteCache, SPRITE_MAP[spriteName], px, py)
          }
        }
      }

      // Draw buildings at tile-grid positions (still in world coords)
      for (const shop of OUTSIDE_SHOPS) {
        const y = shop.startRow * TILE_PX
        const h = (shop.endRow - shop.startRow + 1) * TILE_PX
        const x = 0
        const w = SHOP_COLS * TILE_PX

        // Culling
        if (y + h < camY - 20 || y > camY + viewH + 20) continue

        // Drop shadow
        ctx.fillStyle = 'rgba(0,0,0,0.18)'
        ctx.fillRect(x + 3, y + 3, w, h)

        // Wall base
        ctx.fillStyle = shop.wallColor
        ctx.fillRect(x, y, w, h)

        // Brick/stone texture — subtle horizontal mortar lines
        ctx.strokeStyle = shop.wallDark
        ctx.lineWidth = 1
        const brickH = 8
        for (let by = y + brickH; by < y + h; by += brickH) {
          ctx.beginPath()
          ctx.moveTo(x, by)
          ctx.lineTo(x + w, by)
          ctx.globalAlpha = 0.2
          ctx.stroke()
        }
        // Vertical mortar (offset every other row)
        const brickW = 16
        for (let row2 = 0; row2 * brickH < h; row2++) {
          const by = y + row2 * brickH
          const offset = (row2 % 2) * (brickW / 2)
          for (let bx = x + offset + brickW; bx < x + w; bx += brickW) {
            ctx.beginPath()
            ctx.moveTo(bx, by)
            ctx.lineTo(bx, by + brickH)
            ctx.stroke()
          }
        }
        ctx.globalAlpha = 1

        // Foundation / base strip
        const baseH = 6
        ctx.fillStyle = shop.trimColor
        ctx.fillRect(x, y + h - baseH, w, baseH)

        // --- Windows ---
        const winW = 36
        const winH = 30
        const winY = y + h * 0.35
        const winGap = 14
        const totalWinW = winW * 2 + winGap
        const winStartX = x + (w - totalWinW) / 2

        for (let wi = 0; wi < 2; wi++) {
          const wx = winStartX + wi * (winW + winGap)
          // Window recess
          ctx.fillStyle = 'rgba(0,0,0,0.15)'
          ctx.fillRect(wx - 1, winY - 1, winW + 2, winH + 2)
          // Glass — dark with blue tint
          ctx.fillStyle = '#1A3A5C'
          ctx.fillRect(wx, winY, winW, winH)
          // Reflection highlight
          ctx.fillStyle = 'rgba(150,200,255,0.25)'
          ctx.fillRect(wx + 2, winY + 2, winW * 0.4, winH - 4)
          ctx.fillStyle = 'rgba(200,230,255,0.12)'
          ctx.fillRect(wx + winW * 0.5, winY + winH * 0.3, winW * 0.3, winH * 0.4)
          // Frame
          ctx.strokeStyle = shop.trimColor
          ctx.lineWidth = 2
          ctx.strokeRect(wx, winY, winW, winH)
          // Cross bar
          ctx.beginPath()
          ctx.moveTo(wx + winW / 2, winY)
          ctx.lineTo(wx + winW / 2, winY + winH)
          ctx.moveTo(wx, winY + winH / 2)
          ctx.lineTo(wx + winW, winY + winH / 2)
          ctx.lineWidth = 1.5
          ctx.stroke()
        }

        // --- Door ---
        const doorW = 22
        const doorH = 36
        const doorX = x + w / 2 - doorW / 2
        const doorY = y + h - baseH - doorH
        // Door recess
        ctx.fillStyle = 'rgba(0,0,0,0.2)'
        ctx.fillRect(doorX - 1, doorY - 1, doorW + 2, doorH + 2)
        // Door body
        ctx.fillStyle = shop.locked ? '#5D4037' : '#3E2723'
        ctx.fillRect(doorX, doorY, doorW, doorH)
        // Door panels
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'
        ctx.lineWidth = 1
        ctx.strokeRect(doorX + 3, doorY + 3, doorW - 6, doorH * 0.4)
        ctx.strokeRect(doorX + 3, doorY + doorH * 0.5, doorW - 6, doorH * 0.4)
        // Door handle
        ctx.fillStyle = '#FFD54F'
        ctx.beginPath()
        ctx.arc(doorX + doorW - 5, doorY + doorH / 2, 2, 0, Math.PI * 2)
        ctx.fill()
        // Small window in door top
        ctx.fillStyle = '#1A3A5C'
        ctx.fillRect(doorX + 5, doorY + 5, doorW - 10, doorH * 0.25)
        ctx.fillStyle = 'rgba(150,200,255,0.2)'
        ctx.fillRect(doorX + 6, doorY + 6, (doorW - 10) * 0.4, doorH * 0.2)

        // --- Awning ---
        const awningH = 14
        const awningOverhang = 6
        ctx.fillStyle = shop.awningColor
        // Awning shape — slight trapezoid
        ctx.beginPath()
        ctx.moveTo(x - 2, y)
        ctx.lineTo(x + w + 2, y)
        ctx.lineTo(x + w + awningOverhang, y + awningH)
        ctx.lineTo(x - awningOverhang, y + awningH)
        ctx.closePath()
        ctx.fill()
        // Awning stripes
        const stripeW = 12
        ctx.fillStyle = shop.awningStripe
        for (let sx = x; sx < x + w; sx += stripeW * 2) {
          ctx.beginPath()
          const t0 = (sx - x) / w
          const t1 = Math.min(1, (sx + stripeW - x) / w)
          const lx0 = x - awningOverhang + (w + 2 * awningOverhang) * t0
          const lx1 = x - awningOverhang + (w + 2 * awningOverhang) * t1
          ctx.moveTo(sx, y)
          ctx.lineTo(sx + stripeW, y)
          ctx.lineTo(lx1, y + awningH)
          ctx.lineTo(lx0, y + awningH)
          ctx.closePath()
          ctx.fill()
        }
        // Awning bottom edge shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)'
        ctx.fillRect(x - awningOverhang, y + awningH, w + awningOverhang * 2, 2)
        // Scalloped edge
        ctx.fillStyle = shop.awningColor
        const scallops = 10
        const scW = (w + awningOverhang * 2) / scallops
        for (let si = 0; si < scallops; si++) {
          const sx2 = x - awningOverhang + si * scW + scW / 2
          ctx.beginPath()
          ctx.arc(sx2, y + awningH + 1, scW / 2.5, 0, Math.PI)
          ctx.fill()
        }

        // --- Sign text on awning ---
        ctx.save()
        ctx.font = `bold ${Math.round(7 * SCALE)}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        // Text shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillText(shop.name, x + w / 2 + 1, y + awningH / 2 + 1)
        ctx.fillStyle = '#FFEFD5'
        ctx.fillText(shop.name, x + w / 2, y + awningH / 2)
        ctx.restore()

        // Border outline
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'
        ctx.lineWidth = 1.5
        ctx.strokeRect(x, y, w, h)

        // --- Locked overlay or enter hint ---
        if (shop.locked) {
          // Darken slightly
          ctx.fillStyle = 'rgba(0,0,0,0.15)'
          ctx.fillRect(x, y, w, h)
          ctx.save()
          ctx.font = `${Math.round(6 * SCALE)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.fillStyle = 'rgba(255,255,255,0.5)'
          ctx.fillText('Coming soon', x + w / 2, y + h - baseH - 10)
          ctx.restore()
        } else {
          const pulse = 0.7 + 0.3 * Math.sin(tickRef.current * 0.08)
          ctx.save()
          ctx.globalAlpha = pulse
          ctx.font = `bold ${Math.round(8 * SCALE)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = '#FFD54F'
          ctx.shadowColor = 'rgba(0,0,0,0.5)'
          ctx.shadowBlur = 4
          ctx.fillText('ENTER', x + w / 2, y + h - baseH - 14)
          ctx.restore()
        }
      }

      // Draw outside characters
      const outsideState = cafeStateRef.current
      if (outsideState) {
        const outsideChars = outsideState.characters
          .filter(c => c.location === 'outside')
          .sort((a, b) => a.outsideWorldPos.y - b.outsideWorldPos.y)

        for (const customer of outsideChars) {
          const spriteSet = CUSTOMER_SPRITES[customer.spriteVariant % CUSTOMER_SPRITES.length]
          const sprite = spriteSet[customer.facingDir]
          const pos = customer.outsideWorldPos
          drawCached(ctx, spriteCache, sprite, pos.x - bgCamX, pos.y - camY)

          // Name above head
          const char = getCharacter(customer.characterId)
          if (char) {
            const nameX = pos.x - bgCamX + TILE_PX / 2
            const nameY = pos.y - camY - 4
            ctx.font = `bold ${Math.round(8 * SCALE)}px sans-serif`
            ctx.textAlign = 'center'
            ctx.fillStyle = 'rgba(0,0,0,0.5)'
            ctx.fillText(char.name, nameX + 1, nameY + 1)
            ctx.fillStyle = '#FFEFD5'
            ctx.fillText(char.name, nameX, nameY)
          }
        }
      }

      ctx.restore()
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

        const posKey = `${row},${col}`
        const spriteName = furnishingSpriteMapRef.current.get(posKey) ?? resolvedTileSprite[tileId]
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
          {/* Room switch arrow buttons */}
          {currentRoom > (patioUnlocked ? 0 : 1) && (
            <button
              style={{ ...styles.roomArrow, ...styles.roomArrowLeft }}
              onClick={() => switchToRoom(currentRoom - 1)}
            >
              {'◀'}
            </button>
          )}
          {currentRoom < 2 && (
            <button
              style={{ ...styles.roomArrow, ...styles.roomArrowRight }}
              onClick={() => switchToRoom(currentRoom + 1)}
            >
              {'▶'}
              {otherRoomAlert && <span style={styles.alertDot} />}
            </button>
          )}
          {/* Room label */}
          <div style={styles.roomLabel}>
            {placingItem
              ? `Tap to place: ${placingItem.name}`
              : currentRoom === 0 ? 'Patio' : currentRoom === 1 ? 'Reading Room' : 'Café'}
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
      {/* Bottom buttons */}
      {!hideBottomButtons && (
        <>
          <button
            style={styles.settingsButton}
            onClick={() => onSettingsTap?.()}
          >
            ⚙️
          </button>
          <button
            style={styles.contactsButton}
            onClick={() => onContactsTap?.()}
          >
            👥
          </button>
          <button
            style={styles.dictionaryButton}
            onClick={() => onDictionaryTap?.()}
          >
            📖
          </button>
          {/* <button
            style={styles.mapButton}
            onClick={() => setShowMap(true)}
          >
            🗺
          </button> */}
          {scene === 'interior' && !placingItem && (
            <button
              style={styles.upgradeButton}
              onClick={() => onUpgradesTap?.()}
            >
              🔧
              {hasReadyUpgrades && <span style={styles.upgradeBadge} />}
            </button>
          )}
        </>
      )}
      {placingItem && (
        <button
          style={styles.cancelPlaceButton}
          onClick={() => onCancelPlace?.()}
        >
          ✕ Cancel
        </button>
      )}
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
  settingsButton: {
    position: 'absolute',
    bottom: 10,
    right: 178,
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
  dictionaryButton: {
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
  upgradeButton: {
    position: 'absolute',
    bottom: 10,
    right: 136,
    width: 36,
    height: 36,
    background: 'rgba(93, 64, 55, 0.85)',
    border: '2px solid rgba(255, 213, 79, 0.6)',
    borderRadius: 8,
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  },
  upgradeBadge: {
    position: 'absolute' as const,
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: '#F44336',
    border: '2px solid rgba(93, 64, 55, 0.85)',
  },
  cancelPlaceButton: {
    position: 'absolute',
    bottom: 10,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 20px',
    background: 'rgba(183, 28, 28, 0.9)',
    border: '2px solid rgba(255, 138, 128, 0.7)',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: '#FFF',
    cursor: 'pointer',
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

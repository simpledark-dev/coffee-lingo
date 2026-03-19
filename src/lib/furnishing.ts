import { T, CAFE_LAYOUT } from './tilemap'
import type { FurnishingItem, GridPos, PointOfInterest, CustomerDirection, UpgradeLevel } from './types'
import { TILE_TO_UPGRADE_ID, getUpgradeCatalogEntry, BONUS_TABLE } from './upgrades'

// --- Patio furnishing catalog ---
export const PATIO_FURNISHINGS: FurnishingItem[] = [
  {
    id: 'patio_planter_left',
    name: 'Welcome Planter (Left)',
    description: 'Lush greenery at the entrance',
    cost: 20, tileId: T.PLANT, spriteKey: 'PLANT',
    slots: [{ row: 19, col: 1 }], room: 'patio',
    bonus: { description: '+3% bonus coin chance', effects: { bonusCoinChance: 0.03 } },
  },
  {
    id: 'patio_planter_right',
    name: 'Welcome Planter (Right)',
    description: 'Matching greenery on the other side',
    cost: 20, tileId: T.PLANT, spriteKey: 'PLANT',
    slots: [{ row: 19, col: 8 }], room: 'patio',
    bonus: { description: '+3% bonus coin chance', effects: { bonusCoinChance: 0.03 } },
  },
  {
    id: 'patio_table_upper',
    name: 'Bistro Table (Upper)',
    description: 'A classic Parisian bistro set',
    cost: 50, tileId: T.TABLE, spriteKey: 'TABLE',
    slots: [{ row: 21, col: 3 }, { row: 21, col: 6 }], room: 'patio',
    group: [{ dr: -1, dc: 0, tileId: T.CHAIR_D }, { dr: 1, dc: 0, tileId: T.CHAIR_U }],
    bonus: { description: '+5% coins on PERFECT', effects: { perfectCoinMultiplier: 0.05 } },
  },
  {
    id: 'patio_table_lower',
    name: 'Bistro Table (Lower)',
    description: 'Another set for more guests',
    cost: 50, tileId: T.TABLE, spriteKey: 'TABLE',
    slots: [{ row: 25, col: 2 }, { row: 25, col: 6 }], room: 'patio',
    group: [{ dr: -1, dc: 0, tileId: T.CHAIR_D }, { dr: 1, dc: 0, tileId: T.CHAIR_U }],
    bonus: { description: '+5% coins on PERFECT', effects: { perfectCoinMultiplier: 0.05 } },
  },
  {
    id: 'patio_lamp',
    name: 'Patio Lamp',
    description: 'Warm ambient string lights',
    cost: 40, tileId: T.LAMP, spriteKey: 'LAMP',
    slots: [{ row: 23, col: 4 }, { row: 23, col: 6 }], room: 'patio',
    bonus: { description: '+3% tips', effects: { tipMultiplier: 0.03 } },
  },
  {
    id: 'patio_center_plant',
    name: 'Center Plant',
    description: 'A decorative greenery accent',
    cost: 30, tileId: T.PLANT, spriteKey: 'PLANT',
    slots: [{ row: 25, col: 4 }, { row: 23, col: 2 }], room: 'patio',
    bonus: { description: '+3% bonus coin chance', effects: { bonusCoinChance: 0.03 } },
  },
  {
    id: 'patio_bench_left',
    name: 'Terrace Bench (Left)',
    description: 'A comfy wooden bench',
    cost: 35, tileId: T.BENCH, spriteKey: 'BENCH',
    slots: [{ row: 28, col: 4 }], room: 'patio',
    bonus: { description: '+0.3 rep per customer', effects: { repBonusPerCustomer: 0.3 } },
  },
  {
    id: 'patio_bench_right',
    name: 'Terrace Bench (Right)',
    description: 'Matching bench on the other side',
    cost: 35, tileId: T.BENCH, spriteKey: 'BENCH',
    slots: [{ row: 28, col: 5 }], room: 'patio',
    bonus: { description: '+0.3 rep per customer', effects: { repBonusPerCustomer: 0.3 } },
  },
  {
    id: 'patio_corner_plant_left',
    name: 'Corner Plant (Left)',
    description: 'Greenery in the corner',
    cost: 25, tileId: T.PLANT, spriteKey: 'PLANT',
    slots: [{ row: 28, col: 1 }], room: 'patio',
    bonus: { description: '+3% bonus coin chance', effects: { bonusCoinChance: 0.03 } },
  },
  {
    id: 'patio_corner_plant_right',
    name: 'Corner Plant (Right)',
    description: 'Greenery in the other corner',
    cost: 25, tileId: T.PLANT, spriteKey: 'PLANT',
    slots: [{ row: 28, col: 8 }], room: 'patio',
    bonus: { description: '+3% bonus coin chance', effects: { bonusCoinChance: 0.03 } },
  },
]

// --- Reading Room furnishing catalog ---
export const READING_ROOM_FURNISHINGS: FurnishingItem[] = [
  {
    id: 'reading_bookshelf_left',
    name: 'Wall Bookshelf (Left)',
    description: 'A tall shelf of classic novels',
    cost: 30, tileId: T.BOOKSHELF, spriteKey: 'BOOKSHELF',
    slots: [{ row: 10, col: 12 }], room: 'reading',
    bonus: { description: '+3% tips', effects: { tipMultiplier: 0.03 } },
  },
  {
    id: 'reading_bookshelf_right',
    name: 'Wall Bookshelf (Right)',
    description: 'Poetry and language guides',
    cost: 30, tileId: T.BOOKSHELF, spriteKey: 'BOOKSHELF',
    slots: [{ row: 10, col: 17 }], room: 'reading',
    bonus: { description: '+3% tips', effects: { tipMultiplier: 0.03 } },
  },
  {
    id: 'reading_table_left',
    name: 'Study Table (Left)',
    description: 'A cozy reading nook with seating',
    cost: 55, tileId: T.TABLE, spriteKey: 'TABLE',
    slots: [{ row: 13, col: 12 }], room: 'reading',
    group: [{ dr: -1, dc: 0, tileId: T.CHAIR_D }, { dr: 1, dc: 0, tileId: T.CHAIR_U }],
    bonus: { description: '+5% coins on PERFECT', effects: { perfectCoinMultiplier: 0.05 } },
  },
  {
    id: 'reading_table_right',
    name: 'Study Table (Right)',
    description: 'Another study spot by the window',
    cost: 55, tileId: T.TABLE, spriteKey: 'TABLE',
    slots: [{ row: 13, col: 16 }], room: 'reading',
    group: [{ dr: -1, dc: 0, tileId: T.CHAIR_D }, { dr: 1, dc: 0, tileId: T.CHAIR_U }],
    bonus: { description: '+5% coins on PERFECT', effects: { perfectCoinMultiplier: 0.05 } },
  },
  {
    id: 'reading_plant_upper',
    name: 'Reading Plant (Upper)',
    description: 'Greenery near the bookshelves',
    cost: 20, tileId: T.PLANT, spriteKey: 'PLANT',
    slots: [{ row: 13, col: 14 }], room: 'reading',
    bonus: { description: '+3% bonus coin chance', effects: { bonusCoinChance: 0.03 } },
  },
  {
    id: 'reading_plant_mid_right',
    name: 'Reading Plant (Mid Right)',
    description: 'A plant by the wall',
    cost: 20, tileId: T.PLANT, spriteKey: 'PLANT',
    slots: [{ row: 15, col: 18 }], room: 'reading',
    bonus: { description: '+3% bonus coin chance', effects: { bonusCoinChance: 0.03 } },
  },
  {
    id: 'reading_plant_lower_right',
    name: 'Reading Plant (Lower Right)',
    description: 'Lush corner greenery',
    cost: 20, tileId: T.PLANT, spriteKey: 'PLANT',
    slots: [{ row: 21, col: 18 }], room: 'reading',
    bonus: { description: '+3% bonus coin chance', effects: { bonusCoinChance: 0.03 } },
  },
  {
    id: 'reading_plant_lower_left',
    name: 'Reading Plant (Lower Left)',
    description: 'A warm touch of green',
    cost: 20, tileId: T.PLANT, spriteKey: 'PLANT',
    slots: [{ row: 23, col: 11 }], room: 'reading',
    bonus: { description: '+3% bonus coin chance', effects: { bonusCoinChance: 0.03 } },
  },
  {
    id: 'reading_divider_left',
    name: 'Divider Shelf (Left)',
    description: 'Bookshelves dividing the room',
    cost: 35, tileId: T.BOOKSHELF, spriteKey: 'BOOKSHELF',
    slots: [{ row: 17, col: 12 }], room: 'reading',
    group: [{ dr: 0, dc: 1, tileId: T.BOOKSHELF }],
    bonus: { description: '+3% tips', effects: { tipMultiplier: 0.03 } },
  },
  {
    id: 'reading_divider_right',
    name: 'Divider Shelf (Right)',
    description: 'More books on the other side',
    cost: 35, tileId: T.BOOKSHELF, spriteKey: 'BOOKSHELF',
    slots: [{ row: 17, col: 16 }], room: 'reading',
    group: [{ dr: 0, dc: 1, tileId: T.BOOKSHELF }],
    bonus: { description: '+3% tips', effects: { tipMultiplier: 0.03 } },
  },
  {
    id: 'reading_chess_left',
    name: 'Chess Table (Left)',
    description: 'A game table with two chairs',
    cost: 45, tileId: T.CHESS, spriteKey: 'CHESS_TABLE',
    slots: [{ row: 21, col: 12 }], room: 'reading',
    group: [{ dr: -1, dc: 0, tileId: T.CHAIR_D }, { dr: 1, dc: 0, tileId: T.CHAIR_U }],
    bonus: { description: '+0.3 rep per customer', effects: { repBonusPerCustomer: 0.3 } },
  },
  {
    id: 'reading_chess_right',
    name: 'Chess Table (Right)',
    description: 'Another game table by the wall',
    cost: 45, tileId: T.CHESS, spriteKey: 'CHESS_TABLE',
    slots: [{ row: 21, col: 16 }], room: 'reading',
    group: [{ dr: -1, dc: 0, tileId: T.CHAIR_D }, { dr: 1, dc: 0, tileId: T.CHAIR_U }],
    bonus: { description: '+0.3 rep per customer', effects: { repBonusPerCustomer: 0.3 } },
  },
  {
    id: 'reading_lamp',
    name: 'Reading Lamp',
    description: 'Warm light for studying',
    cost: 35, tileId: T.LAMP, spriteKey: 'LAMP',
    slots: [{ row: 21, col: 14 }], room: 'reading',
    bonus: { description: '+3% tips', effects: { tipMultiplier: 0.03 } },
  },
  {
    id: 'reading_chess_corner',
    name: 'Chess Corner',
    description: 'A three-seat game corner',
    cost: 50, tileId: T.CHESS, spriteKey: 'CHESS_TABLE',
    slots: [{ row: 25, col: 13 }], room: 'reading',
    group: [
      { dr: 0, dc: -1, tileId: T.CHAIR_D },
      { dr: 0, dc: 1, tileId: T.CHAIR_D },
      { dr: 1, dc: 0, tileId: T.CHAIR_U },
    ],
    bonus: { description: '+0.5 rep per customer', effects: { repBonusPerCustomer: 0.5 } },
  },
  {
    id: 'reading_spare_chair',
    name: 'Extra Chair',
    description: 'An extra seat for visitors',
    cost: 15, tileId: T.CHAIR_D, spriteKey: 'CHAIR',
    slots: [{ row: 24, col: 13 }], room: 'reading',
    bonus: { description: '+0.2 rep per customer', effects: { repBonusPerCustomer: 0.2 } },
  },
]

// --- Café furnishing catalog ---
export const CAFE_ROOM_FURNISHINGS: FurnishingItem[] = [
  {
    id: 'cafe_table_upper_left',
    name: 'Café Table (Upper Left)',
    description: 'A bistro set near the window',
    cost: 55, tileId: T.TABLE, spriteKey: 'TABLE',
    slots: [{ row: 11, col: 22 }], room: 'cafe',
    group: [{ dr: -1, dc: 0, tileId: T.CHAIR_D }, { dr: 1, dc: 1, tileId: T.CHAIR_U }],
    bonus: { description: '+5% coins on PERFECT', effects: { perfectCoinMultiplier: 0.05 } },
  },
  {
    id: 'cafe_table_upper_right',
    name: 'Café Table (Upper Right)',
    description: 'A set by the other window',
    cost: 55, tileId: T.TABLE, spriteKey: 'TABLE',
    slots: [{ row: 11, col: 27 }], room: 'cafe',
    group: [{ dr: -1, dc: 0, tileId: T.CHAIR_D }, { dr: 1, dc: -1, tileId: T.CHAIR_U }],
    bonus: { description: '+5% coins on PERFECT', effects: { perfectCoinMultiplier: 0.05 } },
  },
  {
    id: 'cafe_table_mid_left',
    name: 'Café Table (Mid Left)',
    description: 'Central seating area',
    cost: 55, tileId: T.TABLE, spriteKey: 'TABLE',
    slots: [{ row: 21, col: 22 }], room: 'cafe',
    group: [{ dr: -1, dc: 0, tileId: T.CHAIR_D }, { dr: 1, dc: 1, tileId: T.CHAIR_U }],
    bonus: { description: '+5% coins on PERFECT', effects: { perfectCoinMultiplier: 0.05 } },
  },
  {
    id: 'cafe_table_mid_right',
    name: 'Café Table (Mid Right)',
    description: 'More seating by the wall',
    cost: 55, tileId: T.TABLE, spriteKey: 'TABLE',
    slots: [{ row: 22, col: 26 }], room: 'cafe',
    group: [{ dr: -1, dc: 0, tileId: T.CHAIR_D }, { dr: 1, dc: 0, tileId: T.CHAIR_U }],
    bonus: { description: '+5% coins on PERFECT', effects: { perfectCoinMultiplier: 0.05 } },
  },
  {
    id: 'cafe_corner_table',
    name: 'Corner Table',
    description: 'A cozy spot near the counter',
    cost: 55, tileId: T.TABLE, spriteKey: 'TABLE',
    slots: [{ row: 25, col: 21 }], room: 'cafe',
    group: [{ dr: -1, dc: 0, tileId: T.CHAIR_U }, { dr: 0, dc: -1, tileId: T.CHAIR_U }],
    bonus: { description: '+5% coins on PERFECT', effects: { perfectCoinMultiplier: 0.05 } },
  },
  {
    id: 'cafe_display_shelves',
    name: 'Display Shelves',
    description: 'Artisan goods on display',
    cost: 40, tileId: T.SHELF, spriteKey: 'SHELF',
    slots: [{ row: 17, col: 22 }], room: 'cafe',
    group: [{ dr: 0, dc: 1, tileId: T.SHELF }],
    bonus: { description: '+5% tips', effects: { tipMultiplier: 0.05 } },
  },
  {
    id: 'cafe_menu_board',
    name: 'Menu Board',
    description: 'Daily specials in chalk',
    cost: 30, tileId: T.MENU, spriteKey: 'MENU_BOARD',
    slots: [{ row: 17, col: 26 }], room: 'cafe',
    group: [{ dr: 0, dc: 1, tileId: T.MENU }],
    bonus: { description: '+5% tips', effects: { tipMultiplier: 0.05 } },
  },
  {
    id: 'cafe_accent_plant',
    name: 'Accent Plant',
    description: 'Warm greenery accent',
    cost: 25, tileId: T.PLANT, spriteKey: 'PLANT',
    slots: [{ row: 9, col: 24 }], room: 'cafe',
    bonus: { description: '+3% bonus coin chance', effects: { bonusCoinChance: 0.03 } },
  },
  {
    id: 'cafe_plant_upper_left',
    name: 'Café Plant (Upper Left)',
    description: 'Greenery near the window',
    cost: 20, tileId: T.PLANT, spriteKey: 'PLANT',
    slots: [{ row: 13, col: 21 }], room: 'cafe',
    bonus: { description: '+3% bonus coin chance', effects: { bonusCoinChance: 0.03 } },
  },
  {
    id: 'cafe_plant_upper_right',
    name: 'Café Plant (Upper Right)',
    description: 'A touch of green by the wall',
    cost: 20, tileId: T.PLANT, spriteKey: 'PLANT',
    slots: [{ row: 13, col: 28 }], room: 'cafe',
    bonus: { description: '+3% bonus coin chance', effects: { bonusCoinChance: 0.03 } },
  },
  {
    id: 'cafe_plant_mid_right',
    name: 'Café Plant (Mid Right)',
    description: 'Greenery in the seating area',
    cost: 20, tileId: T.PLANT, spriteKey: 'PLANT',
    slots: [{ row: 21, col: 28 }], room: 'cafe',
    bonus: { description: '+3% bonus coin chance', effects: { bonusCoinChance: 0.03 } },
  },
  {
    id: 'cafe_plant_lower_left',
    name: 'Café Plant (Lower Left)',
    description: 'Warm greenery near the counter',
    cost: 20, tileId: T.PLANT, spriteKey: 'PLANT',
    slots: [{ row: 23, col: 21 }], room: 'cafe',
    bonus: { description: '+3% bonus coin chance', effects: { bonusCoinChance: 0.03 } },
  },
]

// --- Combined catalog ---
export const ALL_FURNISHINGS: FurnishingItem[] = [
  ...PATIO_FURNISHINGS,
  ...READING_ROOM_FURNISHINGS,
  ...CAFE_ROOM_FURNISHINGS,
]

// Lookup helper (indexed for perf)
const FURNISHING_BY_ID = new Map<string, FurnishingItem>()
for (const f of ALL_FURNISHINGS) FURNISHING_BY_ID.set(f.id, f)

// Structural tiles that furnishings must never override
const PROTECTED_TILES: Set<string> = new Set([T.WALL, T.WINDOW, T.COUNTER, T.COUNTER_L, T.MACHINE, T.DOOR, T.EMPTY])

/**
 * Build a map of "row,col" → tileId from placed furnishings.
 * Includes group tiles (e.g., chairs around a table).
 * Skips positions occupied by structural tiles (walls, windows, counters, etc.).
 */
export function buildPlacedTileMap(
  placedFurnishings: Record<string, GridPos>
): Map<string, string> {
  const map = new Map<string, string>()
  for (const [itemId, pos] of Object.entries(placedFurnishings)) {
    const item = FURNISHING_BY_ID.get(itemId)
    if (!item) continue
    const baseTile = CAFE_LAYOUT[pos.row]?.[pos.col]
    if (!PROTECTED_TILES.has(baseTile)) {
      map.set(`${pos.row},${pos.col}`, item.tileId)
    }
    if (item.group) {
      for (const g of item.group) {
        const gr = pos.row + g.dr
        const gc = pos.col + g.dc
        const groupBase = CAFE_LAYOUT[gr]?.[gc]
        if (!PROTECTED_TILES.has(groupBase)) {
          map.set(`${gr},${gc}`, g.tileId)
        }
      }
    }
  }
  return map
}

/**
 * Get the effective tile at a position, considering placed furnishings.
 * Placed furnishings override the base layout at any position.
 */
export function getEffectiveTile(
  row: number,
  col: number,
  placedTileMap: Map<string, string>
): string {
  const placed = placedTileMap.get(`${row},${col}`)
  if (placed) return placed
  return CAFE_LAYOUT[row]?.[col] ?? T.EMPTY
}

/**
 * Build a reverse map: "row,col" → itemId (including group tile positions).
 * Used to detect which furnishing was tapped on the map.
 */
export function buildPositionToItemMap(
  placedFurnishings: Record<string, GridPos>
): Map<string, string> {
  const map = new Map<string, string>()
  for (const [itemId, pos] of Object.entries(placedFurnishings)) {
    const item = FURNISHING_BY_ID.get(itemId)
    if (!item) continue
    map.set(`${pos.row},${pos.col}`, itemId)
    if (item.group) {
      for (const g of item.group) {
        map.set(`${pos.row + g.dr},${pos.col + g.dc}`, itemId)
      }
    }
  }
  return map
}

/**
 * Get all positions occupied by placed furnishings (for slot availability checks).
 */
export function getOccupiedPositions(
  placedFurnishings: Record<string, GridPos>
): Set<string> {
  const occupied = new Set<string>()
  for (const [itemId, pos] of Object.entries(placedFurnishings)) {
    occupied.add(`${pos.row},${pos.col}`)
    const item = FURNISHING_BY_ID.get(itemId)
    if (item?.group) {
      for (const g of item.group) {
        occupied.add(`${pos.row + g.dr},${pos.col + g.dc}`)
      }
    }
  }
  return occupied
}

/**
 * Get available (unoccupied) slots for a furnishing item.
 */
export function getAvailableSlots(
  item: FurnishingItem,
  placedFurnishings: Record<string, GridPos>
): GridPos[] {
  const occupied = getOccupiedPositions(placedFurnishings)
  return item.slots.filter(slot => {
    if (occupied.has(`${slot.row},${slot.col}`)) return false
    if (item.group) {
      for (const g of item.group) {
        if (occupied.has(`${slot.row + g.dr},${slot.col + g.dc}`)) return false
      }
    }
    return true
  })
}

// Walkable tiles for POI adjacency checks
const WALKABLE: Set<string> = new Set([T.FLOOR, T.DOOR, T.CHAIR_U, T.CHAIR_D, T.GRASS, T.PATH, T.BENCH])

function isEffectivelyWalkable(row: number, col: number, tileMap: Map<string, string>): boolean {
  const tile = tileMap.get(`${row},${col}`) ?? CAFE_LAYOUT[row]?.[col]
  return !!tile && WALKABLE.has(tile)
}

/**
 * Build POIs from all placed furnishings.
 */
export function buildFurnishingPOIs(
  placedTileMap: Map<string, string>
): PointOfInterest[] {
  const pois: PointOfInterest[] = []
  for (const [key, tileId] of placedTileMap) {
    const [row, col] = key.split(',').map(Number)
    const id = `furn_${row}_${col}`

    switch (tileId) {
      case T.CHAIR_U:
        pois.push({ id, type: 'chair', pos: { row, col }, facingDir: 'up', maxOccupants: 1 })
        break
      case T.CHAIR_D:
        pois.push({ id, type: 'chair', pos: { row, col }, facingDir: 'down', maxOccupants: 1 })
        break
      case T.BENCH:
        pois.push({ id, type: 'bench', pos: { row, col }, facingDir: 'down', maxOccupants: 1 })
        break
      case T.PLANT: {
        const dirs: { dr: number; dc: number; face: CustomerDirection }[] = [
          { dr: 1, dc: 0, face: 'up' },
          { dr: -1, dc: 0, face: 'down' },
          { dr: 0, dc: 1, face: 'left' },
          { dr: 0, dc: -1, face: 'right' },
        ]
        for (const d of dirs) {
          if (isEffectivelyWalkable(row + d.dr, col + d.dc, placedTileMap)) {
            pois.push({ id: `${id}_${d.face}`, type: 'plant', pos: { row: row + d.dr, col: col + d.dc }, facingDir: d.face, maxOccupants: 1 })
            break
          }
        }
        break
      }
      case T.LAMP: {
        if (isEffectivelyWalkable(row + 1, col, placedTileMap)) {
          pois.push({ id, type: 'floor', pos: { row: row + 1, col }, facingDir: 'up', maxOccupants: 1 })
        }
        break
      }
      case T.BOOKSHELF:
      case T.SHELF: {
        if (isEffectivelyWalkable(row + 1, col, placedTileMap)) {
          pois.push({ id, type: tileId === T.BOOKSHELF ? 'bookshelf' : 'shelf', pos: { row: row + 1, col }, facingDir: 'up', maxOccupants: 1 })
        }
        break
      }
      case T.MENU: {
        if (isEffectivelyWalkable(row + 1, col, placedTileMap)) {
          const exists = pois.some(p => p.type === 'menu' && p.pos.row === row + 1 && p.pos.col === col)
          if (!exists) {
            pois.push({ id, type: 'menu', pos: { row: row + 1, col }, facingDir: 'up', maxOccupants: 2 })
          }
        }
        break
      }
      // Tables and chess tables don't create POIs — the chairs around them do
    }
  }
  return pois
}

/**
 * Default placements for all rooms (migration: place everything at first slot).
 */
export function getDefaultPlacements(): Record<string, GridPos> {
  const placements: Record<string, GridPos> = {}
  for (const item of ALL_FURNISHINGS) {
    placements[item.id] = item.slots[0]
  }
  return placements
}

// Default sprite for each tile type (used by buildFurnishingSpriteMap for group tiles)
const TILE_DEFAULT_SPRITE: Record<string, string> = {
  [T.CHAIR_U]: 'CHAIR', [T.CHAIR_D]: 'CHAIR',
  [T.BOOKSHELF]: 'BOOKSHELF', [T.SHELF]: 'SHELF',
  [T.PLANT]: 'PLANT', [T.LAMP]: 'LAMP', [T.TABLE]: 'TABLE',
  [T.BENCH]: 'BENCH', [T.MENU]: 'MENU_BOARD', [T.CHESS]: 'CHESS_TABLE',
}

/**
 * Build a position-based sprite map for all placed furnishings.
 * Each position gets its sprite resolved based on the item's individual upgrade tier.
 */
export function buildFurnishingSpriteMap(
  placedFurnishings: Record<string, GridPos>,
  furnishingUpgrades?: Record<string, UpgradeLevel>,
): Map<string, string> {
  const map = new Map<string, string>()
  for (const [itemId, pos] of Object.entries(placedFurnishings)) {
    const item = FURNISHING_BY_ID.get(itemId)
    if (!item) continue
    const tier = furnishingUpgrades?.[itemId]?.tier ?? 0

    // Resolve primary tile sprite
    const catalogId = TILE_TO_UPGRADE_ID[item.tileId]
    const catalog = catalogId ? getUpgradeCatalogEntry(catalogId) : undefined
    let spriteKey = item.spriteKey
    if (catalog && tier > 0) {
      const tierData = catalog.tiers.find(t => t.tier === tier)
      if (tierData) spriteKey = tierData.spriteKey
    }
    map.set(`${pos.row},${pos.col}`, spriteKey)

    // Resolve group tile sprites (chairs around tables inherit parent's tier)
    if (item.group) {
      for (const g of item.group) {
        const gr = pos.row + g.dr
        const gc = pos.col + g.dc
        const groupBase = CAFE_LAYOUT[gr]?.[gc]
        if (PROTECTED_TILES.has(groupBase)) continue
        const groupCatalogId = TILE_TO_UPGRADE_ID[g.tileId]
        const groupCatalog = groupCatalogId ? getUpgradeCatalogEntry(groupCatalogId) : undefined
        let groupSprite = TILE_DEFAULT_SPRITE[g.tileId] ?? g.tileId
        if (groupCatalog && tier > 0) {
          const tierData = groupCatalog.tiers.find(t => t.tier === tier)
          if (tierData) groupSprite = tierData.spriteKey
        }
        map.set(`${gr},${gc}`, groupSprite)
      }
    }
  }
  return map
}

/**
 * Compute additive bonus effects from all placed furnishings + their individual upgrade tiers.
 */
export function getFurnishingBonuses(
  placedFurnishings: Record<string, GridPos>,
  furnishingUpgrades?: Record<string, UpgradeLevel>,
): Record<string, number> {
  const bonuses: Record<string, number> = {}
  for (const itemId of Object.keys(placedFurnishings)) {
    const item = FURNISHING_BY_ID.get(itemId)
    if (!item) continue
    // Base bonus from placement
    for (const [key, value] of Object.entries(item.bonus.effects)) {
      bonuses[key] = (bonuses[key] ?? 0) + (value as number)
    }
    // Tier bonus from individual upgrade
    const tier = furnishingUpgrades?.[itemId]?.tier ?? 0
    if (tier > 0) {
      const catalogId = TILE_TO_UPGRADE_ID[item.tileId]
      if (catalogId) {
        const tierBonuses = BONUS_TABLE[catalogId]?.[tier]
        if (tierBonuses) {
          for (const [key, value] of Object.entries(tierBonuses)) {
            bonuses[key] = (bonuses[key] ?? 0) + (value as number)
          }
        }
      }
    }
  }
  return bonuses
}

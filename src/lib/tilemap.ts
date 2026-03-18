// Cafe layout as a 2D grid.
// Each cell is a tile ID that maps to a sprite.
// The grid is rendered at TILE_SIZE * SCALE pixels per tile on the canvas.
//
// SWAP GUIDE: When replacing sprites with PNG assets, this file stays the same.
// Only the renderer (CafeCanvas.tsx) changes how tiles are drawn.

export const TILE_SIZE = 32
export const SCALE = 1.5 // 1.5x → each tile is 48px (same as before, but 2× pixel detail)

// Grid: 30 columns × 30 rows
// Rows 0–7: garden exterior (above reading room + cafe)
// Rows 8–29: interior (three 10-col rooms side by side)
//   Left room (cols 0–9): patio/terrace (rows 18-29 only, rows 0-17 are wall)
//   Middle room (cols 10–19): reading/activity room
//   Right room (cols 20–29): cafe
//   Passage between reading room and cafe at rows 18-19 (cols 19-20)
//   Doorway between patio and reading room at rows 21-22 (cols 9-10)
export const GRID_COLS = 30
export const GRID_ROWS = 30

// Room boundaries (for camera snapping)
export const ROOM_COLS = 10 // each room is 10 columns wide
export const ROOM_COUNT = 3 // 0=patio, 1=reading, 2=cafe

// Patio unlock threshold
export const PATIO_UNLOCK_REP = 30
export const PATIO_UNLOCK_COST = 50

// Tile IDs
export const T = {
  EMPTY: '.',
  FLOOR: 'F',
  WALL: 'W',
  COUNTER: 'C',
  COUNTER_L: 'c',
  TABLE: 'T',
  CHAIR_U: 'u',
  CHAIR_D: 'd',
  SHELF: 'S',
  MENU: 'M',
  DOOR: 'D',
  MACHINE: 'X',
  LAMP: 'L',
  PLANT: 'P',
  CUP: 'Q',
  WINDOW: 'N',
  BOOKSHELF: 'B',
  GRASS: 'G',
  HEDGE: 'H',
  PATH: 'A',
  FLOWER: 'R',
  BENCH: 'E',
  FOUNTAIN: 'O',
  TREE: 'Y',
  LANTERN: 'K',
  POND: 'J',
  CHESS: 'Z',
  // Outside scene tiles
  ROAD: 'r',
  ROAD_LINE: 'l',
  SIDEWALK: 'w',
  SHOP_WALL: 'b',       // brick wall
  SHOP_WALL_LIGHT: 'v', // light stone wall
  AWNING_RED: '1',
  AWNING_BLUE: '2',
  AWNING_GREEN: '3',
  AWNING_BROWN: '4',
  SHOP_WINDOW: 'n',     // shop display window
  LOCKED_DOOR: 'x',
  CAFE_DOOR: 'e',
  STREET_LAMP: 'k',
  OUTDOOR_PLANT: 'p',
  CURB: 'g',            // curb left (sidewalk→road)
  CURB_R: 'h',          // curb right (road→sidewalk)
  ROOF: 'f',
} as const

// Full layout: 30 wide × 30 tall
// Cols 0-9: patio (rows 18-29 only; rows 0-17 are wall)
// Cols 10-19: reading/activity room + garden
// Cols 20-29: cafe + garden
export const CAFE_LAYOUT: string[][] = [
  // === GARDEN (rows 0-7) — patio cols are wall ===
  //  ---- PATIO wall (cols 0-9) ----                          ---- GARDEN (cols 10-29, same as before) ----
  ['W','W','W','W','W','W','W','W','W','W',  'H','H','H','H','H','H','H','H','H','H',  'H','H','H','H','H','H','H','H','H','H'],  // row 0
  ['W','W','W','W','W','W','W','W','W','W',  'H','G','G','Y','E','E','G','G','Y','G',  'G','Y','G','G','O','O','Y','Y','G','H'],  // row 1
  ['W','W','W','W','W','W','W','W','W','W',  'H','G','R','G','G','G','G','R','G','G',  'G','G','R','G','E','E','G','R','G','H'],  // row 2
  ['W','W','W','W','W','W','W','W','W','W',  'H','G','G','G','G','G','J','J','J','G',  'G','G','G','G','G','G','G','R','G','H'],  // row 3
  ['W','W','W','W','W','W','W','W','W','W',  'H','G','G','R','G','G','J','J','J','G',  'G','G','G','G','G','G','G','G','G','H'],  // row 4
  ['W','W','W','W','W','W','W','W','W','W',  'H','G','G','G','G','G','G','G','G','G',  'G','G','G','G','G','G','G','G','G','H'],  // row 5
  ['W','W','W','W','W','W','W','W','W','W',  'H','G','G','K','A','A','K','G','G','G',  'G','G','G','K','A','A','K','G','G','H'],  // row 6
  ['W','W','W','W','W','W','W','W','W','W',  'H','H','H','H','A','A','H','H','H','W',  'W','H','H','H','A','A','H','H','H','H'],  // row 7

  // === INTERIOR — patio wall continues rows 8-17 ===
  //  ---- PATIO wall (cols 0-9) ----                          ---- READING ROOM (cols 10-19) ----             ---- CAFE (cols 20-29) ----
  ['W','W','W','W','W','W','W','W','W','W',  'W','N','N','W','F','F','W','N','N','W',  'W','N','N','W','F','F','W','N','N','W'],  // row 8
  ['W','W','W','W','W','W','W','W','W','W',  'W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 9
  ['W','W','W','W','W','W','W','W','W','W',  'W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 10
  ['W','W','W','W','W','W','W','W','W','W',  'W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 11
  ['W','W','W','W','W','W','W','W','W','W',  'W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 12
  ['W','W','W','W','W','W','W','W','W','W',  'W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 13
  ['W','W','W','W','W','W','W','W','W','W',  'W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 14
  ['W','W','W','W','W','W','W','W','W','W',  'W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 15

  // === DIVIDER rows 16-17 ===
  ['W','W','W','W','W','W','W','W','W','W',  'W','W','W','W','F','W','W','W','W','W',  'W','W','W','W','F','F','W','W','W','W'],  // row 16
  ['W','W','W','W','W','W','W','W','W','W',  'W','F','F','F','F','F','F','F','F','W',  'W','W','F','F','F','F','F','F','W','W'],  // row 17

  // === LOWER AREAS (rows 18-29) — patio + passage ===
  //  ---- PATIO (cols 0-9) ----                               ---- READING ROOM lower (cols 10-19) ----      ---- CAFE lower (cols 20-29) ----
  ['W','W','W','W','W','W','W','W','W','W',  'W','F','F','F','F','F','F','F','F','F',  'F','F','F','F','F','F','F','F','F','W'],  // row 18: PASSAGE (reading↔cafe)
  ['W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','F',  'F','F','F','F','F','F','F','F','F','W'],  // row 19: patio empty
  ['W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 20
  ['W','F','F','F','F','F','F','F','F','F',  'F','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 21: patio doorway cols 9-10
  ['W','F','F','F','F','F','F','F','F','F',  'F','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 22: patio doorway cols 9-10
  ['W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 23
  ['W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 24
  ['W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','D'],  // row 25: door
  ['W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 26
  ['W','F','F','F','F','F','F','F','F','W',  'W','W','W','W','W','W','W','W','W','W',  'c','C','C','C','C','C','C','C','C','C'],  // row 27: counter
  ['W','F','F','F','F','F','F','F','F','W',  'W','W','W','W','W','W','W','W','W','W',  'W','F','X','Q','F','F','X','Q','F','W'],  // row 28: benches
  ['W','W','W','W','W','W','W','W','W','W',  'W','W','W','W','W','W','W','W','W','W',  'W','W','W','W','W','W','W','W','W','W'],  // row 29: back wall
]

// Outside scene: 8 cols × 20 rows — a clean Parisian street
// Cols 0-3: shop facades (wall, awning, window, door)
// Cols 4-5: wide sidewalk
// Cols 6-7: road
export const OUTSIDE_COLS = 8
export const OUTSIDE_ROWS = 18

// Café door position in outside grid (for enter arrow + tap detection)
export const CAFE_OUTSIDE_DOOR = { row: 7, col: 2 }

export const OUTSIDE_LAYOUT: string[][] = [
  // Row 0: top sidewalk
  ['w','w','w','w','w','w','r','r'],

  // Row 1-3: Boulangerie (bakery)
  ['b','b','n','b','w','w','l','r'],
  ['b','b','x','b','w','k','r','r'],
  ['b','b','b','b','w','w','r','r'],

  // Row 4: sidewalk gap
  ['w','w','w','w','p','w','l','r'],

  // Row 5-8: Our Café (enterable)
  ['b','b','n','b','w','w','r','r'],
  ['b','b','n','b','w','k','l','r'],
  ['b','b','e','b','w','w','r','r'],
  ['b','b','b','b','w','w','r','r'],

  // Row 9: sidewalk gap
  ['w','w','w','w','w','k','l','r'],

  // Row 10-12: Librairie (bookstore)
  ['v','v','n','v','w','w','r','r'],
  ['v','v','x','v','w','w','l','r'],
  ['v','v','v','v','p','w','r','r'],

  // Row 13: sidewalk gap
  ['w','w','w','w','w','k','l','r'],

  // Row 14-16: Fleuriste (flower shop)
  ['b','b','n','b','w','w','r','r'],
  ['b','b','x','b','w','w','l','r'],
  ['b','b','b','b','p','w','r','r'],

  // Row 17: bottom sidewalk
  ['w','w','w','w','w','w','l','r'],
]

// Legacy single-customer positions (kept for backward compat)
export const CUSTOMER_POS = { row: 26, col: 25 }
export const DOOR_POS = { row: 25, col: 29 }

// Multi-customer entry/exit points
export const DOOR_ENTRY = { row: 25, col: 29 } // door tile — customers walk in/out here
export const DOOR_EXIT = { row: 25, col: 29 }

// Patio doorway tiles (col 9-10, rows 21-22 — blocked when patio locked)
export const PATIO_DOOR_COLS = [9, 10] as const
export const PATIO_DOOR_ROWS = [21, 22] as const

// Walkable tile check — interior
const WALKABLE_TILES: Set<string> = new Set([T.FLOOR, T.DOOR, T.CHAIR_U, T.CHAIR_D, T.GRASS, T.PATH, T.BENCH])

/** Check if a tile is in the patio zone (cols 0-9) */
export function isPatioTile(_row: number, col: number): boolean {
  return col < 10
}

export function isWalkable(
  row: number, col: number,
  patioUnlocked: boolean = true,
  tileOverrides?: Map<string, string>
): boolean {
  if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return false
  if (!patioUnlocked && isPatioTile(row, col)) return false
  const tile = tileOverrides?.get(`${row},${col}`) ?? CAFE_LAYOUT[row]?.[col]
  return tile !== undefined && WALKABLE_TILES.has(tile)
}

// Walkable tile check — outside (sidewalk + cafe door)
const OUTSIDE_WALKABLE_TILES: Set<string> = new Set([T.SIDEWALK, T.OUTDOOR_PLANT, T.CAFE_DOOR, T.STREET_LAMP])

export function isOutsideWalkable(row: number, col: number): boolean {
  if (row < 0 || row >= OUTSIDE_ROWS || col < 0 || col >= OUTSIDE_COLS) return false
  const tile = OUTSIDE_LAYOUT[row]?.[col]
  return tile !== undefined && OUTSIDE_WALKABLE_TILES.has(tile)
}

// Outside spawn/despawn edges
export const OUTSIDE_SPAWN_TOP = { row: 0, col: 4 }
export const OUTSIDE_SPAWN_BOTTOM = { row: 17, col: 5 }
// Sidewalk tile adjacent to cafe door (where characters transition in/out)
export const CAFE_DOOR_SIDEWALK = { row: 7, col: 4 }

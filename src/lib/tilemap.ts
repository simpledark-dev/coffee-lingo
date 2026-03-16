// Cafe layout as a 2D grid.
// Each cell is a tile ID that maps to a sprite.
// The grid is rendered at TILE_SIZE * SCALE pixels per tile on the canvas.
//
// SWAP GUIDE: When replacing sprites with PNG assets, this file stays the same.
// Only the renderer (CafeCanvas.tsx) changes how tiles are drawn.

export const TILE_SIZE = 32
export const SCALE = 1.5 // 1.5x → each tile is 48px (same as before, but 2× pixel detail)

// Grid: 20 columns × 30 rows
// Rows 0–7: garden exterior (above both rooms)
// Rows 8–29: interior (two 10-col rooms side by side)
//   Left room (cols 0–9): reading/activity room
//   Right room (cols 10–19): cafe
//   Connecting passage at rows 18-19 between col 9 and col 10
export const GRID_COLS = 20
export const GRID_ROWS = 30

// Room boundaries (for camera snapping)
export const ROOM_COLS = 10 // each room is 10 columns wide

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
} as const

// Full layout: 20 wide × 30 tall
// Rows 0-7: garden exterior, Rows 8-29: interior
export const CAFE_LAYOUT: string[][] = [
  // === GARDEN (rows 0-7) ===
  ['H','H','H','H','H','H','H','H','H','H',  'H','H','H','H','H','H','H','H','H','H'],  // row 0: hedge border
  ['H','G','G','Y','E','E','G','G','Y','G',  'G','Y','G','G','G','G','Y','G','G','H'],  // row 1: trees
  ['H','G','R','G','G','G','G','R','G','G',  'G','G','R','G','E','E','G','R','G','H'],  // row 2: flowers + benches
  ['H','G','G','G','G','G','J','J','J','O',  'O','G','G','G','G','G','G','R','G','H'],  // row 3: fountain center
  ['H','G','G','R','G','G','J','J','J','G',  'G','G','G','G','G','G','G','G','G','H'],  // row 4: flowers + pond
  ['H','G','G','G','G','G','G','G','G','G',  'G','G','G','G','G','G','G','G','G','H'],  // row 5: pond
  ['H','G','G','K','A','A','K','G','G','G',  'G','G','G','K','A','A','K','G','G','H'],  // row 6: lanterns flanking paths
  ['H','H','H','H','A','A','H','H','H','W',  'W','H','H','H','A','A','H','H','H','H'],  // row 7: hedge with path gaps

  // === INTERIOR — north wall with openings at cols 4-5 / 14-15 ===
  //  ---- READING ROOM (cols 0-9) ----                        ---- CAFE (cols 10-19) ----
  ['W','N','N','W','F','F','W','N','N','W',  'W','N','N','W','F','F','W','N','N','W'],  // row 8: north wall (openings)
  ['W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','P','F','F','F','F','W'],  // row 9
  ['W','F','B','F','F','F','F','B','F','W',  'W','F','d','F','F','F','F','d','F','W'],  // row 10
  ['W','F','F','F','F','F','F','F','F','W',  'W','F','T','F','F','F','F','T','F','W'],  // row 11
  ['W','F','d','F','F','F','d','F','F','W',  'W','F','F','u','F','F','u','F','F','W'],  // row 12
  ['W','F','T','F','P','F','T','F','F','W',  'W','P','F','F','F','F','F','F','P','W'],  // row 13
  ['W','F','u','F','F','F','u','F','F','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 14
  ['W','F','F','F','F','F','F','F','P','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 15

  // === DIVIDER rows 16-17 ===
  ['W','W','W','W','F','W','W','W','W','W',  'W','W','W','W','F','F','W','W','W','W'],  // row 16
  ['W','F','B','B','F','F','B','B','F','W',  'W','W','S','S','F','F','M','M','W','W'],  // row 17

  // === LOWER AREAS (rows 18-29) — passage at cols 9-10 ===
  ['W','F','F','F','F','F','F','F','F','F',  'F','F','F','F','F','F','F','F','F','W'],  // row 18: PASSAGE
  ['W','F','F','F','F','F','F','F','F','F',  'F','F','F','F','F','F','F','F','F','W'],  // row 19: PASSAGE
  ['W','F','d','F','F','F','d','F','F','W',  'W','F','d','F','F','F','F','F','F','W'],  // row 20
  ['W','F','Z','F','L','F','Z','F','P','W',  'W','F','T','F','F','F','d','F','P','W'],  // row 21: chess tables + lamp
  ['W','F','u','F','F','F','u','F','F','W',  'W','F','F','u','F','F','T','F','F','W'],  // row 22
  ['W','P','F','F','F','F','F','F','F','W',  'W','P','F','F','F','F','u','F','F','W'],  // row 23
  ['W','F','F','d','F','F','F','F','F','W',  'W','F','u','F','F','F','F','F','F','W'],  // row 24
  ['W','F','F','Z','F','F','F','F','F','W',  'W','u','T','F','F','F','F','F','F','D'],  // row 25: chess table + door
  ['W','F','F','u','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 26
  ['W','W','W','W','W','W','W','W','W','W',  'c','C','C','C','C','C','C','C','C','C'],  // row 27: counter
  ['W','W','W','W','W','W','W','W','W','W',  'W','F','X','Q','F','F','X','Q','F','W'],  // row 28: behind counter
  ['W','W','W','W','W','W','W','W','W','W',  'W','W','W','W','W','W','W','W','W','W'],  // row 29: back wall
]

// Legacy single-customer positions (kept for backward compat)
export const CUSTOMER_POS = { row: 26, col: 15 }
export const DOOR_POS = { row: 25, col: 19 }

// Multi-customer entry/exit points
export const DOOR_ENTRY = { row: 25, col: 19 } // door tile — customers walk in/out here
export const DOOR_EXIT = { row: 25, col: 19 }

// Walkable tile check
const WALKABLE_TILES: Set<string> = new Set([T.FLOOR, T.DOOR, T.CHAIR_U, T.CHAIR_D, T.GRASS, T.PATH, T.BENCH])

export function isWalkable(row: number, col: number): boolean {
  if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return false
  const tile = CAFE_LAYOUT[row]?.[col]
  return tile !== undefined && WALKABLE_TILES.has(tile)
}

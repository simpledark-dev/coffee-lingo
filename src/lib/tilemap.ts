// Cafe layout as a 2D grid.
// Each cell is a tile ID that maps to a sprite.
// The grid is rendered at TILE_SIZE * SCALE pixels per tile on the canvas.
//
// SWAP GUIDE: When replacing sprites with PNG assets, this file stays the same.
// Only the renderer (CafeCanvas.tsx) changes how tiles are drawn.

export const TILE_SIZE = 16
export const SCALE = 3 // 3x → each tile is 48px

// Grid: 20 columns × 22 rows (two 10-col rooms side by side)
// Left room (cols 0–9): reading/activity room
// Right room (cols 10–19): cafe (original layout shifted +10)
// Connecting passage at rows 10-11 between col 9 and col 10
export const GRID_COLS = 20
export const GRID_ROWS = 22

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
} as const

// Two-room layout: 20 wide × 22 tall
// Left = reading room, Right = cafe, passage at rows 10-11
export const CAFE_LAYOUT: string[][] = [
  //  ---- READING ROOM (cols 0-9) ----                        ---- CAFE (cols 10-19) ----
  ['W','N','N','W','W','W','W','N','N','W',  'W','N','N','W','W','W','W','N','N','W'],  // row 0
  ['W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','P','F','F','F','F','W'],  // row 1
  ['W','F','B','F','F','F','F','B','F','W',  'W','F','d','F','F','F','F','d','F','W'],  // row 2
  ['W','F','F','F','F','F','F','F','F','W',  'W','F','T','F','F','F','F','T','F','W'],  // row 3
  ['W','F','d','F','F','F','d','F','F','W',  'W','F','F','u','F','F','u','F','F','W'],  // row 4
  ['W','F','T','F','P','F','T','F','F','W',  'W','P','F','F','F','F','F','F','P','W'],  // row 5
  ['W','F','u','F','F','F','u','F','F','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 6
  ['W','F','F','F','F','F','F','F','P','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 7

  // === DIVIDER rows 8-9 ===
  ['W','W','W','W','F','W','W','W','W','W',  'W','W','W','W','F','F','W','W','W','W'],  // row 8
  ['W','F','B','B','F','F','B','B','F','W',  'W','W','S','S','F','F','M','M','W','W'],  // row 9

  // === LOWER AREAS (rows 10-21) — passage at cols 9-10 ===
  ['W','F','F','F','F','F','F','F','F','F',  'F','F','F','F','F','F','F','F','F','W'],  // row 10: PASSAGE
  ['W','F','F','F','F','F','F','F','F','F',  'F','F','F','F','F','F','F','F','F','W'],  // row 11: PASSAGE
  ['W','F','d','F','F','F','F','F','F','W',  'W','F','d','F','F','F','F','F','F','W'],  // row 12
  ['W','F','T','F','F','F','d','F','P','W',  'W','F','T','F','F','F','d','F','P','W'],  // row 13
  ['W','F','F','u','F','F','T','F','F','W',  'W','F','F','u','F','F','T','F','F','W'],  // row 14
  ['W','F','F','F','F','F','u','F','F','W',  'W','F','F','F','F','F','u','F','F','W'],  // row 15
  ['W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 16
  ['W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','D'],  // row 17: door on cafe side
  ['W','F','F','F','F','F','F','F','F','W',  'W','F','F','F','F','F','F','F','F','W'],  // row 18
  ['W','W','W','W','W','W','W','W','W','W',  'c','C','C','C','C','C','C','C','C','C'],  // row 19: cafe counter
  ['W','W','W','W','W','W','W','W','W','W',  'W','F','X','Q','F','F','X','Q','F','W'],  // row 20: behind counter
  ['W','W','W','W','W','W','W','W','W','W',  'W','W','W','W','W','W','W','W','W','W'],  // row 21: back wall
]

// Legacy single-customer positions (kept for backward compat)
export const CUSTOMER_POS = { row: 18, col: 15 }
export const DOOR_POS = { row: 17, col: 19 }

// Multi-customer entry/exit points
export const DOOR_ENTRY = { row: 17, col: 19 } // door tile — customers walk in/out here
export const DOOR_EXIT = { row: 17, col: 19 }

// Walkable tile check
const WALKABLE_TILES: Set<string> = new Set([T.FLOOR, T.DOOR, T.CHAIR_U, T.CHAIR_D])

export function isWalkable(row: number, col: number): boolean {
  if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return false
  const tile = CAFE_LAYOUT[row]?.[col]
  return tile !== undefined && WALKABLE_TILES.has(tile)
}

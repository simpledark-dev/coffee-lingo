// Cafe layout as a 2D grid.
// Each cell is a tile ID that maps to a sprite.
// The grid is rendered at TILE_SIZE * SCALE pixels per tile on the canvas.
//
// SWAP GUIDE: When replacing sprites with PNG assets, this file stays the same.
// Only the renderer (CafeCanvas.tsx) changes how tiles are drawn.

export const TILE_SIZE = 16
export const SCALE = 3 // 3x → each tile is 48px

// Grid: 10 columns × 22 rows (fits ~390px mobile viewport at 48px/tile)
export const GRID_COLS = 10
export const GRID_ROWS = 22

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
} as const

// Cafe layout — two rooms connected by corridor + archway
// 10 wide × 22 tall
export const CAFE_LAYOUT: string[][] = [
  // === UPPER SEATING ROOM (rows 0-8) ===
  ['W','N','N','W','W','W','W','N','N','W'],  // row 0: top wall, windows
  ['W','F','F','F','P','F','F','F','F','W'],  // row 1: lamp, open
  ['W','F','d','F','F','F','F','d','F','W'],  // row 2: chairs facing down
  ['W','F','T','F','F','F','F','T','F','W'],  // row 3: tables
  ['W','F','F','u','F','F','u','F','F','W'],  // row 4: chairs facing up (diagonal)
  ['W','P','F','F','F','F','F','F','P','W'],  // row 5: plants
  ['W','F','F','F','F','F','F','F','F','W'],  // row 6: open floor
  ['W','F','F','F','F','F','F','F','F','W'],  // row 7: open floor

  // === DIVIDER: wall with doorway + shelves/menus (rows 8-9) ===
  ['W','W','W','W','F','F','W','W','W','W'],  // row 8: wall with opening at cols 4-5
  ['W','W','S','S','F','F','M','M','W','W'],  // row 9: shelves left, menus right, opening cols 4-5

  // === MAIN CAFE (rows 10-21) ===
  ['W','F','F','F','F','F','F','F','F','W'],  // row 10: open floor
  ['W','F','F','F','F','F','F','F','F','W'],  // row 11: lamp
  ['W','F','d','F','F','F','F','F','F','W'],  // row 12: chair
  ['W','F','T','F','F','F','d','F','P','W'],  // row 13: table, chair, plant
  ['W','F','F','u','F','F','T','F','F','W'],  // row 14: chair (diagonal), table
  ['W','F','F','F','F','F','u','F','F','W'],  // row 15: chair
  ['W','F','F','F','F','F','F','F','F','W'],  // row 16: open floor
  ['W','F','F','F','F','F','F','F','F','D'],  // row 17: door at right edge
  ['W','F','F','F','F','F','F','F','F','W'],  // row 18: in front of counter
  ['c','C','C','C','C','C','C','C','C','C'],  // row 19: counter
  ['W','F','X','Q','F','F','X','Q','F','W'],  // row 20: behind counter workspace
  ['W','W','W','W','W','W','W','W','W','W'],  // row 21: back wall
]

// Legacy single-customer positions (kept for backward compat)
export const CUSTOMER_POS = { row: 18, col: 5 }
export const DOOR_POS = { row: 17, col: 9 }

// Multi-customer entry/exit points
export const DOOR_ENTRY = { row: 17, col: 9 } // door tile — customers walk in/out here
export const DOOR_EXIT = { row: 17, col: 9 }

// Walkable tile check
const WALKABLE_TILES: Set<string> = new Set([T.FLOOR, T.DOOR, T.CHAIR_U, T.CHAIR_D])

export function isWalkable(row: number, col: number): boolean {
  if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return false
  const tile = CAFE_LAYOUT[row]?.[col]
  return tile !== undefined && WALKABLE_TILES.has(tile)
}

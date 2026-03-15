// Cafe layout as a 2D grid.
// Each cell is a tile ID that maps to a sprite.
// The grid is rendered at TILE_SIZE * SCALE pixels per tile on the canvas.
//
// SWAP GUIDE: When replacing sprites with PNG assets, this file stays the same.
// Only the renderer (CafeCanvas.tsx) changes how tiles are drawn.

export const TILE_SIZE = 16
export const SCALE = 3 // 3x → each tile is 48px

// Grid: 18 columns × 20 rows
export const GRID_COLS = 18
export const GRID_ROWS = 20

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

// Expanded cafe layout — two rooms connected by archway
// 18 wide × 20 tall
export const CAFE_LAYOUT: string[][] = [
  // === UPPER SEATING ROOM (rows 0-7) ===
  // Row 0: Top wall with windows
  ['W','W','N','N','W','W','W','W','W','W','W','W','W','W','N','N','W','W'],
  // 4 tables: top-left(2), top-right(2), center-left(3), center-right(2)
  ['W','F','F','d','F','P','F','F','L','F','F','F','P','F','d','F','F','W'],
  ['W','F','F','T','F','F','F','F','F','F','F','F','F','F','T','F','F','W'],
  ['W','F','F','F','u','F','d','F','F','F','F','F','d','u','F','F','F','W'],
  ['W','F','F','F','F','F','T','F','F','F','F','F','T','F','F','F','F','W'],
  ['W','F','F','F','F','u','F','u','F','F','F','u','F','F','F','F','F','W'],
  ['W','F','P','F','F','F','F','F','F','F','F','F','F','F','F','P','F','W'],
  // Row 7: Divider wall with archway (cols 7-9 open)
  ['W','W','W','W','W','W','W','F','F','F','W','W','W','W','W','W','W','W'],

  // === MAIN CAFE (rows 8-19) ===
  // Row 8-9: Back wall with windows, shelves, menu — archway opening at cols 7-9
  ['W','W','N','N','W','S','W','F','F','F','M','M','W','L','W','S','N','W'],
  ['W','W','N','N','W','S','W','F','F','F','M','M','W','W','W','S','N','W'],
  // 4 tables: top-left(2), top-right(3), bottom-left(2), bottom-right(2)
  ['F','P','F','d','F','F','F','F','F','F','F','d','F','F','F','F','F','F'],
  ['F','F','F','T','F','F','F','F','F','F','F','T','F','d','F','P','F','F'],
  ['F','F','u','F','F','d','F','F','F','F','u','F','F','F','F','F','F','F'],
  ['F','F','F','F','F','T','F','F','F','F','F','F','T','F','F','F','F','D'],
  ['F','F','F','F','u','u','F','F','F','F','F','u','F','F','F','P','F','D'],
  // Row 15: Customer stands here (in front of counter)
  ['F','F','F','F','F','F','F','F','F','F','F','F','F','F','F','F','F','F'],
  // Row 16: Counter
  ['c','C','C','C','C','C','C','C','C','C','C','C','C','C','C','C','C','C'],
  // Row 17-19: Behind counter (barista workspace)
  ['F','F','X','F','Q','F','F','X','F','Q','F','F','F','Q','F','F','X','F'],
  ['F','F','F','F','F','F','F','F','F','F','F','F','F','F','F','F','F','F'],
  ['W','W','W','W','W','W','W','W','W','W','W','W','W','W','W','W','W','W'],
]

// Customer stands at row 15, roughly center
export const CUSTOMER_POS = { row: 15, col: 8 }
// Door entrance point (right side)
export const DOOR_POS = { row: 14, col: 18 }

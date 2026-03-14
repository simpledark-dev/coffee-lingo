// Cafe layout as a 2D grid.
// Each cell is a tile ID that maps to a sprite.
// The grid is rendered at TILE_SIZE * SCALE pixels per tile on the canvas.
//
// SWAP GUIDE: When replacing sprites with PNG assets, this file stays the same.
// Only the renderer (CafeCanvas.tsx) changes how tiles are drawn.

export const TILE_SIZE = 16
export const SCALE = 3 // 3x → each tile is 48px, fitting ~8 tiles across 390px

// Grid: 12 columns × 10 rows → 576 × 480 at 3x scale
export const GRID_COLS = 12
export const GRID_ROWS = 10

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
} as const

// Compact cafe layout — cozy feel, everything visible
// 12 wide × 10 tall
export const CAFE_LAYOUT: string[][] = [
  // Row 0-1: Back wall with decorations
  ['W','W','S','W','L','W','W','M','M','W','S','W'],
  ['W','W','S','W','W','W','W','M','M','W','S','W'],
  // Row 2-3: Floor with tables & seating
  ['F','F','F','T','F','F','F','F','T','F','F','F'],
  ['F','P','u','F','d','F','F','u','F','d','F','F'],
  // Row 4-5: Open floor / walkway + door
  ['F','F','F','F','F','F','F','F','F','F','F','D'],
  ['F','F','F','F','F','F','F','F','F','F','F','D'],
  // Row 6: Customer stands here (in front of counter)
  ['F','F','F','F','F','F','F','F','F','F','F','F'],
  // Row 7: Counter
  ['c','C','C','C','C','C','C','C','C','C','C','C'],
  // Row 8-9: Behind counter (barista side)
  ['F','F','X','F','Q','F','F','F','Q','F','F','F'],
  ['F','F','F','F','F','F','F','F','F','F','F','F'],
]

// Customer stands at row 6, roughly center
export const CUSTOMER_POS = { row: 5, col: 5 }
// Door entrance point
export const DOOR_POS = { row: 5, col: 12 }

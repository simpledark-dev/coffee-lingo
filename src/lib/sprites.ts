// Each sprite is a 32x32 grid of color indices.
// A palette maps indices to hex colors. 0 = transparent.
//
// SWAP GUIDE: When replacing with PNG assets, delete this file
// and update CafeCanvas.tsx to use drawImage() from a spritesheet.

export const PALETTE = [
  'transparent',   // 0
  '#3E2723',       // 1  dark brown (wood dark)
  '#5D4037',       // 2  medium brown (wood)
  '#795548',       // 3  light brown (wood light)
  '#8D6E63',       // 4  tan
  '#A1887F',       // 5  light tan
  '#D7CCC8',       // 6  cream (others: "#E2D5AE")
  '#EFEBE9',       // 7  off-white
  '#F5F5F5',       // 8  white
  '#212121',       // 9  near black
  '#424242',       // 10 dark gray
  '#757575',       // 11 gray
  '#BDBDBD',       // 12 light gray
  '#89CD74',       // 13 green
  '#81C784',       // 14 light green
  '#FF8A65',       // 15 orange/coral
  '#FFCC80',       // 16 light orange
  '#FFD54F',       // 17 gold/yellow
  '#42A5F5',       // 18 blue
  '#90CAF9',       // 19 light blue
  '#EF5350',       // 20 red
  '#CE93D8',       // 21 purple/lavender
  '#4E342E',       // 22 counter dark
  '#6D4C41',       // 23 counter medium
  '#BCAAA4',       // 24 counter light
  '#2E2E2E',       // 25 chalkboard
  '#FFF8E1',       // 26 warm white
  '#C8E6C9',       // 27 mint
  '#1B5E20',       // 28 dark green
  '#FFE0B2',       // 29 peach
  '#3E2723',       // 30 = 1 (alias)
  '#E8D5B7',       // 31 warm beige floor
  '#1565C0',       // 32 dark blue (shirt shadow)
  '#C62828',       // 33 dark red (shirt shadow)
  '#388E3C',       // 34 dark green (shirt shadow)
  '#7B1FA2',       // 35 dark purple (shirt shadow)
  '#BF360C',       // 36 dark coral (shirt shadow)
  '#8D5524',       // 37 dark skin
  '#6D4019',       // 38 dark skin shadow
  '#26A69A',       // 39 teal
  '#00796B',       // 40 teal dark
  '#F48FB1',       // 41 pink
  '#C2185B',       // 42 pink dark
  '#FDD835',       // 43 yellow
  '#F9A825',       // 44 yellow dark
  '#78909C',       // 45 gray-blue
  '#546E7A',       // 46 gray-blue dark
  '#D84315',       // 47 ginger/auburn hair
  '#9E9E9E',       // 48 gray hair
  '#FFDAB9',       // 49 light skin
  '#E8B88A',       // 50 light skin shadow
]

type Sprite = number[][]

// 32x32 wood floor — subtle horizontal plank lines, quiet background
export const FLOOR_WOOD: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(31))
  for (let c = 0; c < 32; c++) { s[10][c] = 5; s[21][c] = 5 }
  s[4][8] = 5; s[15][22] = 5; s[27][14] = 5
  return s
})()

// 32x32 squared tile floor — uniform squares with thin grout lines
export const FLOOR_TILE: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(6)) // cream fill
  // 1px grout lines forming a grid of squares
  const grout = 5
  for (let c = 0; c < 32; c++) { s[0][c] = grout; s[16][c] = grout }
  for (let r = 0; r < 32; r++) { s[r][0] = grout; s[r][16] = grout }
  return s
})()

// Wall tile with brick pattern
export const WALL: Sprite = [
  [ 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [ 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [ 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2],
  [ 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [ 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
]

// Counter top
export const COUNTER_TOP: Sprite = [
  [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [22,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,22],
  [22,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,22],
  [22,24, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,24,22],
  [22,24, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,24,22],
  [22,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,22],
  [22,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,22],
  [22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22],
  [22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22],
  [22, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1,22],
  [22, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1,22],
  [22, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1,22],
  [22, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1,22],
  [22, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1,22],
  [22, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1,22],
  [22, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1,22],
  [22, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1,22],
  [22, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1,22],
  [22, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1,22],
  [22, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1,22],
  [22, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1,22],
  [22, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,22],
  [22, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,22],
  [22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22],
  [22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22],
  [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
]

// Counter end (left side)
export const COUNTER_END_L: Sprite = [
  [ 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [ 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [ 0, 0, 0, 0,22,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,22],
  [ 0, 0, 0, 0,22,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,22],
  [ 0, 0, 0, 0,22,24, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,24,22],
  [ 0, 0, 0, 0,22,24, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,24,22],
  [ 0, 0, 0, 0,22,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,22],
  [ 0, 0, 0, 0,22,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,22],
  [ 0, 0, 0, 0,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22],
  [ 0, 0, 0, 0,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22],
  [ 0, 0, 0, 0,22, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 2, 1,22],
  [ 0, 0, 0, 0,22, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 2, 1,22],
  [ 0, 0, 0, 0,22, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 2, 1,22],
  [ 0, 0, 0, 0,22, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 2, 1,22],
  [ 0, 0, 0, 0,22, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 2, 1,22],
  [ 0, 0, 0, 0,22, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 2, 1,22],
  [ 0, 0, 0, 0,22, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 2, 1,22],
  [ 0, 0, 0, 0,22, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 2, 1,22],
  [ 0, 0, 0, 0,22, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 2, 1,22],
  [ 0, 0, 0, 0,22, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1, 2, 1,22],
  [ 0, 0, 0, 0,22, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 2, 1,22],
  [ 0, 0, 0, 0,22, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 1, 2, 1,22],
  [ 0, 0, 0, 0,22, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,22],
  [ 0, 0, 0, 0,22, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,22],
  [ 0, 0, 0, 0,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22],
  [ 0, 0, 0, 0,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22],
  [ 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [ 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
]

// Table (round cafe table, top-down)
export const TABLE: Sprite = [
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 1, 4, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 4, 1, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 1, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 4, 1, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 1, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 4, 1, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 1, 4, 5, 6, 6, 6, 6, 6, 7, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 4, 1, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 1, 4, 5, 6, 6, 6, 6, 6, 7, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 4, 1, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 1, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 4, 1, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 1, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 4, 1, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 1, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 4, 1, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 1, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 4, 1, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 1, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 4, 1, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 1, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 4, 1, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 1, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 4, 1, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 1, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 4, 1, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 1, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 4, 1, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 1, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 4, 1, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 1, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 4, 1, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 1, 4, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 4, 1, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 1, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 1, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
]

// Chair (top-down view)
export const CHAIR: Sprite = [
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 4, 4, 3, 3, 3, 3, 3, 3, 4, 4, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
]

// Coffee machine
export const COFFEE_MACHINE: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Main body (chrome)
  for (let r = 2; r < 20; r++) for (let c = 7; c < 25; c++) s[r][c] = 12
  for (let r = 3; r < 19; r++) for (let c = 8; c < 24; c++) s[r][c] = 11
  // Highlight strip (left edge)
  for (let r = 3; r < 19; r++) s[r][8] = 12
  // Top cap
  for (let c = 8; c < 24; c++) { s[1][c] = 10; s[2][c] = 10 }
  // Display screen (green glow)
  for (let r = 4; r < 9; r++) for (let c = 10; c < 22; c++) s[r][c] = 28
  for (let r = 5; r < 8; r++) for (let c = 11; c < 21; c++) s[r][c] = 13
  for (let c = 12; c < 18; c++) s[6][c] = 14  // text line
  // Buttons (row 10)
  s[10][11] = 20; s[10][12] = 20  // red button
  s[10][14] = 13; s[10][15] = 13  // green button
  s[10][17] = 18; s[10][18] = 18  // blue button
  s[10][20] = 17; s[10][21] = 17  // yellow button
  // Pressure gauge (circular)
  s[12][11] = 10; s[12][12] = 12; s[12][13] = 10
  s[13][11] = 12; s[13][12] = 8;  s[13][13] = 12
  s[14][11] = 10; s[14][12] = 12; s[14][13] = 10
  // Gauge needle
  s[12][12] = 20
  // Group head / spout
  for (let r = 15; r < 19; r++) for (let c = 14; c < 18; c++) s[r][c] = 10
  for (let r = 16; r < 18; r++) for (let c = 15; c < 17; c++) s[r][c] = 9
  // Portafilter handle
  for (let c = 18; c < 22; c++) s[17][c] = 1
  s[16][18] = 10; s[16][19] = 10
  // Steam wand (right side)
  for (let r = 12; r < 19; r++) s[r][21] = 12
  for (let r = 12; r < 19; r++) s[r][22] = 11
  s[18][20] = 12; s[18][21] = 12  // wand tip
  // Steam
  s[19][21] = 8; s[20][20] = 8; s[20][22] = 8
  // Drip tray
  for (let r = 20; r < 22; r++) for (let c = 9; c < 23; c++) s[r][c] = 10
  for (let c = 10; c < 22; c++) s[21][c] = 9  // grating
  // Grating detail (alternating)
  for (let c = 10; c < 22; c += 2) s[20][c] = 9
  return s
})()

// Shelf with varied jars, bottles, and items
export const SHELF: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Shelf planks (with depth)
  for (let c = 0; c < 32; c++) { s[10][c] = 1; s[11][c] = 3 }
  for (let c = 0; c < 32; c++) { s[22][c] = 1; s[23][c] = 3 }
  // Back wall tint
  for (let r = 0; r < 10; r++) for (let c = 0; c < 32; c++) s[r][c] = 2
  for (let r = 12; r < 22; r++) for (let c = 0; c < 32; c++) s[r][c] = 2

  // Item helper: jar/bottle with cap and label
  function jar(r1: number, c1: number, w: number, h: number, bodyColor: number, capColor: number) {
    for (let r = r1; r < r1 + h; r++) for (let c = c1; c < c1 + w; c++) s[r][c] = bodyColor
    // Cap
    for (let c = c1; c < c1 + w; c++) s[r1][c] = capColor
    // Highlight
    for (let r = r1 + 1; r < r1 + h - 1; r++) s[r][c1] = 8
    // Label (middle band)
    const labelR = r1 + Math.floor(h / 2)
    for (let c = c1; c < c1 + w; c++) s[labelR][c] = 7
  }

  // Top shelf items (rows 3-9)
  jar(4, 3, 3, 6, 15, 1)    // coral jar
  jar(5, 7, 3, 5, 17, 2)    // gold jar, shorter
  jar(3, 11, 2, 7, 20, 1)   // tall red bottle
  jar(5, 14, 4, 5, 18, 10)  // wide blue jar
  jar(4, 19, 3, 6, 13, 28)  // green jar
  jar(6, 23, 3, 4, 21, 9)   // short purple jar
  jar(4, 27, 2, 6, 17, 1)   // tall gold bottle

  // Bottom shelf items (rows 13-21)
  jar(14, 3, 4, 8, 17, 2)   // wide gold jar
  jar(16, 8, 2, 6, 20, 9)   // thin red bottle
  jar(13, 11, 3, 9, 15, 1)  // tall coral jar
  jar(15, 15, 3, 7, 18, 10) // blue jar
  jar(14, 19, 4, 8, 13, 28) // wide green jar
  jar(16, 24, 3, 6, 21, 9)  // purple jar
  jar(15, 28, 2, 7, 17, 1)  // gold bottle

  return s
})()

// Menu board (chalkboard)
export const MENU_BOARD: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Frame
  for (let r = 2; r < 28; r++) for (let c = 2; c < 30; c++) s[r][c] = 1
  // Board
  for (let r = 3; r < 27; r++) for (let c = 3; c < 29; c++) s[r][c] = 25
  // Text lines
  const lines = [6, 10, 14, 18, 22]
  for (const r of lines) {
    const len = 12 + Math.floor((r * 3) % 8)
    for (let c = 5; c < 5 + len && c < 27; c++) { s[r][c] = 7; s[r+1][c] = 7 }
  }
  // Title
  for (let c = 8; c < 24; c++) { s[4][c] = 26; s[5][c] = 26 }
  return s
})()

// Door frame
export const DOOR: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Frame
  for (let r = 0; r < 30; r++) for (let c = 4; c < 28; c++) s[r][c] = 1
  for (let r = 1; r < 29; r++) for (let c = 5; c < 27; c++) s[r][c] = 2
  for (let r = 2; r < 28; r++) for (let c = 6; c < 26; c++) s[r][c] = 3
  // Window pane
  for (let r = 6; r < 18; r++) for (let c = 8; c < 24; c++) s[r][c] = 19
  // Handle
  s[20][13] = 11; s[20][14] = 11; s[21][13] = 11; s[21][14] = 11
  // Floor at bottom
  for (let c = 0; c < 32; c++) { s[30][c] = 31; s[31][c] = 31 }
  return s
})()

// Hanging lamp with warm glow
export const LAMP: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Chain/cord
  for (let r = 0; r < 6; r++) { s[r][15] = 10; s[r][16] = 9 }
  // Chain link detail
  s[1][15] = 11; s[3][15] = 11; s[5][15] = 11
  // Lamp shade (dome shape, wider at bottom)
  for (let r = 6; r < 14; r++) {
    const w = 3 + Math.floor((r - 6) * 1.5)
    const start = 16 - w, end = 16 + w
    for (let c = start; c < end; c++) {
      // Outer edge darker, inner lighter
      if (c === start || c === end - 1) s[r][c] = 1
      else if (c === start + 1 || c === end - 2) s[r][c] = 17
      else s[r][c] = 16
    }
  }
  // Shade highlight (left side)
  for (let r = 7; r < 13; r++) {
    const w = 3 + Math.floor((r - 6) * 1.5)
    const start = 16 - w
    s[r][start + 2] = 26
  }
  // Bottom rim
  for (let c = 4; c < 28; c++) s[14][c] = 1
  for (let c = 5; c < 27; c++) s[15][c] = 2
  // Bulb
  s[14][15] = 17; s[14][16] = 17
  s[15][15] = 26; s[15][16] = 26
  // Warm glow cone (fades out)
  for (let r = 16; r < 24; r++) {
    const spread = Math.floor((r - 16) * 0.8)
    for (let c = 13 - spread; c < 19 + spread; c++) {
      if (c >= 0 && c < 32) s[r][c] = 26
    }
  }
  // Dimmer outer glow
  for (let r = 18; r < 22; r++) {
    const spread = Math.floor((r - 16) * 0.8)
    if (13 - spread - 1 >= 0) s[r][13 - spread - 1] = 26
    if (19 + spread < 32) s[r][19 + spread] = 26
  }
  return s
})()

// Plant pot with individual leaf clusters
export const PLANT: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Stem
  for (let r = 10; r < 17; r++) { s[r][15] = 28; s[r][16] = 13 }
  // Leaf cluster helper
  function leaf(cr: number, cc: number, size: number, light: number, dark: number) {
    for (let r = 0; r < 32; r++) for (let c = 0; c < 32; c++) {
      const dx = c - cc, dy = r - cr
      const dist = Math.sqrt(dx * dx + dy * dy * 1.5)
      if (dist < size) {
        if (s[r][c] === 0 || s[r][c] === 13 || s[r][c] === 28) {
          s[r][c] = dist < size * 0.5 ? light : dark
        }
      }
    }
  }
  // Main leaf clusters
  leaf(6, 16, 7, 14, 13)     // center top
  leaf(8, 10, 5, 14, 13)     // left
  leaf(8, 22, 5, 14, 13)     // right
  leaf(4, 13, 4, 27, 14)     // upper left (lighter)
  leaf(4, 20, 4, 27, 14)     // upper right (lighter)
  leaf(2, 16, 3, 14, 28)     // very top (darker)
  // Leaf vein highlights
  s[5][15] = 27; s[5][17] = 27; s[7][11] = 27; s[7][21] = 27
  // Pot rim
  for (let c = 10; c < 22; c++) { s[16][c] = 15; s[17][c] = 15 }
  for (let c = 9; c < 23; c++) s[15][c] = 15  // wider rim top
  // Pot body (terracotta with shading)
  for (let r = 18; r < 24; r++) {
    const inset = Math.floor((r - 18) * 0.4)
    for (let c = 10 + inset; c < 22 - inset; c++) s[r][c] = 15
  }
  // Pot inner shadow
  for (let r = 18; r < 23; r++) {
    const inset = Math.floor((r - 18) * 0.4)
    for (let c = 11 + inset; c < 21 - inset; c++) s[r][c] = 4
  }
  // Pot highlight (left edge)
  for (let r = 18; r < 23; r++) { const i = Math.floor((r-18)*0.4); s[r][10+i] = 16 }
  // Soil
  for (let c = 12; c < 20; c++) { s[14][c] = 2; s[15][c] = 15 }
  return s
})()

// Coffee cup with latte art and steam wisps
export const COFFEE_CUP: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Steam wisps (wavy)
  s[7][14] = 12; s[6][15] = 12; s[7][17] = 12; s[6][18] = 12
  s[5][13] = 8;  s[4][14] = 8;  s[5][18] = 8;  s[4][17] = 8
  s[3][15] = 12; s[3][16] = 12
  // Cup body (rounded)
  for (let r = 10; r < 21; r++) for (let c = 10; c < 22; c++) s[r][c] = 8
  // Cup inner (dark coffee)
  for (let r = 10; r < 13; r++) for (let c = 11; c < 21; c++) s[r][c] = 2
  // Latte art (heart shape)
  s[10][15] = 6; s[10][16] = 6
  s[11][14] = 6; s[11][15] = 7; s[11][16] = 7; s[11][17] = 6
  s[12][15] = 6; s[12][16] = 6
  // Cup body shading
  for (let r = 13; r < 20; r++) s[r][10] = 12  // left edge shadow
  for (let r = 13; r < 20; r++) s[r][21] = 12  // right edge shadow
  // Cup highlight
  for (let r = 13; r < 18; r++) s[r][12] = 7
  // Handle (curved)
  s[13][22] = 8; s[13][23] = 8
  for (let r = 14; r < 19; r++) { s[r][23] = 8 }
  s[19][22] = 8; s[19][23] = 8
  // Handle inner (hollow)
  for (let r = 15; r < 18; r++) s[r][22] = 0
  s[15][23] = 0; s[16][23] = 0; s[17][23] = 0
  // Cup base
  for (let c = 11; c < 21; c++) s[20][c] = 12
  // Saucer (with depth)
  for (let c = 8; c < 24; c++) s[21][c] = 12
  for (let c = 9; c < 23; c++) s[22][c] = 11
  for (let c = 10; c < 22; c++) s[23][c] = 12
  // Saucer highlight
  s[21][10] = 8; s[21][11] = 8
  return s
})()

// Window
export const WINDOW: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Frame
  for (let r = 0; r < 32; r++) for (let c = 0; c < 32; c++) s[r][c] = 1
  for (let r = 1; r < 31; r++) for (let c = 1; c < 31; c++) s[r][c] = 2
  // Glass panes (4 quadrants)
  for (let r = 2; r < 14; r++) for (let c = 2; c < 15; c++) s[r][c] = 19
  for (let r = 2; r < 14; r++) for (let c = 17; c < 30; c++) s[r][c] = 19
  for (let r = 18; r < 30; r++) for (let c = 2; c < 15; c++) s[r][c] = 19
  for (let r = 18; r < 30; r++) for (let c = 17; c < 30; c++) s[r][c] = 19
  // Dividers
  for (let r = 0; r < 32; r++) { s[r][15] = 2; s[r][16] = 2 }
  for (let c = 0; c < 32; c++) { s[15][c] = 2; s[16][c] = 2; s[17][c] = 2 }
  // Sky highlight
  for (let r = 4; r < 8; r++) for (let c = 4; c < 8; c++) s[r][c] = 18
  for (let r = 4; r < 8; r++) for (let c = 22; c < 26; c++) s[r][c] = 18
  // Small plant silhouettes in lower panes
  for (let r = 22; r < 28; r++) for (let c = 6; c < 12; c++) {
    if (Math.abs(c - 9) + Math.abs(r - 25) < 5) s[r][c] = 14
  }
  for (let r = 22; r < 28; r++) for (let c = 20; c < 26; c++) {
    if (Math.abs(c - 23) + Math.abs(r - 25) < 5) s[r][c] = 14
  }
  return s
})()

// Bookshelf — tall wooden shelf with colorful book spines, varied heights, and details
export const BOOKSHELF: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Wood frame
  for (let r = 0; r < 32; r++) { s[r][0] = 1; s[r][1] = 2; s[r][30] = 1; s[r][31] = 1 }
  // Frame highlight (left inner edge)
  for (let r = 2; r < 30; r++) s[r][2] = 3
  // Shelves (with depth: dark top, lighter front)
  for (let c = 0; c < 32; c++) { s[0][c] = 1; s[1][c] = 2 }
  for (let c = 0; c < 32; c++) { s[10][c] = 1; s[11][c] = 2 }
  for (let c = 0; c < 32; c++) { s[20][c] = 1; s[21][c] = 2 }
  for (let c = 0; c < 32; c++) { s[30][c] = 1; s[31][c] = 1 }
  // Shelf front lip highlight
  for (let c = 2; c < 30; c++) { s[11][c] = 3; s[21][c] = 3 }

  // Book helper: draws a book with spine highlight and dark edges
  function book(r1: number, r2: number, c1: number, c2: number, color: number) {
    for (let r = r1; r < r2; r++) for (let c = c1; c < c2; c++) s[r][c] = color
    // Spine highlight (left edge of each book)
    for (let r = r1; r < r2; r++) s[r][c1] = 8  // white spine edge
    // Dark right edge (shadow between books)
    for (let r = r1; r < r2; r++) s[r][c2 - 1] = 9
  }

  // Top shelf books (rows 2-9) — varied heights
  book(2, 10, 3, 6, 20)    // red, full height
  book(3, 10, 6, 9, 18)    // blue, slightly short
  book(2, 10, 9, 11, 13)   // green, full height, thin
  book(4, 10, 11, 14, 17)  // gold, short
  book(2, 10, 14, 17, 21)  // purple, full height
  book(3, 10, 17, 19, 15)  // coral, slightly short, thin
  book(2, 10, 19, 22, 18)  // blue, full height
  book(5, 10, 22, 24, 20)  // red, very short — tilted book
  book(2, 10, 24, 28, 17)  // gold, full height

  // Middle shelf books (rows 12-19) — different arrangement
  book(12, 20, 3, 5, 15)   // coral thin
  book(13, 20, 5, 9, 21)   // purple
  book(12, 20, 9, 12, 17)  // gold
  book(14, 20, 12, 15, 20) // red, short
  book(12, 20, 15, 18, 18) // blue, full
  // Small globe/ornament at col 18-20
  s[17][19] = 12; s[18][18] = 11; s[18][19] = 12; s[18][20] = 11
  s[19][19] = 10
  book(12, 20, 21, 24, 13) // green
  book(13, 20, 24, 28, 15) // coral

  // Bottom shelf books (rows 22-29)
  book(22, 30, 3, 7, 17)   // gold, full
  book(23, 30, 7, 10, 20)  // red
  book(22, 30, 10, 13, 21) // purple, full
  book(24, 30, 13, 16, 13) // green, short
  book(22, 30, 16, 19, 18) // blue, full
  book(22, 30, 19, 22, 15) // coral, full
  book(23, 30, 22, 25, 20) // red
  book(22, 30, 25, 29, 17) // gold, full

  return s
})()

// Customer sprites
export type CustomerDirection = 'down' | 'left' | 'right' | 'up'

export interface CustomerSprites {
  down: Sprite
  left: Sprite
  right: Sprite
  up: Sprite
}

export function makeCustomerSprites(
  S: number, Sd: number,   // shirt color, shirt dark
  K: number, Kd: number,   // skin, skin dark
  H: number, Hd: number,   // hair, hair dark
): CustomerSprites {

  // Facing down (front view)
  const down: Sprite = (() => {
    const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))

    // === HAIR (rounded dome) ===
    for (let c = 12; c <= 19; c++) s[0][c] = H
    for (let c = 11; c <= 20; c++) s[1][c] = H
    for (let c = 10; c <= 21; c++) s[2][c] = H
    for (let r = 3; r <= 5; r++) for (let c = 9; c <= 22; c++) s[r][c] = H
    // Hair side strands
    for (let r = 6; r <= 9; r++) { s[r][9] = H; s[r][22] = H }
    for (let r = 6; r <= 7; r++) { s[r][10] = H; s[r][21] = H }
    // Hair shading
    s[1][11] = Hd; s[2][10] = Hd
    for (let r = 3; r <= 5; r++) s[r][9] = Hd
    s[3][22] = Hd; s[4][22] = Hd

    // === FACE ===
    for (let r = 6; r <= 12; r++) for (let c = 11; c <= 20; c++) s[r][c] = K
    // Wider cheeks
    for (let r = 8; r <= 10; r++) s[r][10] = K
    // Chin narrowing
    for (let c = 12; c <= 19; c++) s[13][c] = K
    // Face shadow (right side)
    for (let r = 7; r <= 11; r++) s[r][20] = Kd
    s[8][21] = Kd; s[9][21] = Kd; s[10][21] = Kd
    s[12][19] = Kd; s[12][20] = Kd

    // === EYES (3×2 with sparkle) ===
    s[8][12] = 19; s[8][13] = 8; s[8][14] = 9
    s[9][12] = 8;  s[9][13] = 9; s[9][14] = 9
    s[8][17] = 9; s[8][18] = 8; s[8][19] = 19
    s[9][17] = 9; s[9][18] = 9; s[9][19] = 8

    // === EYEBROWS ===
    s[7][12] = Hd; s[7][13] = Hd
    s[7][18] = Hd; s[7][19] = Hd

    // === NOSE ===
    s[10][15] = Kd; s[10][16] = Kd

    // === MOUTH ===
    s[11][14] = 15; s[11][15] = 15; s[11][16] = 15; s[11][17] = 15

    // === NECK ===
    for (let c = 14; c <= 17; c++) s[14][c] = K
    s[14][17] = Kd

    // === SHIRT ===
    // Collar
    for (let c = 11; c <= 20; c++) s[15][c] = S
    s[15][15] = K; s[15][16] = K  // V-neck opening
    s[15][14] = Sd; s[15][17] = Sd
    // Shoulders
    for (let c = 9; c <= 22; c++) s[16][c] = S
    // Body
    for (let r = 17; r <= 22; r++) for (let c = 10; c <= 21; c++) s[r][c] = S
    // Shirt shadow (right side + fold)
    for (let r = 16; r <= 22; r++) { s[r][21] = Sd; s[r][20] = Sd }
    for (let r = 18; r <= 21; r++) s[r][16] = Sd

    // === ARMS ===
    // Left arm
    s[16][8] = S; s[16][9] = S
    for (let r = 17; r <= 21; r++) { s[r][8] = K; s[r][9] = K }
    s[17][9] = S  // short sleeve
    s[22][8] = K; s[22][9] = K
    // Right arm (shadowed)
    s[16][22] = Sd; s[16][23] = Sd
    for (let r = 17; r <= 21; r++) { s[r][22] = Kd; s[r][23] = Kd }
    s[17][22] = Sd  // short sleeve
    s[22][22] = Kd; s[22][23] = Kd

    // === BELT ===
    for (let c = 10; c <= 21; c++) s[23][c] = 1

    // === PANTS ===
    for (let r = 24; r <= 28; r++) {
      for (let c = 10; c <= 14; c++) s[r][c] = 2
      for (let c = 17; c <= 21; c++) s[r][c] = 2
    }
    for (let r = 24; r <= 28; r++) { s[r][14] = 1; s[r][21] = 1 }

    // === SHOES ===
    for (let c = 9; c <= 15; c++) { s[29][c] = 9; s[30][c] = 9 }
    for (let c = 16; c <= 22; c++) { s[29][c] = 9; s[30][c] = 9 }
    s[29][10] = 10; s[29][11] = 10
    s[29][17] = 10; s[29][18] = 10

    return s
  })()

  // Facing left (profile)
  const left: Sprite = (() => {
    const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))

    // === HAIR (side view — back of head on right) ===
    for (let c = 13; c <= 20; c++) s[0][c] = H
    for (let c = 12; c <= 21; c++) s[1][c] = H
    for (let c = 11; c <= 22; c++) s[2][c] = H
    for (let r = 3; r <= 5; r++) for (let c = 10; c <= 22; c++) s[r][c] = H
    // Hair hangs down on back
    for (let r = 6; r <= 10; r++) for (let c = 19; c <= 22; c++) s[r][c] = H
    // Bangs on front
    for (let r = 5; r <= 6; r++) { s[r][10] = H; s[r][11] = H }
    // Hair shading
    for (let r = 3; r <= 9; r++) s[r][22] = Hd
    s[2][22] = Hd; s[1][21] = Hd

    // === FACE (profile) ===
    for (let r = 6; r <= 12; r++) for (let c = 10; c <= 18; c++) s[r][c] = K
    // Forehead peek
    s[5][12] = K; s[5][13] = K; s[5][14] = K
    // Nose profile
    s[9][9] = K; s[10][9] = K; s[10][10] = K
    // Chin
    for (let c = 11; c <= 18; c++) s[12][c] = K
    for (let c = 12; c <= 17; c++) s[13][c] = K
    // Face shadow
    for (let r = 7; r <= 11; r++) s[r][18] = Kd
    s[12][17] = Kd; s[12][18] = Kd

    // === EYE (single profile eye) ===
    s[8][12] = 19; s[8][13] = 8
    s[9][12] = 9;  s[9][13] = 9

    // === EYEBROW ===
    s[7][12] = Hd; s[7][13] = Hd

    // === MOUTH ===
    s[11][11] = 15; s[11][12] = 15

    // === NECK ===
    for (let c = 13; c <= 17; c++) s[14][c] = K
    s[14][17] = Kd

    // === SHIRT ===
    for (let r = 15; r <= 22; r++) for (let c = 10; c <= 21; c++) s[r][c] = S
    s[15][12] = K; s[15][13] = K  // V-opening
    s[15][11] = Sd
    // Shirt shadow
    for (let r = 16; r <= 22; r++) { s[r][20] = Sd; s[r][21] = Sd }
    for (let r = 18; r <= 21; r++) s[r][16] = Sd

    // === ARM (front, reaching forward) ===
    s[16][8] = S; s[16][9] = S
    for (let r = 17; r <= 21; r++) { s[r][8] = K; s[r][9] = K }
    s[17][9] = S  // sleeve
    s[22][8] = K; s[22][9] = K

    // === BELT ===
    for (let c = 10; c <= 21; c++) s[23][c] = 1

    // === PANTS ===
    for (let r = 24; r <= 28; r++) for (let c = 11; c <= 20; c++) s[r][c] = 2
    for (let r = 24; r <= 28; r++) s[r][20] = 1

    // === SHOES ===
    for (let c = 10; c <= 21; c++) { s[29][c] = 9; s[30][c] = 9 }
    s[29][11] = 10; s[29][12] = 10

    return s
  })()

  // Facing right (mirror of left)
  const right: Sprite = left.map(row => [...row].reverse())

  // Facing up (back view)
  const up: Sprite = (() => {
    const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))

    // === HAIR (back of head — full coverage) ===
    for (let c = 12; c <= 19; c++) s[0][c] = H
    for (let c = 11; c <= 20; c++) s[1][c] = H
    for (let c = 10; c <= 21; c++) s[2][c] = H
    for (let r = 3; r <= 12; r++) for (let c = 9; c <= 22; c++) s[r][c] = H
    for (let c = 10; c <= 21; c++) s[13][c] = H
    // Hair part line
    for (let r = 3; r <= 8; r++) s[r][16] = Hd
    // Hair side shading
    for (let r = 3; r <= 12; r++) { s[r][9] = Hd; s[r][22] = Hd }
    s[2][10] = Hd; s[2][21] = Hd

    // === EARS (peek out) ===
    s[8][8] = K; s[9][8] = K
    s[8][23] = Kd; s[9][23] = Kd

    // === NECK ===
    for (let c = 14; c <= 17; c++) s[14][c] = K
    s[14][17] = Kd

    // === SHIRT ===
    for (let c = 11; c <= 20; c++) s[15][c] = S
    for (let c = 9; c <= 22; c++) s[16][c] = S
    for (let r = 17; r <= 22; r++) for (let c = 10; c <= 21; c++) s[r][c] = S
    // Shirt shadow
    for (let r = 16; r <= 22; r++) { s[r][21] = Sd; s[r][20] = Sd }
    for (let r = 17; r <= 21; r++) s[r][16] = Sd

    // === ARMS ===
    s[16][8] = S; s[16][9] = S; s[16][22] = Sd; s[16][23] = Sd
    for (let r = 17; r <= 21; r++) { s[r][8] = K; s[r][9] = K }
    for (let r = 17; r <= 21; r++) { s[r][22] = Kd; s[r][23] = Kd }
    s[22][8] = K; s[22][9] = K
    s[22][22] = Kd; s[22][23] = Kd

    // === BELT ===
    for (let c = 10; c <= 21; c++) s[23][c] = 1

    // === PANTS ===
    for (let r = 24; r <= 28; r++) {
      for (let c = 10; c <= 14; c++) s[r][c] = 2
      for (let c = 17; c <= 21; c++) s[r][c] = 2
    }
    for (let r = 24; r <= 28; r++) { s[r][14] = 1; s[r][21] = 1 }

    // === SHOES ===
    for (let c = 9; c <= 15; c++) { s[29][c] = 9; s[30][c] = 9 }
    for (let c = 16; c <= 22; c++) { s[29][c] = 9; s[30][c] = 9 }
    s[29][10] = 10; s[29][11] = 10
    s[29][17] = 10; s[29][18] = 10

    return s
  })()

  return { down, left, right, up }
}

// Backward compat
export function makeCustomerSprite(shirtColor: number, skinColor: number, hairColor: number): Sprite {
  return makeCustomerSprites(shirtColor, 10, skinColor, 3, hairColor, 9).down
}

// Pre-made customer variants (shirt, shirtDark, skin, skinDark, hair, hairDark)
export const CUSTOMER_SPRITES: CustomerSprites[] = [
  makeCustomerSprites(18, 32, 29, 16, 1, 9),    // 0: blue shirt, peach skin, dark brown hair
  makeCustomerSprites(20, 33, 4, 3, 9, 9),       // 1: red shirt, tan skin, black hair
  makeCustomerSprites(13, 34, 29, 16, 2, 1),     // 2: green shirt, peach skin, brown hair
  makeCustomerSprites(21, 35, 4, 3, 1, 9),       // 3: purple shirt, tan skin, dark brown hair
  makeCustomerSprites(15, 36, 29, 16, 17, 16),   // 4: coral shirt, peach skin, blonde hair
  makeCustomerSprites(39, 40, 37, 38, 9, 9),     // 5: teal shirt, dark skin, black hair
  makeCustomerSprites(41, 42, 49, 50, 1, 9),     // 6: pink shirt, light skin, dark brown hair
  makeCustomerSprites(43, 44, 4, 3, 47, 36),     // 7: yellow shirt, tan skin, ginger hair
  makeCustomerSprites(45, 46, 37, 38, 48, 11),   // 8: gray shirt, dark skin, gray hair
  makeCustomerSprites(18, 32, 49, 50, 9, 9),     // 9: blue shirt, light skin, black hair
  makeCustomerSprites(20, 33, 37, 38, 1, 9),     // 10: red shirt, dark skin, dark brown hair
  makeCustomerSprites(13, 34, 4, 3, 17, 16),     // 11: green shirt, tan skin, blonde hair
  makeCustomerSprites(21, 35, 49, 50, 47, 36),   // 12: purple shirt, light skin, ginger hair
]

export const CUSTOMERS = CUSTOMER_SPRITES.map(s => s.down)

// Exclamation mark indicator (16x16)
export const EXCLAMATION: Sprite = [
  [ 0, 0, 0, 0,17,17,17,17,17,17,17,17, 0, 0, 0, 0],
  [ 0, 0, 0,17,17,17,17,17,17,17,17,17,17, 0, 0, 0],
  [ 0, 0,17,17,17, 9, 9, 9, 9, 9, 9,17,17,17, 0, 0],
  [ 0,17,17,17, 9, 9, 9, 9, 9, 9, 9, 9,17,17,17, 0],
  [ 0,17,17, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,17,17, 0],
  [17,17, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,17,17],
  [17,17, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,17,17],
  [17,17, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,17,17],
  [17,17,17, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,17,17,17],
  [17,17,17, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,17,17,17],
  [ 0,17,17,17, 9, 9, 9, 9, 9, 9, 9, 9,17,17,17, 0],
  [ 0,17,17,17,17,17, 9, 9, 9, 9,17,17,17,17,17, 0],
  [ 0, 0,17,17,17,17,17,17,17,17,17,17,17,17, 0, 0],
  [ 0, 0, 0,17,17, 9, 9, 9, 9, 9, 9,17,17, 0, 0, 0],
  [ 0, 0, 0, 0,17,17, 9, 9, 9, 9,17,17, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0,17,17,17,17,17,17, 0, 0, 0, 0, 0],
]

// 32x32 grass tile — green fill with subtle shade variation
export const GRASS: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(13))
  // Lighter grass patches
  const light: [number,number][] = [
    [3,5],[3,18],[7,2],[7,25],[10,12],[14,7],[14,22],[18,3],[18,28],
    [22,10],[22,20],[26,6],[26,15],[26,27],[5,10],[12,28],[20,1],[28,18],
  ]
  for (const [r,c] of light) { s[r][c] = 14; if (c+1<32) s[r][c+1] = 14 }
  // Dark grass blades
  const dark: [number,number][] = [
    [1,8],[4,22],[8,14],[11,4],[15,26],[19,10],[23,18],[27,3],[6,30],[16,1],[25,22],
  ]
  for (const [r,c] of dark) { s[r][c] = 28 }
  return s
})()

// 32x32 hedge tile — dense dark green bush
export const HEDGE: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(28))
  // Lighter leaf highlights on top half
  for (let r = 2; r < 16; r++) {
    for (let c = 2; c < 30; c++) {
      if ((r + c) % 5 === 0) s[r][c] = 13
      if ((r * 3 + c) % 7 === 0) s[r][c] = 14
    }
  }
  // Mid green body
  for (let r = 8; r < 28; r++) {
    for (let c = 1; c < 31; c++) {
      if (s[r][c] === 28 && (r + c) % 4 === 0) s[r][c] = 13
    }
  }
  // Shadow at bottom
  for (let c = 0; c < 32; c++) { s[30][c] = 9; s[31][c] = 9 }
  return s
})()

// 32x32 stone path tile — warm tan with subtle stone edges
export const PATH_TILE: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(5))
  // Stone borders
  const border = 4
  for (let c = 0; c < 32; c++) { s[0][c] = border; s[31][c] = border }
  for (let r = 0; r < 32; r++) { s[r][0] = border; s[r][31] = border }
  // A few lighter highlights
  const highlights: [number,number][] = [[8,8],[8,24],[16,16],[24,8],[24,24]]
  for (const [r,c] of highlights) { s[r][c] = 7; s[r][c+1] = 7 }
  return s
})()

// 32x32 flower tile — grass base with small colorful flowers
export const FLOWER: Sprite = (() => {
  // Start with grass
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(13))
  // Light grass patches
  const light: [number,number][] = [[4,6],[10,20],[18,8],[24,24],[14,14]]
  for (const [r,c] of light) { s[r][c] = 14 }
  // Flowers — small 3px crosses
  const flowers: {r:number,c:number,color:number}[] = [
    {r:4,c:14,color:20}, {r:8,c:6,color:17}, {r:10,c:24,color:21},
    {r:16,c:10,color:15}, {r:20,c:20,color:20}, {r:26,c:8,color:17},
    {r:14,c:28,color:21}, {r:24,c:16,color:15},
  ]
  for (const f of flowers) {
    s[f.r][f.c] = f.color
    if (f.r>0) s[f.r-1][f.c] = f.color
    if (f.r<31) s[f.r+1][f.c] = f.color
    if (f.c>0) s[f.r][f.c-1] = f.color
    if (f.c<31) s[f.r][f.c+1] = f.color
    // Green stem below
    if (f.r+2<32) s[f.r+2][f.c] = 28
  }
  return s
})()

// 32x32 park bench tile — wooden bench seen from above
export const BENCH: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Grass background
  for (let r = 0; r < 32; r++) for (let c = 0; c < 32; c++) s[r][c] = 13
  // Bench seat (horizontal planks) — rows 10-21, cols 4-27
  for (let r = 10; r <= 21; r++) {
    for (let c = 4; c <= 27; c++) {
      s[r][c] = 3 // light brown wood
    }
  }
  // Plank seam lines
  for (let c = 4; c <= 27; c++) { s[13][c] = 2; s[18][c] = 2 }
  // Bench legs (dark brown)
  for (let r = 10; r <= 21; r++) {
    s[r][4] = 1; s[r][5] = 1; s[r][26] = 1; s[r][27] = 1
  }
  // Backrest — rows 8-9
  for (let c = 4; c <= 27; c++) { s[8][c] = 2; s[9][c] = 2 }
  // Highlight on seat
  for (let c = 8; c <= 23; c++) { s[15][c] = 4 }
  return s
})()

// Fountain is split into FOUNTAIN_L / FOUNTAIN_R (defined below POND)

// 32x32 tree — leafy canopy with brown trunk on grass
export const TREE: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(13)) // grass base
  // Trunk (rows 20-29, cols 14-17)
  for (let r = 18; r <= 29; r++) {
    s[r][14] = 2; s[r][15] = 3; s[r][16] = 3; s[r][17] = 2
  }
  // Trunk highlight
  for (let r = 20; r <= 27; r++) { s[r][15] = 4 }
  // Canopy — large circle (rows 2-20, cols 4-27)
  for (let r = 2; r <= 20; r++) {
    for (let c = 4; c <= 27; c++) {
      const cx = 15.5, cy = 11
      const dx = c - cx, dy = r - cy
      if (dx * dx + dy * dy < 81) s[r][c] = 13 // green
    }
  }
  // Darker canopy shading (bottom/right)
  for (let r = 12; r <= 19; r++) {
    for (let c = 8; c <= 24; c++) {
      const cx = 15.5, cy = 11
      const dx = c - cx, dy = r - cy
      if (dx * dx + dy * dy < 72 && (r > 14 || c > 18)) {
        if (s[r][c] === 13) s[r][c] = 28
      }
    }
  }
  // Light green highlights (top-left)
  for (let r = 3; r <= 10; r++) {
    for (let c = 6; c <= 16; c++) {
      const cx = 15.5, cy = 11
      const dx = c - cx, dy = r - cy
      if (dx * dx + dy * dy < 55 && (r + c) % 3 === 0) {
        if (s[r][c] === 13) s[r][c] = 14
      }
    }
  }
  // Canopy outline
  for (let r = 2; r <= 20; r++) {
    for (let c = 4; c <= 27; c++) {
      const cx = 15.5, cy = 11
      const dx = c - cx, dy = r - cy
      const dist = dx * dx + dy * dy
      if (dist >= 75 && dist < 85 && s[r][c] === 13) s[r][c] = 28
    }
  }
  return s
})()

// 32x32 garden lantern post — warm glowing lamp on a post
export const LANTERN: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(13)) // grass base
  // Post (rows 12-29, cols 15-16)
  for (let r = 12; r <= 29; r++) { s[r][15] = 10; s[r][16] = 10 }
  // Post highlight
  for (let r = 14; r <= 27; r++) { s[r][16] = 11 }
  // Lantern head (rows 6-12, cols 12-19)
  for (let r = 7; r <= 11; r++) {
    for (let c = 12; c <= 19; c++) {
      s[r][c] = 17 // gold glow
    }
  }
  // Lantern center bright
  for (let r = 8; r <= 10; r++) {
    for (let c = 13; c <= 18; c++) {
      s[r][c] = 26 // warm white
    }
  }
  s[9][15] = 8; s[9][16] = 8 // bright center
  // Lantern cap and base
  for (let c = 11; c <= 20; c++) { s[6][c] = 10 }
  for (let c = 11; c <= 20; c++) { s[12][c] = 10 }
  // Cap top
  for (let c = 13; c <= 18; c++) { s[5][c] = 10 }
  s[4][15] = 10; s[4][16] = 10
  // Warm glow halo (subtle)
  const glow: [number,number][] = [
    [6,11],[6,20],[7,11],[7,20],[11,11],[11,20],
    [8,11],[8,20],[9,11],[9,20],[10,11],[10,20],
  ]
  for (const [r,c] of glow) { s[r][c] = 16 } // light orange glow edge
  // Base plate
  for (let c = 13; c <= 18; c++) { s[29][c] = 11 }
  return s
})()

// Pond autotile — generates variants based on which neighbors are also pond.
// Edges: top/right/bottom/left — true means neighbor IS pond (no grass border).
// Seeded pseudo-random for deterministic wobble per pixel position
function pondNoise(x: number, y: number): number {
  let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  n = n - Math.floor(n)
  return n
}

function buildPondSprite(top: boolean, right: boolean, bottom: boolean, left: boolean): Sprite {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(13)) // start as grass

  // For each pixel, compute distance to nearest exposed edge.
  // If far enough from all exposed edges → water; near edge → shoreline transition.
  // Connected edges (neighbor is pond) → treat as if edge is infinitely far away.
  const SHORE = 4.5  // grass-to-water transition width
  const WOBBLE = 2.0 // shoreline irregularity amplitude

  for (let r = 0; r < 32; r++) {
    for (let c = 0; c < 32; c++) {
      // Distance to each edge (0 = at edge, 31 = far side)
      // For connected edges, set distance to large value (no shore)
      const dTop = top ? 99 : r
      const dBottom = bottom ? 99 : (31 - r)
      const dLeft = left ? 99 : c
      const dRight = right ? 99 : (31 - c)

      // Minimum distance to any exposed edge
      let dist = Math.min(dTop, dBottom, dLeft, dRight)

      // Add wobble based on position (deterministic noise)
      const wobble = (pondNoise(r, c) - 0.5) * WOBBLE * 2
      dist += wobble

      // Round corners where two exposed edges meet
      if (!top && !left) {
        const cornerDist = Math.sqrt(r * r + c * c)
        dist = Math.min(dist, cornerDist + wobble * 0.5)
      }
      if (!top && !right) {
        const cornerDist = Math.sqrt(r * r + (31 - c) * (31 - c))
        dist = Math.min(dist, cornerDist + wobble * 0.5)
      }
      if (!bottom && !left) {
        const cornerDist = Math.sqrt((31 - r) * (31 - r) + c * c)
        dist = Math.min(dist, cornerDist + wobble * 0.5)
      }
      if (!bottom && !right) {
        const cornerDist = Math.sqrt((31 - r) * (31 - r) + (31 - c) * (31 - c))
        dist = Math.min(dist, cornerDist + wobble * 0.5)
      }

      if (dist > SHORE) {
        s[r][c] = 18 // deep water
      } else if (dist > SHORE - 1.5) {
        s[r][c] = 19 // light blue (shallow/transition)
      } else if (dist > SHORE - 3) {
        // Muddy/dark shore transition — mix of dark green and grass
        s[r][c] = pondNoise(r * 3, c * 7) > 0.5 ? 28 : 13
      } else {
        s[r][c] = 13 // grass
        // Occasional dark grass blade near shore
        if (dist > 1 && pondNoise(r * 5, c * 3) > 0.8) s[r][c] = 28
      }
    }
  }

  // Light blue ripples in water areas
  const ripples: [number,number][] = [
    [8,8],[8,20],[12,14],[16,6],[16,24],[20,10],[20,18],[24,14],
  ]
  for (const [r,c] of ripples) {
    if (s[r][c] === 18) { s[r][c] = 19; if (c+1 < 32 && s[r][c+1] === 18) s[r][c+1] = 19 }
  }

  // White light reflections
  if (s[6][16] === 18) s[6][16] = 8
  if (s[15][22] === 18) s[15][22] = 8
  if (s[24][8] === 18) s[24][8] = 8

  return s
}

// Pre-build all 16 pond variants keyed by "T|R|B|L" (1=connected, 0=edge)
export const POND_VARIANTS: Record<string, Sprite> = {}
for (let mask = 0; mask < 16; mask++) {
  const t = !!(mask & 8), r = !!(mask & 4), b = !!(mask & 2), l = !!(mask & 1)
  POND_VARIANTS[`${+t}${+r}${+b}${+l}`] = buildPondSprite(t, r, b, l)
}

// Add lily pads to a few select variants (ones that have enough water space)
// Lily pad on tiles that have open water in center-left area
;(() => {
  for (const sprite of Object.values(POND_VARIANTS)) {
    // Lily pad 1 — only if that area is water
    if (sprite[11][10] === 18) {
      for (let r = 10; r <= 13; r++) {
        for (let c = 8; c <= 12; c++) {
          const dx = c - 10, dy = r - 11.5
          if (dx * dx + dy * dy < 5 && sprite[r][c] === 18) sprite[r][c] = 14
        }
      }
      sprite[11][10] = 13
      sprite[10][10] = 15; sprite[10][11] = 15
    }
    // Lily pad 2
    if (sprite[20][20] === 18) {
      for (let r = 19; r <= 22; r++) {
        for (let c = 18; c <= 22; c++) {
          const dx = c - 20, dy = r - 20.5
          if (dx * dx + dy * dy < 5 && sprite[r][c] === 18) sprite[r][c] = 14
        }
      }
      sprite[20][20] = 13
    }
  }
})()

// Default single-tile pond (all edges exposed) for SPRITE_MAP fallback
export const POND: Sprite = POND_VARIANTS['0000']

// 32x32 chess table — round table with a chessboard on top
export const CHESS_TABLE: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0)) // transparent
  // Table legs (dark brown)
  for (let r = 22; r <= 31; r++) {
    s[r][10] = 1; s[r][11] = 1
    s[r][20] = 1; s[r][21] = 1
  }
  // Table surface (ellipse, rows 8-22)
  for (let r = 8; r <= 22; r++) {
    for (let c = 4; c <= 27; c++) {
      const cx = 15.5, cy = 15
      const dx = (c - cx) / 12, dy = (r - cy) / 7
      if (dx * dx + dy * dy <= 1) s[r][c] = 3 // light brown
    }
  }
  // Table edge shadow
  for (let c = 6; c <= 25; c++) {
    if (s[21][c] === 3) s[21][c] = 2
    if (s[22][c] === 3) s[22][c] = 2
  }
  // Chessboard (6x6 squares, centered on table, rows 10-19, cols 9-22)
  // Each chess square is ~2px
  for (let br = 0; br < 6; br++) {
    for (let bc = 0; bc < 6; bc++) {
      const isLight = (br + bc) % 2 === 0
      const color = isLight ? 7 : 2 // off-white vs medium brown
      const pr = 11 + br * 2
      const pc = 10 + bc * 2
      s[pr][pc] = color; s[pr][pc + 1] = color
      s[pr + 1][pc] = color; s[pr + 1][pc + 1] = color
    }
  }
  // Board border
  for (let c = 9; c <= 22; c++) { s[10][c] = 1; s[23][c] = 1 }
  for (let r = 10; r <= 23; r++) { s[r][9] = 1; s[r][22] = 1 }
  // A few chess pieces (tiny dots) — white and dark
  // White pieces (bottom rows of board)
  s[21][11] = 8; s[21][15] = 8; s[21][19] = 8
  s[19][12] = 8; s[19][18] = 8
  // Black pieces (top rows of board)
  s[12][11] = 9; s[12][15] = 9; s[12][19] = 9
  s[14][13] = 9; s[14][17] = 9
  return s
})()

// Build a 64x32 fountain, then slice into left (cols 0-31) and right (cols 32-63)
const fullFountain = (() => {
  const wide: number[][] = Array.from({length: 32}, () => Array(64).fill(13))
  // Stone base ellipse centered at (31.5, 20)
  for (let r = 10; r <= 29; r++) {
    for (let c = 4; c <= 59; c++) {
      const cx = 31.5, cy = 20
      const dx = (c - cx) * 0.55, dy = (r - cy) * 1.1
      if (dx * dx + dy * dy < 64) wide[r][c] = 12
    }
  }
  // Inner water
  for (let r = 12; r <= 27; r++) {
    for (let c = 8; c <= 55; c++) {
      const cx = 31.5, cy = 20
      const dx = (c - cx) * 0.55, dy = (r - cy) * 1.1
      if (dx * dx + dy * dy < 45) wide[r][c] = 18
    }
  }
  // Ripples
  const ripples: [number,number][] = [
    [16,16],[16,48],[19,12],[19,32],[19,52],[22,20],[22,44],[25,28],[25,36],
  ]
  for (const [r,c] of ripples) { if (wide[r]?.[c] === 18) { wide[r][c] = 19; if (wide[r][c+1] === 18) wide[r][c+1] = 19 } }
  // Center pedestal
  for (let r = 14; r <= 24; r++) { wide[r][30] = 11; wide[r][31] = 12; wide[r][32] = 12; wide[r][33] = 11 }
  for (let c = 28; c <= 35; c++) { wide[13][c] = 11 }
  // Spray
  wide[5][31] = 19; wide[5][32] = 19
  wide[6][30] = 8; wide[6][31] = 19; wide[6][32] = 19; wide[6][33] = 8
  wide[7][29] = 19; wide[7][31] = 8; wide[7][32] = 8; wide[7][34] = 19
  wide[8][30] = 19; wide[8][31] = 19; wide[8][32] = 19; wide[8][33] = 19
  wide[9][31] = 19; wide[9][32] = 19
  // Shadow on rim bottom
  for (let c = 8; c <= 55; c++) { if (wide[28][c] === 12) wide[28][c] = 11 }
  return wide
})()

export const FOUNTAIN_L: Sprite = fullFountain.map(row => row.slice(0, 32))
export const FOUNTAIN_R: Sprite = fullFountain.map(row => row.slice(32, 64))
export const FOUNTAIN: Sprite = FOUNTAIN_L // alias for SPRITE_MAP

// Herringbone parquet floor — warm brown V/zigzag pattern
export const FLOOR_HERRINGBONE: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(3))
  for (let r = 0; r < 32; r++) {
    for (let c = 0; c < 32; c++) {
      const block = Math.floor(c / 4)
      const phase = (block + Math.floor(r / 4)) % 2
      if (phase === 0) {
        // Diagonal going down-right
        if ((r + c) % 4 === 0) s[r][c] = 2
        else if ((r + c) % 4 === 2) s[r][c] = 4
      } else {
        // Diagonal going down-left
        if ((r - c + 32) % 4 === 0) s[r][c] = 2
        else if ((r - c + 32) % 4 === 2) s[r][c] = 4
      }
      // Plank boundary lines
      if (c % 4 === 0) s[r][c] = 1
      if (r % 8 === 0 && c % 4 < 2) s[r][c] = 2
    }
  }
  // Subtle grain accents
  s[3][7] = 4; s[7][19] = 4; s[11][3] = 4; s[15][25] = 4
  s[19][11] = 4; s[23][15] = 4; s[27][7] = 4; s[5][27] = 4
  return s
})()

// Checkered marble floor — alternating cream and light gray 8x8 squares
export const FLOOR_MARBLE: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(6))
  for (let r = 0; r < 32; r++) {
    for (let c = 0; c < 32; c++) {
      const tileR = Math.floor(r / 8) % 2
      const tileC = Math.floor(c / 8) % 2
      if ((tileR + tileC) % 2 === 0) {
        s[r][c] = 6  // cream
      } else {
        s[r][c] = 12 // light gray
      }
    }
  }
  // Veining in gray squares (off-white 7)
  s[1][9] = 7; s[2][10] = 7; s[3][11] = 7
  s[9][1] = 7; s[10][2] = 7; s[11][3] = 7
  s[17][25] = 7; s[18][26] = 7; s[19][27] = 7
  s[25][17] = 7; s[26][18] = 7; s[27][19] = 7
  s[5][26] = 7; s[6][27] = 7
  s[21][10] = 7; s[22][11] = 7
  // Veining in cream squares (light tan 5)
  s[1][1] = 5; s[2][2] = 5; s[3][3] = 5
  s[9][17] = 5; s[10][18] = 5; s[11][19] = 5
  s[17][1] = 5; s[18][2] = 5; s[19][3] = 5
  s[25][9] = 5; s[26][10] = 5; s[27][11] = 5
  s[5][20] = 5; s[6][21] = 5
  s[13][5] = 5; s[14][6] = 5
  return s
})()

// All available floor styles
export const FLOOR_STYLES = { FLOOR_WOOD, FLOOR_TILE, FLOOR_HERRINGBONE, FLOOR_MARBLE } as const
export type FloorStyleKey = keyof typeof FLOOR_STYLES

// Flowering plant — pink/coral blooms among leaves, terracotta pot
export const PLANT_T1: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Stem
  for (let r = 10; r < 17; r++) { s[r][15] = 28; s[r][16] = 13 }
  // Leaf cluster helper
  function leaf(cr: number, cc: number, size: number, light: number, dark: number) {
    for (let r = 0; r < 32; r++) for (let c = 0; c < 32; c++) {
      const dx = c - cc, dy = r - cr
      const dist = Math.sqrt(dx * dx + dy * dy * 1.5)
      if (dist < size) {
        if (s[r][c] === 0 || s[r][c] === 13 || s[r][c] === 28) {
          s[r][c] = dist < size * 0.5 ? light : dark
        }
      }
    }
  }
  // Main leaf clusters (same as PLANT)
  leaf(6, 16, 7, 14, 13)
  leaf(8, 10, 5, 14, 13)
  leaf(8, 22, 5, 14, 13)
  leaf(4, 13, 4, 27, 14)
  leaf(4, 20, 4, 27, 14)
  leaf(2, 16, 3, 14, 28)
  // Leaf vein highlights
  s[5][15] = 27; s[5][17] = 27; s[7][11] = 27; s[7][21] = 27
  // Pink flowers (3-pixel: pink center 41, white petals 8)
  // Flower 1 — upper left cluster
  s[4][12] = 8; s[3][13] = 8; s[5][13] = 8; s[4][14] = 8; s[4][13] = 41
  // Flower 2 — right cluster
  s[7][22] = 8; s[6][23] = 8; s[8][23] = 8; s[7][24] = 8; s[7][23] = 41
  // Flower 3 — center top
  s[2][17] = 8; s[1][18] = 8; s[3][18] = 8; s[2][19] = 8; s[2][18] = 41
  // Coral accent dots
  s[6][10] = 15; s[5][20] = 15; s[9][12] = 15; s[3][15] = 15
  // Pot rim
  for (let c = 10; c < 22; c++) { s[16][c] = 15; s[17][c] = 15 }
  for (let c = 9; c < 23; c++) s[15][c] = 15
  // Pot body (terracotta with shading)
  for (let r = 18; r < 24; r++) {
    const inset = Math.floor((r - 18) * 0.4)
    for (let c = 10 + inset; c < 22 - inset; c++) s[r][c] = 15
  }
  // Pot inner shadow
  for (let r = 18; r < 23; r++) {
    const inset = Math.floor((r - 18) * 0.4)
    for (let c = 11 + inset; c < 21 - inset; c++) s[r][c] = 4
  }
  // Pot highlight
  for (let r = 18; r < 23; r++) { const i = Math.floor((r-18)*0.4); s[r][10+i] = 16 }
  // Soil
  for (let c = 12; c < 20; c++) { s[14][c] = 2; s[15][c] = 15 }
  return s
})()

// Ornamental tree — larger canopy, fancier striped pot with saucer
export const PLANT_T2: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Thicker trunk (3px wide)
  for (let r = 14; r < 20; r++) { s[r][15] = 1; s[r][16] = 2; s[r][17] = 1 }
  // Large canopy filling rows 1-14 with mixed greens
  function canopy(cr: number, cc: number, size: number, col: number) {
    for (let r = 0; r < 32; r++) for (let c = 0; c < 32; c++) {
      const dx = c - cc, dy = r - cr
      const dist = Math.sqrt(dx * dx + dy * dy * 1.3)
      if (dist < size && r < 16) {
        if (s[r][c] === 0) s[r][c] = col
      }
    }
  }
  canopy(7, 16, 9, 13)   // main center (green)
  canopy(5, 11, 6, 14)   // left (light green)
  canopy(5, 21, 6, 14)   // right (light green)
  canopy(3, 16, 5, 27)   // top (mint)
  canopy(9, 8, 5, 28)    // lower left (dark green)
  canopy(9, 24, 5, 28)   // lower right (dark green)
  canopy(2, 13, 3, 13)   // tip left
  canopy(2, 19, 3, 13)   // tip right
  canopy(1, 16, 3, 14)   // very top
  // Leaf highlights
  s[3][14] = 27; s[3][18] = 27; s[6][10] = 27; s[6][22] = 27
  s[5][16] = 27; s[8][14] = 27; s[8][18] = 27
  // Decorative pot with stripe pattern (15 and 16 alternating)
  for (let c = 10; c < 22; c++) s[19][c] = 1  // rim top
  for (let c = 11; c < 21; c++) s[20][c] = 1  // rim
  for (let r = 21; r < 27; r++) {
    const inset = Math.floor((r - 21) * 0.3)
    for (let c = 11 + inset; c < 21 - inset; c++) {
      s[r][c] = (r % 2 === 0) ? 15 : 16  // stripe pattern
    }
  }
  // Pot highlight left edge
  for (let r = 21; r < 27; r++) {
    const inset = Math.floor((r - 21) * 0.3)
    s[r][11 + inset] = 16
  }
  // Saucer underneath
  for (let c = 9; c < 23; c++) s[27][c] = 4
  for (let c = 10; c < 22; c++) s[28][c] = 5
  for (let c = 11; c < 21; c++) s[29][c] = 4
  return s
})()

// Art Deco lamp — geometric step shade, warmer glow
export const LAMP_T1: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Chain/cord
  for (let r = 0; r < 6; r++) { s[r][15] = 10; s[r][16] = 9 }
  s[1][15] = 11; s[3][15] = 11; s[5][15] = 11
  // Art Deco shade — geometric stepped shape (wider in discrete steps)
  const steps = [
    { r0: 6,  r1: 8,  hw: 4 },
    { r0: 8,  r1: 10, hw: 6 },
    { r0: 10, r1: 12, hw: 9 },
    { r0: 12, r1: 14, hw: 12 },
  ]
  for (const step of steps) {
    for (let r = step.r0; r < step.r1; r++) {
      for (let c = 16 - step.hw; c < 16 + step.hw; c++) {
        if (c === 16 - step.hw || c === 16 + step.hw - 1) s[r][c] = 1  // dark edge
        else if (c === 16 - step.hw + 1 || c === 16 + step.hw - 2) s[r][c] = 17  // gold edge
        else s[r][c] = 16  // warm orange fill
      }
    }
    // Step edge highlights (horizontal lines at transitions)
    for (let c = 16 - step.hw; c < 16 + step.hw; c++) s[step.r0][c] = 17
  }
  // Gold geometric detail lines inside shade
  for (let c = 16 - 4; c < 16 + 4; c++) s[7][c] = 17
  for (let c = 16 - 6; c < 16 + 6; c++) s[9][c] = 17
  for (let c = 16 - 9; c < 16 + 9; c++) s[11][c] = 17
  // Bottom rim
  for (let c = 4; c < 28; c++) s[14][c] = 1
  for (let c = 5; c < 27; c++) s[15][c] = 2
  // Bulb
  s[14][15] = 17; s[14][16] = 17
  s[15][15] = 26; s[15][16] = 26
  // Warmer, wider glow cone
  for (let r = 16; r < 26; r++) {
    const spread = Math.floor((r - 16) * 1.0)
    for (let c = 12 - spread; c < 20 + spread; c++) {
      if (c >= 0 && c < 32) s[r][c] = 26
    }
  }
  // Outer glow fringe
  for (let r = 18; r < 24; r++) {
    const spread = Math.floor((r - 16) * 1.0)
    if (12 - spread - 1 >= 0) s[r][12 - spread - 1] = 16
    if (20 + spread < 32) s[r][20 + spread] = 16
  }
  return s
})()

// Crystal chandelier — three arms, gold frame, crystal drops
export const LAMP_T2: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Center chain
  for (let r = 0; r < 5; r++) { s[r][15] = 17; s[r][16] = 17 }
  s[1][15] = 16; s[3][15] = 16
  // Gold frame - horizontal bar
  for (let c = 5; c < 27; c++) { s[5][c] = 17 }
  for (let c = 6; c < 26; c++) { s[6][c] = 16 }
  // Three hanging arms
  // Center arm
  for (let r = 6; r < 10; r++) { s[r][15] = 17; s[r][16] = 17 }
  s[10][14] = 17; s[10][15] = 26; s[10][16] = 26; s[10][17] = 17  // center bulb
  s[11][15] = 26; s[11][16] = 26
  // Left arm - diagonal from bar down-left
  for (let r = 6; r < 10; r++) { s[r][8] = 17; s[r][9] = 17 }
  s[7][7] = 17; s[8][7] = 17  // arm curve
  s[10][7] = 17; s[10][8] = 26; s[10][9] = 26; s[10][10] = 17  // left bulb
  s[11][8] = 26; s[11][9] = 26
  // Right arm
  for (let r = 6; r < 10; r++) { s[r][22] = 17; s[r][23] = 17 }
  s[7][24] = 17; s[8][24] = 17
  s[10][21] = 17; s[10][22] = 26; s[10][23] = 26; s[10][24] = 17  // right bulb
  s[11][22] = 26; s[11][23] = 26
  // Crystal drops — white (8) and light blue (19) scattered below arms
  // Below center
  s[12][14] = 19; s[12][17] = 8; s[13][15] = 8; s[13][16] = 19
  s[14][14] = 8; s[14][15] = 19; s[14][16] = 8; s[14][17] = 19
  s[15][15] = 8; s[15][16] = 8
  // Below left
  s[12][7] = 19; s[12][10] = 8; s[13][8] = 8; s[13][9] = 19
  s[14][7] = 8; s[14][8] = 19; s[14][9] = 8; s[14][10] = 19
  s[15][8] = 8; s[15][9] = 8
  // Below right
  s[12][21] = 19; s[12][24] = 8; s[13][22] = 8; s[13][23] = 19
  s[14][21] = 8; s[14][22] = 19; s[14][23] = 8; s[14][24] = 19
  s[15][22] = 8; s[15][23] = 8
  // Wide warm glow
  for (let r = 16; r < 26; r++) {
    const spread = Math.floor((r - 16) * 1.2)
    for (let c = 8 - spread; c < 24 + spread; c++) {
      if (c >= 0 && c < 32) s[r][c] = 26
    }
  }
  return s
})()

// Cushioned bistro chair — wood frame with red cushion
export const CHAIR_T1: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Backrest curve at top (dark brown)
  for (let c = 9; c < 23; c++) s[3][c] = 1
  for (let c = 8; c < 24; c++) s[4][c] = 1
  // Wood frame (same shape as CHAIR)
  for (let c = 8; c < 24; c++) { s[5][c] = 2; s[6][c] = 2 }
  for (let c = 8; c < 24; c++) { s[7][c] = 2 }
  for (let r = 7; r < 21; r++) { s[r][8] = 2; s[r][23] = 2 }  // side rails
  for (let c = 8; c < 24; c++) { s[20][c] = 2; s[21][c] = 2 }  // bottom rail
  // Red cushion on seat area (inner rectangle)
  for (let r = 8; r < 20; r++) for (let c = 9; c < 23; c++) s[r][c] = 20
  // Cushion shading — darker edges
  for (let r = 8; r < 20; r++) { s[r][9] = 33; s[r][22] = 33 }
  for (let c = 9; c < 23; c++) { s[8][c] = 33; s[19][c] = 33 }
  // Cushion highlight center
  for (let r = 11; r < 17; r++) for (let c = 13; c < 19; c++) s[r][c] = 15
  // Inner highlight
  for (let r = 12; r < 16; r++) for (let c = 14; c < 18; c++) s[r][c] = 20
  // Chair legs
  s[22][10] = 1; s[22][11] = 1; s[23][10] = 1; s[23][11] = 1
  s[24][10] = 1; s[24][11] = 1; s[25][10] = 1; s[25][11] = 1
  s[22][20] = 1; s[22][21] = 1; s[23][20] = 1; s[23][21] = 1
  s[24][20] = 1; s[24][21] = 1; s[25][20] = 1; s[25][21] = 1
  return s
})()

// Velvet armchair — purple upholstery, armrests, rounded back
export const CHAIR_T2: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Rounded back (top arc)
  for (let c = 8; c < 24; c++) s[2][c] = 35
  for (let c = 7; c < 25; c++) s[3][c] = 21
  for (let c = 7; c < 25; c++) s[4][c] = 21
  for (let c = 8; c < 24; c++) s[5][c] = 21
  // Back shading
  for (let c = 9; c < 23; c++) s[3][c] = 21
  s[3][8] = 35; s[3][24] = 35; s[4][7] = 35; s[4][24] = 35
  // Armrests (wider seat extending left/right)
  for (let r = 6; r < 18; r++) {
    s[r][5] = 35; s[r][6] = 21; s[r][7] = 21  // left armrest
    s[r][24] = 21; s[r][25] = 21; s[r][26] = 35  // right armrest
  }
  // Seat body (purple)
  for (let r = 6; r < 18; r++) for (let c = 8; c < 24; c++) s[r][c] = 21
  // Shadow edges on seat
  for (let r = 6; r < 18; r++) { s[r][8] = 35; s[r][23] = 35 }
  for (let c = 8; c < 24; c++) { s[6][c] = 35; s[17][c] = 35 }
  // Cushion highlight (lighter center)
  for (let r = 9; r < 15; r++) for (let c = 12; c < 20; c++) s[r][c] = 41
  for (let r = 10; r < 14; r++) for (let c = 13; c < 19; c++) s[r][c] = 21
  // Short dark brown legs
  s[18][8] = 1; s[19][8] = 1; s[20][8] = 1
  s[18][9] = 1; s[19][9] = 1; s[20][9] = 1
  s[18][22] = 1; s[19][22] = 1; s[20][22] = 1
  s[18][23] = 1; s[19][23] = 1; s[20][23] = 1
  return s
})()

// Marble bistro table — white/off-white surface with gray veining
export const TABLE_T1: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Same round shape as TABLE but marble surface
  // Outer border (dark metal)
  for (let r = 3; r < 26; r++) {
    for (let c = 5; c < 27; c++) {
      const dx = c - 16, dy = (r - 14) * 1.2
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 12) {
        s[r][c] = 8  // white marble
        if (dist > 10.5) s[r][c] = 9  // dark metal edge
        else if (dist > 9.5) s[r][c] = 7  // off-white border
      }
    }
  }
  // Gray veining lines on marble
  // Diagonal vein 1
  for (let i = 0; i < 8; i++) { const r = 6+i, c = 9+i; if (s[r][c] === 8) s[r][c] = 12 }
  for (let i = 0; i < 6; i++) { const r = 7+i, c = 9+i; if (s[r][c] === 8) s[r][c] = 12 }
  // Diagonal vein 2
  for (let i = 0; i < 6; i++) { const r = 12+i, c = 18+i; if (s[r][c] === 8 || s[r][c] === 7) s[r][c] = 12 }
  // Small vein 3
  for (let i = 0; i < 4; i++) { const r = 8+i, c = 17-i; if (s[r][c] === 8) s[r][c] = 12 }
  // Thin metal legs (near-black 9)
  s[22][11] = 9; s[23][11] = 9; s[24][11] = 9; s[25][11] = 9
  s[22][20] = 9; s[23][20] = 9; s[24][20] = 9; s[25][20] = 9
  return s
})()

// Ornate Parisian table — mosaic top, scrollwork legs
export const TABLE_T2: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Round table with mosaic pattern
  for (let r = 3; r < 22; r++) {
    for (let c = 5; c < 27; c++) {
      const dx = c - 16, dy = (r - 12) * 1.3
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 11) {
        // Mosaic: alternating 2x2 squares of blue, gold, cream, white
        const tileR = Math.floor(r / 2) % 2
        const tileC = Math.floor(c / 2) % 2
        const pattern = tileR * 2 + tileC
        const colors = [18, 17, 6, 8] // blue, gold, cream, white
        s[r][c] = colors[pattern]
        // Dark metal border
        if (dist > 9.5) s[r][c] = 9
        else if (dist > 8.5) s[r][c] = 10
      }
    }
  }
  // Ornate scrollwork legs that curve outward (dark 9, 10)
  // Left leg — curves outward to the left
  s[20][10] = 9; s[20][11] = 9
  s[21][9] = 10; s[21][10] = 9
  s[22][8] = 10; s[22][9] = 9
  s[23][7] = 10; s[23][8] = 9
  s[24][7] = 9; s[24][8] = 10
  s[25][8] = 9; s[25][9] = 9  // foot curl back
  // Right leg — curves outward to the right
  s[20][20] = 9; s[20][21] = 9
  s[21][21] = 9; s[21][22] = 10
  s[22][22] = 9; s[22][23] = 10
  s[23][23] = 9; s[23][24] = 10
  s[24][23] = 10; s[24][24] = 9
  s[25][22] = 9; s[25][23] = 9  // foot curl back
  // Center support
  s[20][15] = 9; s[20][16] = 9
  s[21][15] = 10; s[21][16] = 10
  s[22][15] = 9; s[22][16] = 9
  return s
})()

// Artisan shelf — more varied items (grinder, book, plants)
export const SHELF_T1: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Shelf planks (with depth)
  for (let c = 0; c < 32; c++) { s[10][c] = 1; s[11][c] = 3 }
  for (let c = 0; c < 32; c++) { s[22][c] = 1; s[23][c] = 3 }
  // Back wall tint
  for (let r = 0; r < 10; r++) for (let c = 0; c < 32; c++) s[r][c] = 2
  for (let r = 12; r < 22; r++) for (let c = 0; c < 32; c++) s[r][c] = 2

  // Top shelf items (rows 3-9)
  // Coffee grinder (brown, cols 3-7)
  for (let r = 5; r < 10; r++) for (let c = 3; c < 7; c++) s[r][c] = 3
  for (let c = 3; c < 7; c++) s[5][c] = 1  // top
  s[4][4] = 1; s[4][5] = 1  // handle
  s[3][5] = 1; s[3][6] = 1  // crank arm
  s[3][7] = 10  // crank knob
  for (let r = 6; r < 9; r++) for (let c = 4; c < 6; c++) s[r][c] = 4  // body highlight

  // Small book (blue, cols 9-11)
  for (let r = 6; r < 10; r++) for (let c = 9; c < 12; c++) s[r][c] = 18
  for (let r = 6; r < 10; r++) s[r][9] = 32  // spine (dark blue)
  s[7][10] = 8; s[8][10] = 8  // page edges

  // Jar (green, cols 14-17)
  for (let r = 4; r < 10; r++) for (let c = 14; c < 17; c++) s[r][c] = 13
  for (let c = 14; c < 17; c++) s[4][c] = 28  // dark green lid
  for (let r = 5; r < 9; r++) s[r][14] = 8  // highlight
  s[7][15] = 7  // label

  // Tall vase (coral, cols 20-22)
  for (let r = 3; r < 10; r++) for (let c = 20; c < 23; c++) s[r][c] = 15
  for (let c = 20; c < 23; c++) s[3][c] = 1  // rim
  s[4][21] = 16  // inner highlight
  for (let r = 4; r < 9; r++) s[r][20] = 16  // left highlight

  // Small cup (gold, cols 26-28)
  for (let r = 7; r < 10; r++) for (let c = 26; c < 29; c++) s[r][c] = 17
  for (let c = 26; c < 29; c++) s[7][c] = 16
  s[8][29] = 17  // handle

  // Bottom shelf items (rows 13-21)
  // Tall bottle (red, cols 3-5)
  for (let r = 13; r < 22; r++) for (let c = 3; c < 6; c++) s[r][c] = 20
  for (let c = 3; c < 6; c++) s[13][c] = 9  // cap
  s[14][3] = 33; s[14][4] = 20; s[14][5] = 33  // neck
  for (let r = 16; r < 20; r++) s[r][3] = 8  // highlight
  s[18][4] = 7  // label

  // Bowl (gold, cols 8-13)
  for (let r = 18; r < 22; r++) for (let c = 8; c < 14; c++) s[r][c] = 17
  for (let c = 8; c < 14; c++) s[18][c] = 16  // rim
  for (let c = 9; c < 13; c++) s[19][c] = 44  // inner shadow
  s[20][10] = 16; s[20][11] = 16  // highlight

  // Small potted plant (cols 16-20)
  // Pot (brown)
  for (let r = 19; r < 22; r++) for (let c = 17; c < 21; c++) s[r][c] = 3
  for (let c = 17; c < 21; c++) s[19][c] = 1  // rim
  // Leaves
  s[16][18] = 13; s[16][19] = 14; s[17][17] = 14; s[17][18] = 13
  s[17][19] = 13; s[17][20] = 14; s[18][18] = 28; s[18][19] = 28
  s[15][19] = 27  // leaf tip

  // Decorative tin (cols 24-28)
  for (let r = 16; r < 22; r++) for (let c = 24; c < 29; c++) s[r][c] = 15
  for (let c = 24; c < 29; c++) { s[16][c] = 1; s[21][c] = 1 }  // rims
  for (let r = 17; r < 21; r++) { s[r][24] = 16; s[r][28] = 4 }
  s[19][26] = 7  // label

  return s
})()

// Display cabinet — glass front panels, premium items
export const SHELF_T2: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Cabinet frame
  for (let c = 0; c < 32; c++) { s[0][c] = 1; s[31][c] = 1 }  // top/bottom frame
  for (let r = 0; r < 32; r++) { s[r][0] = 1; s[r][31] = 1 }  // side frame
  // Shelf planks
  for (let c = 1; c < 31; c++) { s[14][c] = 1; s[15][c] = 3 }
  // Back panels (dark wood)
  for (let r = 1; r < 14; r++) for (let c = 1; c < 31; c++) s[r][c] = 2
  for (let r = 16; r < 31; r++) for (let c = 1; c < 31; c++) s[r][c] = 2

  // Glass panes (light blue vertical lines on edges)
  for (let r = 1; r < 14; r++) { s[r][1] = 19; s[r][2] = 19; s[r][29] = 19; s[r][30] = 19 }
  for (let r = 16; r < 31; r++) { s[r][1] = 19; s[r][2] = 19; s[r][29] = 19; s[r][30] = 19 }
  // Glass highlight streaks
  for (let r = 3; r < 10; r++) s[r][2] = 8
  for (let r = 18; r < 26; r++) s[r][2] = 8

  // Top shelf items
  // Wine bottle (red/dark, cols 5-8)
  for (let r = 3; r < 14; r++) for (let c = 5; c < 8; c++) s[r][c] = 20
  for (let c = 5; c < 8; c++) s[3][c] = 9  // cap
  s[4][6] = 9  // neck narrow
  for (let r = 5; r < 13; r++) s[r][5] = 33  // dark shadow
  for (let r = 7; r < 11; r++) s[r][6] = 8  // label
  for (let r = 7; r < 11; r++) s[r][7] = 7  // label edge

  // Trophy (gold, cols 13-19)
  // Cup
  for (let r = 4; r < 9; r++) for (let c = 14; c < 19; c++) s[r][c] = 17
  for (let c = 14; c < 19; c++) s[4][c] = 16  // rim highlight
  for (let r = 5; r < 8; r++) for (let c = 15; c < 18; c++) s[r][c] = 44  // inner
  // Stem
  s[9][15] = 17; s[9][16] = 17; s[9][17] = 17
  s[10][16] = 17
  // Base
  for (let c = 14; c < 19; c++) { s[11][c] = 17; s[12][c] = 16 }
  // Handles
  s[5][13] = 17; s[6][13] = 17; s[7][13] = 17
  s[5][19] = 17; s[6][19] = 17; s[7][19] = 17
  // Star on trophy
  s[6][16] = 8

  // Decorative vase (cols 23-27)
  for (let r = 5; r < 14; r++) for (let c = 23; c < 27; c++) s[r][c] = 21
  for (let c = 23; c < 27; c++) s[5][c] = 35  // rim
  for (let r = 6; r < 13; r++) s[r][23] = 35  // shadow
  for (let r = 7; r < 12; r++) s[r][26] = 41  // highlight
  s[9][24] = 8; s[9][25] = 8  // pattern

  // Bottom shelf items
  // Cake stand (white with coral accents, cols 4-12)
  // Stand base
  for (let c = 6; c < 11; c++) { s[28][c] = 8; s[29][c] = 12 }
  s[27][8] = 8  // stem
  // Plate
  for (let c = 4; c < 13; c++) s[26][c] = 8
  for (let c = 5; c < 12; c++) s[25][c] = 12
  // Cake
  for (let r = 21; r < 25; r++) for (let c = 5; c < 12; c++) s[r][c] = 15
  for (let c = 5; c < 12; c++) s[21][c] = 8  // frosting top
  for (let c = 6; c < 11; c++) s[22][c] = 29  // frosting drip
  s[21][8] = 20  // cherry on top

  // Decorative box (purple, cols 16-22)
  for (let r = 22; r < 30; r++) for (let c = 16; c < 23; c++) s[r][c] = 21
  for (let c = 16; c < 23; c++) { s[22][c] = 35; s[29][c] = 35 }  // top/bottom
  for (let r = 22; r < 30; r++) { s[r][16] = 35; s[r][22] = 35 }  // sides
  // Box pattern (gold clasp)
  s[25][19] = 17; s[26][18] = 17; s[26][19] = 17; s[26][20] = 17; s[27][19] = 17
  // Lid line
  for (let c = 17; c < 22; c++) s[24][c] = 17

  // Small statue (cols 26-28)
  for (let r = 25; r < 30; r++) s[r][27] = 12
  s[24][26] = 12; s[24][27] = 12; s[24][28] = 12  // head
  s[23][27] = 12  // top

  return s
})()

// Brass espresso machine — gold/warm tones replacing chrome
export const COFFEE_MACHINE_T1: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Main body (brass — gold 17 and light orange 16)
  for (let r = 2; r < 20; r++) for (let c = 7; c < 25; c++) s[r][c] = 17
  for (let r = 3; r < 19; r++) for (let c = 8; c < 24; c++) s[r][c] = 16
  // Highlight strip (left edge — warm)
  for (let r = 3; r < 19; r++) s[r][8] = 17
  // Top cap (dark brown)
  for (let c = 8; c < 24; c++) { s[1][c] = 1; s[2][c] = 1 }
  // Display screen (warm tint)
  for (let r = 4; r < 9; r++) for (let c = 10; c < 22; c++) s[r][c] = 1
  for (let r = 5; r < 8; r++) for (let c = 11; c < 21; c++) s[r][c] = 13
  for (let c = 12; c < 18; c++) s[6][c] = 14  // text line
  // Buttons (warmer colors — row 10)
  s[10][11] = 15; s[10][12] = 15  // coral button
  s[10][14] = 13; s[10][15] = 13  // green button
  s[10][17] = 4; s[10][18] = 4   // tan button
  s[10][20] = 1; s[10][21] = 1   // dark button
  // Pressure gauge (circular, brass)
  s[12][11] = 1; s[12][12] = 17; s[12][13] = 1
  s[13][11] = 17; s[13][12] = 8; s[13][13] = 17
  s[14][11] = 1; s[14][12] = 17; s[14][13] = 1
  // Gauge needle
  s[12][12] = 20
  // Group head / spout (dark brown)
  for (let r = 15; r < 19; r++) for (let c = 14; c < 18; c++) s[r][c] = 1
  for (let r = 16; r < 18; r++) for (let c = 15; c < 17; c++) s[r][c] = 9
  // Brass portafilter handle
  for (let c = 18; c < 22; c++) s[17][c] = 2
  s[16][18] = 1; s[16][19] = 1
  // Steam wand (brass)
  for (let r = 12; r < 19; r++) s[r][21] = 17
  for (let r = 12; r < 19; r++) s[r][22] = 16
  s[18][20] = 17; s[18][21] = 17
  // Steam
  s[19][21] = 8; s[20][20] = 8; s[20][22] = 8
  // Drip tray (dark)
  for (let r = 20; r < 22; r++) for (let c = 9; c < 23; c++) s[r][c] = 1
  for (let c = 10; c < 22; c++) s[21][c] = 9
  for (let c = 10; c < 22; c += 2) s[20][c] = 9
  return s
})()

// Vintage La Marzocca — copper body, eagle ornament, dual group heads
export const COFFEE_MACHINE_T2: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Main body (copper — coral 15 and light orange 16)
  for (let r = 3; r < 20; r++) for (let c = 5; c < 27; c++) s[r][c] = 15
  for (let r = 4; r < 19; r++) for (let c = 6; c < 26; c++) s[r][c] = 16
  // Copper highlight strip
  for (let r = 4; r < 19; r++) s[r][6] = 15
  for (let r = 4; r < 19; r++) s[r][7] = 29  // warm highlight
  // Top cap (dark)
  for (let c = 6; c < 26; c++) { s[2][c] = 1; s[3][c] = 1 }
  // Eagle/ornament on top (small 3px gold shape)
  s[0][15] = 17; s[0][16] = 17
  s[1][14] = 17; s[1][15] = 16; s[1][16] = 16; s[1][17] = 17
  s[2][15] = 17; s[2][16] = 17
  // Display screen
  for (let r = 5; r < 9; r++) for (let c = 9; c < 23; c++) s[r][c] = 1
  for (let r = 6; r < 8; r++) for (let c = 10; c < 22; c++) s[r][c] = 13
  for (let c = 11; c < 21; c++) s[7][c] = 14
  // Buttons row
  s[10][10] = 20; s[10][11] = 20
  s[10][13] = 13; s[10][14] = 13
  s[10][18] = 18; s[10][19] = 18
  s[10][21] = 17; s[10][22] = 17
  // Dual pressure gauges
  // Left gauge
  s[12][9] = 1; s[12][10] = 17; s[12][11] = 1
  s[13][9] = 17; s[13][10] = 8; s[13][11] = 17
  s[14][9] = 1; s[14][10] = 20; s[14][11] = 1  // needle
  // Right gauge
  s[12][20] = 1; s[12][21] = 17; s[12][22] = 1
  s[13][20] = 17; s[13][21] = 8; s[13][22] = 17
  s[14][20] = 1; s[14][21] = 20; s[14][22] = 1  // needle
  // Dual group heads (two spout areas)
  // Left group head
  for (let r = 15; r < 19; r++) for (let c = 9; c < 13; c++) s[r][c] = 1
  for (let r = 16; r < 18; r++) for (let c = 10; c < 12; c++) s[r][c] = 9
  // Right group head
  for (let r = 15; r < 19; r++) for (let c = 19; c < 23; c++) s[r][c] = 1
  for (let r = 16; r < 18; r++) for (let c = 20; c < 22; c++) s[r][c] = 9
  // Portafilter handles (copper)
  for (let c = 13; c < 16; c++) s[17][c] = 2
  for (let c = 23; c < 26; c++) s[17][c] = 2
  s[16][13] = 1; s[16][14] = 1
  s[16][23] = 1; s[16][24] = 1
  // Steam wand (right side, copper)
  for (let r = 12; r < 19; r++) s[r][24] = 15
  for (let r = 12; r < 19; r++) s[r][25] = 16
  s[18][24] = 15; s[18][25] = 15
  // Steam
  s[19][24] = 8; s[20][23] = 8; s[20][25] = 8
  // Richer drip tray (wider, with detail)
  for (let r = 20; r < 23; r++) for (let c = 7; c < 25; c++) s[r][c] = 1
  for (let c = 8; c < 24; c++) s[22][c] = 9  // grating
  for (let c = 8; c < 24; c += 2) s[21][c] = 9
  for (let c = 9; c < 24; c += 2) s[20][c] = 9
  return s
})()

// Polished wood counter — richer grain, darker browns
export const COUNTER_TOP_T1: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Top edge
  for (let c = 0; c < 32; c++) { s[0][c] = 1; s[1][c] = 1 }
  // Surface (medium brown 2 with light brown 3 grain)
  for (let c = 0; c < 32; c++) { s[2][c] = 22; s[3][c] = 22 }  // side rail
  for (let r = 4; r < 6; r++) for (let c = 0; c < 32; c++) s[r][c] = 2  // polished surface
  // Grain lines on surface
  for (let c = 2; c < 30; c += 5) { s[4][c] = 3; s[5][c] = 3 }
  for (let c = 4; c < 30; c += 7) { s[4][c] = 4; s[5][c] = 4 }  // tan highlights
  for (let c = 0; c < 32; c++) { s[6][c] = 22; s[7][c] = 22 }  // lower rail
  // Body
  for (let c = 0; c < 32; c++) { s[8][c] = 22; s[9][c] = 22 }  // divider
  // Panel fronts (1, 2 with 4 tan highlights)
  for (let r = 10; r < 22; r++) {
    for (let c = 0; c < 32; c++) {
      s[r][c] = 1
    }
  }
  // Panel insets
  for (let panel = 0; panel < 5; panel++) {
    const c0 = 1 + panel * 6
    const c1 = c0 + 5
    for (let r = 11; r < 21; r++) {
      for (let c = c0; c < c1 && c < 31; c++) {
        s[r][c] = 2
      }
    }
    // Inner highlight
    for (let r = 12; r < 20; r++) {
      for (let c = c0 + 1; c < c1 - 1 && c < 30; c++) {
        s[r][c] = 3
      }
    }
    // Tan accent
    if (c0 + 2 < 31) {
      s[15][c0 + 2] = 4; s[16][c0 + 2] = 4
    }
  }
  // Bottom rail and base
  for (let c = 0; c < 32; c++) { s[22][c] = 22; s[23][c] = 22 }
  for (let c = 0; c < 32; c++) { s[24][c] = 1; s[25][c] = 1 }
  for (let c = 0; c < 32; c++) { s[26][c] = 1; s[27][c] = 1 }
  // Empty rows at bottom (like original)
  return s
})()

// Marble counter — white/gray surface, dark wood body
export const COUNTER_TOP_T2: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
  // Top edge
  for (let c = 0; c < 32; c++) { s[0][c] = 10; s[1][c] = 10 }  // dark gray rail
  // Marble surface (white 8, off-white 7)
  for (let c = 0; c < 32; c++) { s[2][c] = 10 }  // side rail
  for (let r = 3; r < 6; r++) for (let c = 0; c < 32; c++) s[r][c] = 8  // white marble
  // Gray veining on surface
  s[3][5] = 12; s[3][6] = 12; s[4][7] = 12; s[4][8] = 12
  s[3][17] = 12; s[4][18] = 12; s[4][19] = 12
  s[5][11] = 12; s[5][12] = 12; s[5][24] = 12; s[5][25] = 12
  // Off-white accents
  s[3][10] = 7; s[4][14] = 7; s[4][22] = 7; s[5][3] = 7; s[5][28] = 7
  for (let c = 0; c < 32; c++) { s[6][c] = 10 }  // lower rail
  // Lip/trim
  for (let c = 0; c < 32; c++) { s[7][c] = 10; s[8][c] = 10 }
  // Dark wood body panels below (1, 2)
  for (let r = 9; r < 23; r++) for (let c = 0; c < 32; c++) s[r][c] = 1
  // Panel insets (darker wood)
  for (let panel = 0; panel < 5; panel++) {
    const c0 = 1 + panel * 6
    const c1 = c0 + 5
    for (let r = 10; r < 22; r++) {
      for (let c = c0; c < c1 && c < 31; c++) {
        s[r][c] = 2
      }
    }
    for (let r = 11; r < 21; r++) {
      for (let c = c0 + 1; c < c1 - 1 && c < 30; c++) {
        s[r][c] = 3
      }
    }
  }
  // Base
  for (let c = 0; c < 32; c++) { s[23][c] = 10; s[24][c] = 10 }
  for (let c = 0; c < 32; c++) { s[25][c] = 10; s[26][c] = 10 }
  for (let c = 0; c < 32; c++) { s[27][c] = 1 }
  return s
})()

// === OUTSIDE / STREET SCENE SPRITES ===

// Road — dark asphalt, subtle texture
export const ROAD: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(10))
  for (let r = 0; r < 32; r++)
    for (let c = 0; c < 32; c++)
      if ((r * 7 + c * 13) % 31 === 0) s[r][c] = 9
  return s
})()

// Road with dashed yellow center line
export const ROAD_LINE: Sprite = (() => {
  const s: Sprite = ROAD.map(r => [...r])
  for (let r = 4; r < 28; r++) { s[r][15] = 17; s[r][16] = 17 }
  return s
})()

// Sidewalk — clean stone slab grid
export const SIDEWALK: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(6))
  // Subtle slab grid
  for (let c = 0; c < 32; c++) { s[0][c] = 5; s[16][c] = 5 }
  for (let r = 0; r < 32; r++) { s[r][0] = 5; s[r][16] = 5 }
  return s
})()

// Shop wall — solid warm brown facade
export const SHOP_WALL: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(2))
  // Bottom border
  for (let c = 0; c < 32; c++) s[31][c] = 1
  return s
})()

// Shop wall light — solid cream/sand facade
export const SHOP_WALL_LIGHT: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(31))
  for (let c = 0; c < 32; c++) s[31][c] = 4
  return s
})()

// Awnings are no longer used as tiles — signs drawn via canvas
export const AWNING_RED: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
export const AWNING_BLUE: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
export const AWNING_GREEN: Sprite = Array.from({length: 32}, () => Array(32).fill(0))
export const AWNING_BROWN: Sprite = Array.from({length: 32}, () => Array(32).fill(0))

// Shop window — wall with a nice window
export const SHOP_WINDOW: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(2))
  // Window opening
  for (let r = 4; r < 26; r++)
    for (let c = 4; c < 28; c++)
      s[r][c] = 19
  // Frame
  for (let c = 3; c < 29; c++) { s[3][c] = 1; s[26][c] = 1 }
  for (let r = 3; r < 27; r++) { s[r][3] = 1; s[r][28] = 1 }
  // Divider
  for (let r = 3; r < 27; r++) s[r][15] = 1; s[3][16] = 1
  for (let r = 3; r < 27; r++) s[r][16] = 1
  // Reflection
  for (let r = 6; r < 14; r++) { s[r][6] = 26; s[r][7] = 8 }
  for (let r = 6; r < 14; r++) { s[r][18] = 26; s[r][19] = 8 }
  // Bottom border
  for (let c = 0; c < 32; c++) s[31][c] = 1
  return s
})()

// Locked door — gray door, not enterable
export const LOCKED_DOOR: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(2))
  // Door
  for (let r = 3; r < 30; r++)
    for (let c = 8; c < 24; c++)
      s[r][c] = 11
  // Frame
  for (let c = 7; c < 25; c++) { s[2][c] = 1; s[30][c] = 1 }
  for (let r = 2; r < 31; r++) { s[r][7] = 1; s[r][24] = 1 }
  // Handle
  s[17][21] = 12; s[18][21] = 12
  // Bottom border
  for (let c = 0; c < 32; c++) s[31][c] = 1
  return s
})()

// Café door — warm wooden door with glass panel
export const CAFE_DOOR: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(2))
  // Door
  for (let r = 3; r < 30; r++)
    for (let c = 8; c < 24; c++)
      s[r][c] = 3
  // Frame
  for (let c = 7; c < 25; c++) { s[2][c] = 1; s[30][c] = 1 }
  for (let r = 2; r < 31; r++) { s[r][7] = 1; s[r][24] = 1 }
  // Glass panel in door
  for (let r = 5; r < 16; r++)
    for (let c = 11; c < 21; c++)
      s[r][c] = 19
  for (let c = 10; c < 22; c++) { s[4][c] = 1; s[16][c] = 1 }
  for (let r = 4; r < 17; r++) { s[r][10] = 1; s[r][21] = 1 }
  // Reflection
  for (let r = 6; r < 12; r++) { s[r][12] = 26; s[r][13] = 8 }
  // Handle
  s[20][21] = 17; s[21][21] = 17
  // Welcome mat
  for (let c = 10; c < 22; c++) s[30][c] = 15
  // Bottom border
  for (let c = 0; c < 32; c++) s[31][c] = 1
  return s
})()

// Street lamp on sidewalk
export const STREET_LAMP: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(6)) // sidewalk base
  // Post
  for (let r = 8; r < 26; r++) { s[r][15] = 10; s[r][16] = 10 }
  // Lamp head
  for (let r = 4; r < 9; r++)
    for (let c = 12; c < 20; c++)
      s[r][c] = 10
  // Glow
  for (let r = 5; r < 8; r++)
    for (let c = 13; c < 19; c++)
      s[r][c] = 17
  // Base
  for (let c = 13; c < 19; c++) { s[25][c] = 10; s[26][c] = 10 }
  return s
})()

// Outdoor potted plant on sidewalk
export const OUTDOOR_PLANT: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(6)) // sidewalk base
  // Pot
  for (let r = 20; r < 28; r++)
    for (let c = 11; c < 21; c++)
      s[r][c] = 15
  for (let c = 10; c < 22; c++) s[19][c] = 36
  // Foliage
  for (let r = 6; r < 20; r++)
    for (let c = 8; c < 24; c++) {
      const d = Math.sqrt((r - 12) ** 2 + (c - 16) ** 2)
      if (d < 8) s[r][c] = ((r + c) % 3 === 0) ? 14 : 13
    }
  return s
})()

// Curb left (sidewalk left, road right)
export const CURB: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(6))
  for (let r = 0; r < 32; r++)
    for (let c = 28; c < 32; c++)
      s[r][c] = 10
  for (let r = 0; r < 32; r++) { s[r][26] = 8; s[r][27] = 11 }
  return s
})()

// Curb right (road left, sidewalk right)
export const CURB_R: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(6))
  for (let r = 0; r < 32; r++)
    for (let c = 0; c < 4; c++)
      s[r][c] = 10
  for (let r = 0; r < 32; r++) { s[r][4] = 11; s[r][5] = 8 }
  return s
})()

// Roof — gray tiles seen from above
export const ROOF: Sprite = (() => {
  const s: Sprite = Array.from({length: 32}, () => Array(32).fill(11))
  for (let r = 0; r < 32; r++)
    if (r % 6 === 0) for (let c = 0; c < 32; c++) s[r][c] = 10
  return s
})()

export const SPRITE_MAP: Record<string, Sprite> = {
  FLOOR_WOOD,
  WALL,
  COUNTER_TOP,
  COUNTER_END_L,
  TABLE,
  CHAIR,
  COFFEE_MACHINE,
  SHELF,
  MENU_BOARD,
  DOOR,
  LAMP,
  PLANT,
  COFFEE_CUP,
  WINDOW,
  BOOKSHELF,
  GRASS,
  HEDGE,
  PATH_TILE,
  FLOWER,
  BENCH,
  FOUNTAIN,
  TREE,
  LANTERN,
  POND,
  CHESS_TABLE,
  PLANT_T1,
  PLANT_T2,
  LAMP_T1,
  LAMP_T2,
  CHAIR_T1,
  CHAIR_T2,
  TABLE_T1,
  TABLE_T2,
  SHELF_T1,
  SHELF_T2,
  COFFEE_MACHINE_T1,
  COFFEE_MACHINE_T2,
  COUNTER_TOP_T1,
  COUNTER_TOP_T2,
  FLOOR_HERRINGBONE,
  FLOOR_MARBLE,
  // Outside scene
  ROAD,
  ROAD_LINE,
  SIDEWALK,
  SHOP_WALL,
  SHOP_WALL_LIGHT,
  AWNING_RED,
  AWNING_BLUE,
  AWNING_GREEN,
  AWNING_BROWN,
  SHOP_WINDOW,
  LOCKED_DOOR,
  CAFE_DOOR,
  STREET_LAMP,
  OUTDOOR_PLANT,
  CURB,
  CURB_R,
  ROOF,
}

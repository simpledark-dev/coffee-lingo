import { CAFE_LAYOUT, GRID_COLS, GRID_ROWS, T, isWalkable, isOutsideWalkable, isPatioTile } from './tilemap'
import type { PointOfInterest, CustomerDirection } from './types'

function buildPOIs(): PointOfInterest[] {
  const pois: PointOfInterest[] = []
  let id = 0

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const tile = CAFE_LAYOUT[row]?.[col]
      if (!tile) continue

      switch (tile) {
        // Counter: the floor tile in front of counter (row 15, the row above counter row 16)
        // We check row 15 specifically for counter slots
        case T.FLOOR: {
          // Counter slots: row 26 (floor in front of counter at row 27), cols 23/25/27 (cafe room)
          if (row === 26 && (col === 23 || col === 25 || col === 27)) {
            pois.push({
              id: `counter_${id++}`,
              type: 'counter',
              pos: { row, col },
              facingDir: 'down',
              maxOccupants: 1,
            })
          }
          break
        }

        // Chairs: customer can sit here
        case T.CHAIR_U:
        case T.CHAIR_D: {
          pois.push({
            id: `chair_${id++}`,
            type: 'chair',
            pos: { row, col },
            facingDir: tile === T.CHAIR_U ? 'up' : 'down',
            maxOccupants: 1,
          })
          break
        }

        // Shelf: stand on the floor tile below the shelf and look up
        case T.SHELF: {
          const belowRow = row + 1
          if (belowRow < GRID_ROWS && isWalkable(belowRow, col)) {
            pois.push({
              id: `shelf_${id++}`,
              type: 'shelf',
              pos: { row: belowRow, col },
              facingDir: 'up',
              maxOccupants: 1,
            })
          }
          break
        }

        // Menu board: stand below and look up
        case T.MENU: {
          const belowRow = row + 1
          if (belowRow < GRID_ROWS && isWalkable(belowRow, col)) {
            // Avoid duplicate if adjacent menu tiles share same floor tile
            const exists = pois.some(p => p.type === 'menu' && p.pos.row === belowRow && p.pos.col === col)
            if (!exists) {
              pois.push({
                id: `menu_${id++}`,
                type: 'menu',
                pos: { row: belowRow, col },
                facingDir: 'up',
                maxOccupants: 2,
              })
            }
          }
          break
        }

        // Window: stand below and look up
        case T.WINDOW: {
          const belowRow = row + 1
          if (belowRow < GRID_ROWS && isWalkable(belowRow, col)) {
            const exists = pois.some(p => p.type === 'window' && p.pos.row === belowRow && p.pos.col === col)
            if (!exists) {
              pois.push({
                id: `window_${id++}`,
                type: 'window',
                pos: { row: belowRow, col },
                facingDir: 'up',
                maxOccupants: 1,
              })
            }
          }
          break
        }

        // Bookshelf: stand on the floor tile below and look up
        case T.BOOKSHELF: {
          const belowRow = row + 1
          if (belowRow < GRID_ROWS && isWalkable(belowRow, col)) {
            const exists = pois.some(p => p.type === 'bookshelf' && p.pos.row === belowRow && p.pos.col === col)
            if (!exists) {
              pois.push({
                id: `bookshelf_${id++}`,
                type: 'bookshelf',
                pos: { row: belowRow, col },
                facingDir: 'up',
                maxOccupants: 1,
              })
            }
          }
          break
        }

        // Pond: stand on adjacent walkable tile and gaze at water
        case T.POND: {
          const pCandidates: { r: number; c: number; dir: CustomerDirection }[] = [
            { r: row + 1, c: col, dir: 'up' },
            { r: row - 1, c: col, dir: 'down' },
            { r: row, c: col - 1, dir: 'right' },
            { r: row, c: col + 1, dir: 'left' },
          ]
          for (const { r, c, dir } of pCandidates) {
            if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS && isWalkable(r, c)) {
              const exists = pois.some(p => p.type === 'pond' && p.pos.row === r && p.pos.col === c)
              if (!exists) {
                pois.push({
                  id: `pond_${id++}`,
                  type: 'pond',
                  pos: { row: r, col: c },
                  facingDir: dir,
                  maxOccupants: 1,
                })
              }
            }
          }
          break
        }

        // Fountain: stand on adjacent walkable tile and look at it
        case T.FOUNTAIN: {
          const fCandidates: { r: number; c: number; dir: CustomerDirection }[] = [
            { r: row + 1, c: col, dir: 'up' },
            { r: row - 1, c: col, dir: 'down' },
            { r: row, c: col - 1, dir: 'right' },
            { r: row, c: col + 1, dir: 'left' },
          ]
          for (const { r, c, dir } of fCandidates) {
            if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS && isWalkable(r, c)) {
              const exists = pois.some(p => p.type === 'fountain' && p.pos.row === r && p.pos.col === c)
              if (!exists) {
                pois.push({
                  id: `fountain_${id++}`,
                  type: 'fountain',
                  pos: { row: r, col: c },
                  facingDir: dir,
                  maxOccupants: 2,
                })
              }
            }
          }
          break
        }

        // Tree: stand below tree and look up
        case T.TREE: {
          const belowRow = row + 1
          if (belowRow < GRID_ROWS && isWalkable(belowRow, col)) {
            pois.push({
              id: `tree_${id++}`,
              type: 'tree',
              pos: { row: belowRow, col },
              facingDir: 'up',
              maxOccupants: 1,
            })
          }
          break
        }

        // Bench: customer sits on the bench tile itself
        case T.BENCH: {
          pois.push({
            id: `bench_${id++}`,
            type: 'bench',
            pos: { row, col },
            facingDir: 'down',
            maxOccupants: 1,
          })
          break
        }

        // Plant: stand on adjacent floor tile
        case T.PLANT: {
          // Check below first, then left, then right
          const candidates: { r: number; c: number; dir: CustomerDirection }[] = [
            { r: row + 1, c: col, dir: 'up' },
            { r: row, c: col - 1, dir: 'right' },
            { r: row, c: col + 1, dir: 'left' },
          ]
          for (const { r, c, dir } of candidates) {
            if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS && isWalkable(r, c)) {
              pois.push({
                id: `plant_${id++}`,
                type: 'plant',
                pos: { row: r, col: c },
                facingDir: dir,
                maxOccupants: 1,
              })
              break // only one POI per plant
            }
          }
          break
        }
      }
    }
  }

  // Add a few open floor spots for variety (hand-picked central areas)
  const floorSpots = [
    // Patio
    { row: 21, col: 5 },  // patio center
    { row: 24, col: 5 },  // patio lower
    { row: 27, col: 5 },  // patio open floor
    // Reading room (interior — cols shifted +10)
    { row: 11, col: 15 },  // reading room upper area
    { row: 19, col: 15 },  // reading room passage area
    { row: 24, col: 14 },  // reading room lower area
    // Cafe (interior — cols shifted +10)
    { row: 14, col: 25 }, // cafe upper room center
    { row: 19, col: 25 }, // cafe below divider
    { row: 24, col: 24 }, // cafe lower area
    // Garden (cols shifted +10)
    { row: 3, col: 15 },   // left garden
    { row: 3, col: 25 },   // right garden
    { row: 5, col: 18 },   // left garden lower
    { row: 5, col: 22 },   // right garden lower
  ]
  for (const pos of floorSpots) {
    if (isWalkable(pos.row, pos.col)) {
      pois.push({
        id: `floor_${id++}`,
        type: 'floor',
        pos,
        facingDir: 'down',
        maxOccupants: 1,
      })
    }
  }

  return pois
}

export const POINTS_OF_INTEREST = buildPOIs()

/**
 * Pick a random unoccupied/under-capacity POI, avoiding the current one.
 * Also avoids POIs whose grid position is already occupied by another customer.
 */
export function pickNextPOI(
  currentPOI: string | null,
  occupancy: Map<string, number[]>,
  occupiedPositions?: Set<string>,
  patioUnlocked: boolean = true,
  extraPOIs?: PointOfInterest[],
  nearTo?: { row: number; col: number },  // bias toward POIs close to this grid position
): PointOfInterest | null {
  const allPOIs = extraPOIs ? [...POINTS_OF_INTEREST, ...extraPOIs] : POINTS_OF_INTEREST
  const available = allPOIs.filter(poi => {
    if (poi.id === currentPOI) return false
    if (!patioUnlocked && isPatioTile(poi.pos.row, poi.pos.col)) return false
    const occupants = occupancy.get(poi.id) ?? []
    if (occupants.length >= poi.maxOccupants) return false
    if (occupiedPositions && occupiedPositions.has(`${poi.pos.row},${poi.pos.col}`)) return false
    return true
  })

  if (available.length === 0) return null

  // When biased, pick randomly among the 3 nearest (short walk + a little variety).
  if (nearTo) {
    const dist = (p: PointOfInterest) =>
      Math.abs(p.pos.row - nearTo.row) + Math.abs(p.pos.col - nearTo.col)
    const sorted = [...available].sort((a, b) => dist(a) - dist(b))
    const k = Math.min(3, sorted.length)
    return sorted[Math.floor(Math.random() * k)]
  }

  return available[Math.floor(Math.random() * available.length)]
}

// --- Outside POIs ---

function buildOutsidePOIs(): PointOfInterest[] {
  const pois: PointOfInterest[] = []
  let id = 0

  // Sidewalk strolling spots (gap rows between shops)
  const sidewalkSpots: { row: number; col: number; dir: 'up' | 'down' | 'left' | 'right' }[] = [
    { row: 0,  col: 4, dir: 'down' },
    { row: 0,  col: 5, dir: 'down' },
    { row: 4,  col: 4, dir: 'left' },
    { row: 4,  col: 5, dir: 'right' },
    { row: 9,  col: 4, dir: 'left' },
    { row: 9,  col: 5, dir: 'right' },
    { row: 13, col: 4, dir: 'left' },
    { row: 13, col: 5, dir: 'down' },
    { row: 17, col: 4, dir: 'up' },
    { row: 17, col: 5, dir: 'up' },
  ]
  for (const { row, col, dir } of sidewalkSpots) {
    if (isOutsideWalkable(row, col)) {
      pois.push({
        id: `outside_walk_${id++}`,
        type: 'floor',
        pos: { row, col },
        facingDir: dir,
        maxOccupants: 1,
      })
    }
  }

  // Window shopping spots (stand on sidewalk, face left toward shops)
  const windowShopSpots = [
    { row: 1,  col: 4 }, // Boulangerie
    { row: 6,  col: 4 }, // Café
    { row: 10, col: 4 }, // Librairie
    { row: 15, col: 4 }, // Fleuriste
  ]
  for (const { row, col } of windowShopSpots) {
    if (isOutsideWalkable(row, col)) {
      pois.push({
        id: `outside_shop_${id++}`,
        type: 'window',
        pos: { row, col },
        facingDir: 'left',
        maxOccupants: 2,
      })
    }
  }

  // Near street lamps (idle spots)
  const lampSpots = [
    { row: 2,  col: 5 },
    { row: 6,  col: 5 },
    { row: 9,  col: 5 },
    { row: 13, col: 5 },
  ]
  for (const { row, col } of lampSpots) {
    if (isOutsideWalkable(row, col)) {
      pois.push({
        id: `outside_lamp_${id++}`,
        type: 'floor',
        pos: { row, col },
        facingDir: 'down',
        maxOccupants: 1,
      })
    }
  }

  return pois
}

export const OUTSIDE_POIS = buildOutsidePOIs()

export function pickNextOutsidePOI(
  currentPOI: string | null,
  occupancy: Map<string, number[]>,
  occupiedPositions?: Set<string>,
): PointOfInterest | null {
  const available = OUTSIDE_POIS.filter(poi => {
    if (poi.id === currentPOI) return false
    const occupants = occupancy.get(poi.id) ?? []
    if (occupants.length >= poi.maxOccupants) return false
    if (occupiedPositions && occupiedPositions.has(`${poi.pos.row},${poi.pos.col}`)) return false
    return true
  })

  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)]
}

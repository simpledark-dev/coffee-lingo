import { CAFE_LAYOUT, GRID_COLS, GRID_ROWS, T, isWalkable } from './tilemap'
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
          // Counter slots: row 18 (floor in front of counter at row 19), cols 13/15/17 (cafe room)
          if (row === 18 && (col === 13 || col === 15 || col === 17)) {
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
    // Reading room
    { row: 3, col: 5 },   // reading room upper area
    { row: 11, col: 5 },  // reading room passage area
    { row: 16, col: 4 },  // reading room lower area
    // Cafe
    { row: 6, col: 15 },  // cafe upper room center
    { row: 11, col: 15 }, // cafe below divider
    { row: 16, col: 14 }, // cafe lower area
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
): PointOfInterest | null {
  const available = POINTS_OF_INTEREST.filter(poi => {
    if (poi.id === currentPOI) return false
    const occupants = occupancy.get(poi.id) ?? []
    if (occupants.length >= poi.maxOccupants) return false
    if (occupiedPositions && occupiedPositions.has(`${poi.pos.row},${poi.pos.col}`)) return false
    return true
  })

  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)]
}

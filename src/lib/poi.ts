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
          // Counter slots: row 15, cols 7/8/9
          if (row === 15 && col >= 7 && col <= 9) {
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
    { row: 6, col: 8 },   // upper room center
    { row: 6, col: 10 },  // upper room center-right
    { row: 15, col: 4 },  // main cafe left of counter
    { row: 15, col: 13 }, // main cafe right of counter
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
 */
export function pickNextPOI(
  currentPOI: string | null,
  occupancy: Map<string, number[]>,
): PointOfInterest | null {
  const available = POINTS_OF_INTEREST.filter(poi => {
    if (poi.id === currentPOI) return false
    const occupants = occupancy.get(poi.id) ?? []
    return occupants.length < poi.maxOccupants
  })

  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)]
}

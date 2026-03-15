import { GRID_COLS, GRID_ROWS, TILE_SIZE, SCALE, isWalkable } from './tilemap'
import type { GridPos, WorldPos } from './types'

const TILE_PX = TILE_SIZE * SCALE

export function gridToWorld(pos: GridPos): WorldPos {
  return { x: pos.col * TILE_PX, y: pos.row * TILE_PX }
}

export function worldToGrid(pos: WorldPos): GridPos {
  return {
    row: Math.floor(pos.y / TILE_PX),
    col: Math.floor(pos.x / TILE_PX),
  }
}

function posKey(row: number, col: number): string {
  return `${row},${col}`
}

const DIRS = [
  { dr: -1, dc: 0 },  // up
  { dr: 1, dc: 0 },   // down
  { dr: 0, dc: -1 },  // left
  { dr: 0, dc: 1 },   // right
]

/**
 * BFS pathfinding on the walkable grid.
 * Returns array of GridPos from `from` to `to` (inclusive), or empty if no path.
 * `blocked` is an optional set of "row,col" strings to avoid (other customers).
 * If no path with blocked tiles, retries without blocking.
 */
export function findPath(
  from: GridPos,
  to: GridPos,
  blocked?: Set<string>
): GridPos[] {
  const result = bfs(from, to, blocked)
  if (result.length > 0) return result
  // Retry without blocked tiles if soft avoidance failed
  if (blocked && blocked.size > 0) return bfs(from, to)
  return []
}

function bfs(from: GridPos, to: GridPos, blocked?: Set<string>): GridPos[] {
  if (from.row === to.row && from.col === to.col) return [from]

  const visited = new Set<string>()
  const parent = new Map<string, string>()
  const queue: GridPos[] = [from]
  const startKey = posKey(from.row, from.col)
  visited.add(startKey)

  while (queue.length > 0) {
    const curr = queue.shift()!
    const currKey = posKey(curr.row, curr.col)

    for (const { dr, dc } of DIRS) {
      const nr = curr.row + dr
      const nc = curr.col + dc
      const nKey = posKey(nr, nc)

      if (visited.has(nKey)) continue
      if (!isWalkable(nr, nc)) continue
      if (blocked?.has(nKey) && !(nr === to.row && nc === to.col)) continue

      visited.add(nKey)
      parent.set(nKey, currKey)

      if (nr === to.row && nc === to.col) {
        // Reconstruct path
        const path: GridPos[] = []
        let key = nKey
        while (key !== startKey) {
          const [r, c] = key.split(',').map(Number)
          path.unshift({ row: r, col: c })
          key = parent.get(key)!
        }
        path.unshift(from)
        return path
      }

      queue.push({ row: nr, col: nc })
    }
  }

  return [] // no path found
}

/**
 * Get the facing direction for movement from one grid pos to the next.
 */
export function movementDirection(from: GridPos, to: GridPos): 'up' | 'down' | 'left' | 'right' {
  const dr = to.row - from.row
  const dc = to.col - from.col
  if (Math.abs(dr) >= Math.abs(dc)) {
    return dr < 0 ? 'up' : 'down'
  }
  return dc < 0 ? 'left' : 'right'
}

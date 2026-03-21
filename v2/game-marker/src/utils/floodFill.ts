import type { TilePlacement } from '../types/editor'

/**
 * BFS flood fill starting from (startRow, startCol).
 * Fills all connected cells that have the same tile as the starting cell
 * (or are empty if the starting cell is empty).
 * Returns a Record of "row,col" -> TilePlacement for all cells to fill.
 */
export function floodFill(
  startRow: number,
  startCol: number,
  gridRows: number,
  gridCols: number,
  currentTiles: Record<string, TilePlacement>,
  fillTile: TilePlacement,
): Record<string, TilePlacement> {
  const startKey = `${startRow},${startCol}`
  const startTile = currentTiles[startKey] ?? null

  // Don't fill if target is same as fill tile
  if (
    startTile &&
    startTile.tilesetId === fillTile.tilesetId &&
    startTile.tileIndex === fillTile.tileIndex
  ) {
    return {}
  }

  const result: Record<string, TilePlacement> = {}
  const visited = new Set<string>()
  const queue: [number, number][] = [[startRow, startCol]]
  visited.add(startKey)

  function matches(r: number, c: number): boolean {
    const key = `${r},${c}`
    const tile = currentTiles[key] ?? null
    if (startTile === null) return tile === null
    if (tile === null) return false
    return tile.tilesetId === startTile.tilesetId && tile.tileIndex === startTile.tileIndex
  }

  while (queue.length > 0) {
    const [r, c] = queue.shift()!
    result[`${r},${c}`] = { ...fillTile }

    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
      const nr = r + dr
      const nc = c + dc
      const nk = `${nr},${nc}`
      if (nr < 0 || nr >= gridRows || nc < 0 || nc >= gridCols) continue
      if (visited.has(nk)) continue
      visited.add(nk)
      if (matches(nr, nc)) {
        queue.push([nr, nc])
      }
    }
  }

  return result
}

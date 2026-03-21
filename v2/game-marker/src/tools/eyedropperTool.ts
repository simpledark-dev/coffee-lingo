import type { ToolHandlers } from './toolTypes'
import type { TilePlacement } from '../types/editor'

let startRow = 0
let startCol = 0
let endRow = 0
let endCol = 0
let dragged = false

function getTopTile(row: number, col: number, state: Parameters<ToolHandlers['onDown']>[2]): TilePlacement | null {
  for (let i = state.layers.length - 1; i >= 0; i--) {
    const layer = state.layers[i]
    if (!layer.visible) continue
    const tile = layer.tiles[`${row},${col}`]
    if (tile) return tile
  }
  return null
}

export const eyedropperToolPatched: ToolHandlers = {
  onDown(row, col, _state, dispatch) {
    startRow = row
    startCol = col
    endRow = row
    endCol = col
    dragged = false
    dispatch({ type: 'SET_SELECTION', selection: { startRow: row, startCol: col, endRow: row, endCol: col } })
  },
  onMove(row, col, _state, dispatch) {
    endRow = row
    endCol = col
    if (row !== startRow || col !== startCol) dragged = true
    dispatch({ type: 'SET_SELECTION', selection: { startRow, startCol, endRow: row, endCol: col } })
  },
  onUp(state, dispatch) {
    dispatch({ type: 'SET_SELECTION', selection: null })
    if (!dragged) {
      // Single click: pick one tile
      const tile = getTopTile(startRow, startCol, state)
      if (tile) {
        dispatch({ type: 'SELECT_TILE', tile })
        dispatch({ type: 'SET_TOOL', tool: 'pencil' })
      }
      return
    }

    // Drag: pick a region as brush
    const minR = Math.min(startRow, endRow)
    const maxR = Math.max(startRow, endRow)
    const minC = Math.min(startCol, endCol)
    const maxC = Math.max(startCol, endCol)
    const w = maxC - minC + 1
    const h = maxR - minR + 1

    const tiles: (number | null)[][] = []
    let tilesetId: string | null = null
    let hasAny = false

    for (let r = 0; r < h; r++) {
      const row: (number | null)[] = []
      for (let c = 0; c < w; c++) {
        const tile = getTopTile(minR + r, minC + c, state)
        if (tile) {
          if (!tilesetId) tilesetId = tile.tilesetId
          if (tile.tilesetId === tilesetId) {
            row.push(tile.tileIndex)
            hasAny = true
          } else {
            row.push(null)
          }
        } else {
          row.push(null)
        }
      }
      tiles.push(row)
    }

    if (hasAny && tilesetId) {
      dispatch({ type: 'SELECT_BRUSH', brush: { tilesetId, tiles, width: w, height: h } })
      dispatch({ type: 'SET_TOOL', tool: 'pencil' })
    }
  },
}

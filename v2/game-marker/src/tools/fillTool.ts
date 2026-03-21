import type { ToolHandlers } from './toolTypes'
import { floodFill } from '../utils/floodFill'

export const fillTool: ToolHandlers = {
  onDown(row, col, state, dispatch) {
    if (!state.selectedTile) return
    const layer = state.layers.find(l => l.id === state.activeLayerId)
    if (!layer) return
    const filled = floodFill(
      row, col,
      state.gridRows, state.gridCols,
      layer.tiles,
      state.selectedTile,
    )
    if (Object.keys(filled).length > 0) {
      dispatch({ type: 'FILL_TILES', tiles: filled })
    }
  },
  onMove() {},
  onUp() {},
}

import type { ToolHandlers } from './toolTypes'

export const eyedropperTool: ToolHandlers = {
  onDown(row, col, state, dispatch) {
    // Find topmost visible layer with a tile at this position
    for (let i = state.layers.length - 1; i >= 0; i--) {
      const layer = state.layers[i]
      if (!layer.visible) continue
      const key = `${row},${col}`
      const tile = layer.tiles[key]
      if (tile) {
        dispatch({ type: 'SELECT_TILE', tile })
        dispatch({ type: 'SET_TOOL', tool: 'pencil' })
        return
      }
    }
  },
  onMove() {},
  onUp() {},
}

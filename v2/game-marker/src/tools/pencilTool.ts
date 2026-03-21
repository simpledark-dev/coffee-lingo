import type { ToolHandlers } from './toolTypes'

export const pencilTool: ToolHandlers = {
  onDown(row, col, state, dispatch) {
    if (state.selectedBrush) {
      dispatch({ type: 'PLACE_BRUSH', row, col })
    } else {
      dispatch({ type: 'PLACE_TILE', row, col })
    }
  },
  onMove(row, col, state, dispatch) {
    if (state.selectedBrush) {
      dispatch({ type: 'PLACE_BRUSH', row, col })
    } else {
      dispatch({ type: 'PLACE_TILE', row, col })
    }
  },
  onUp() {},
}

import type { ToolHandlers } from './toolTypes'

export const eraserTool: ToolHandlers = {
  onDown(row, col, _state, dispatch) {
    dispatch({ type: 'ERASE_TILE', row, col })
  },
  onMove(row, col, _state, dispatch) {
    dispatch({ type: 'ERASE_TILE', row, col })
  },
  onUp() {},
}

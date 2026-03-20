import type { ToolHandlers } from './toolTypes'

let startRow = 0
let startCol = 0

export const selectTool: ToolHandlers = {
  onDown(row, col, _state, dispatch) {
    startRow = row
    startCol = col
    dispatch({ type: 'SET_SELECTION', selection: { startRow: row, startCol: col, endRow: row, endCol: col } })
  },
  onMove(row, col, _state, dispatch) {
    dispatch({ type: 'SET_SELECTION', selection: { startRow, startCol, endRow: row, endCol: col } })
  },
  onUp() {},
}

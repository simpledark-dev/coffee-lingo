import type { ToolHandlers } from './toolTypes'

let startRow = 0
let startCol = 0
let mode: 'select' | 'move' = 'select'
let moveOriginRow = 0
let moveOriginCol = 0
let historyPushed = false

function isInsideSelection(row: number, col: number, state: { selection: { startRow: number; startCol: number; endRow: number; endCol: number } | null }): boolean {
  if (!state.selection) return false
  const { startRow: sr, startCol: sc, endRow: er, endCol: ec } = state.selection
  const minR = Math.min(sr, er), maxR = Math.max(sr, er)
  const minC = Math.min(sc, ec), maxC = Math.max(sc, ec)
  return row >= minR && row <= maxR && col >= minC && col <= maxC
}

export const selectTool: ToolHandlers = {
  onDown(row, col, state, dispatch) {
    if (isInsideSelection(row, col, state)) {
      // Start moving the selection
      mode = 'move'
      moveOriginRow = row
      moveOriginCol = col
      historyPushed = false
    } else {
      // Start new selection
      mode = 'select'
      startRow = row
      startCol = col
      dispatch({ type: 'SET_SELECTION', selection: { startRow: row, startCol: col, endRow: row, endCol: col } })
    }
  },
  onMove(row, col, _state, dispatch) {
    if (mode === 'move') {
      const dRow = row - moveOriginRow
      const dCol = col - moveOriginCol
      if (dRow === 0 && dCol === 0) return
      if (!historyPushed) {
        dispatch({ type: 'PUSH_HISTORY' })
        historyPushed = true
      }
      dispatch({ type: 'MOVE_SELECTION', dRow, dCol })
      moveOriginRow = row
      moveOriginCol = col
    } else {
      dispatch({ type: 'SET_SELECTION', selection: { startRow, startCol, endRow: row, endCol: col } })
    }
  },
  onUp() {
    mode = 'select'
  },
}

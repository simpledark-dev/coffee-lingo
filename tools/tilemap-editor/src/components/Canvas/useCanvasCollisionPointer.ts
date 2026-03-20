import { useCallback, useRef } from 'react'
import { useEditorState, useEditorDispatch } from '../../state/EditorContext'

export type DragPreview = {
  startRow: number; startCol: number; endRow: number; endCol: number
} | null

export function useCanvasCollisionPointer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  const state = useEditorState()
  const dispatch = useEditorDispatch()

  const isDraggingNew = useRef(false)
  const isDraggingMove = useRef(false)
  const dragStart = useRef<{ row: number; col: number } | null>(null)
  const dragMoveOffset = useRef<{ dRow: number; dCol: number }>({ dRow: 0, dCol: 0 })
  const dragMoveZoneId = useRef<string | null>(null)
  const historyPushed = useRef(false)

  // Use ref instead of state to avoid re-render flicker during drag
  const dragPreviewRef = useRef<DragPreview>(null)

  const screenToGrid = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left - state.panX) / state.zoom
    const y = (clientY - rect.top - state.panY) / state.zoom
    return { row: Math.floor(y / state.tileSize), col: Math.floor(x / state.tileSize) }
  }, [canvasRef, state.panX, state.panY, state.zoom, state.tileSize])

  const onCollisionPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    const grid = screenToGrid(e.clientX, e.clientY)
    if (!grid) return

    // Check if clicking on an existing zone
    const clickedZone = [...state.zones].reverse().find(z => {
      return grid.row >= z.row && grid.row < z.row + z.height &&
             grid.col >= z.col && grid.col < z.col + z.width
    })

    if (clickedZone && !state.selectedZoneDefType) {
      // Select or start drag move
      dispatch({ type: 'SELECT_ZONE', zoneId: clickedZone.id })
      isDraggingMove.current = true
      dragMoveZoneId.current = clickedZone.id
      dragMoveOffset.current = { dRow: grid.row - clickedZone.row, dCol: grid.col - clickedZone.col }
      historyPushed.current = false
      return
    }

    if (state.selectedZoneDefType) {
      // Start drawing new zone
      isDraggingNew.current = true
      dragStart.current = grid
      dragPreviewRef.current = { startRow: grid.row, startCol: grid.col, endRow: grid.row, endCol: grid.col }
      return
    }

    // Click empty space: deselect
    dispatch({ type: 'SELECT_ZONE', zoneId: null })
  }, [screenToGrid, state.zones, state.selectedZoneDefType, dispatch])

  const onCollisionPointerMove = useCallback((e: React.PointerEvent) => {
    const grid = screenToGrid(e.clientX, e.clientY)
    if (!grid) return

    if (isDraggingNew.current && dragStart.current) {
      const endRow = Math.max(0, Math.min(state.gridRows - 1, grid.row))
      const endCol = Math.max(0, Math.min(state.gridCols - 1, grid.col))
      dragPreviewRef.current = {
        startRow: dragStart.current.row,
        startCol: dragStart.current.col,
        endRow,
        endCol,
      }
      return
    }

    if (isDraggingMove.current && dragMoveZoneId.current) {
      if (!historyPushed.current) {
        dispatch({ type: 'PUSH_HISTORY' })
        historyPushed.current = true
      }
      const newRow = grid.row - dragMoveOffset.current.dRow
      const newCol = grid.col - dragMoveOffset.current.dCol
      dispatch({ type: 'MOVE_ZONE', zoneId: dragMoveZoneId.current, row: newRow, col: newCol })
    }
  }, [screenToGrid, state.gridRows, state.gridCols, dispatch])

  const onCollisionPointerUp = useCallback(() => {
    if (isDraggingNew.current && dragStart.current && dragPreviewRef.current) {
      const dp = dragPreviewRef.current
      const minR = Math.min(dp.startRow, dp.endRow)
      const maxR = Math.max(dp.startRow, dp.endRow)
      const minC = Math.min(dp.startCol, dp.endCol)
      const maxC = Math.max(dp.startCol, dp.endCol)
      const width = maxC - minC + 1
      const height = maxR - minR + 1

      dispatch({ type: 'PUSH_HISTORY' })
      dispatch({ type: 'PLACE_ZONE', row: minR, col: minC, width, height })
    }

    isDraggingNew.current = false
    isDraggingMove.current = false
    dragStart.current = null
    dragMoveZoneId.current = null
    dragPreviewRef.current = null
  }, [dispatch])

  return {
    onCollisionPointerDown,
    onCollisionPointerMove,
    onCollisionPointerUp,
    dragPreviewRef,
  }
}

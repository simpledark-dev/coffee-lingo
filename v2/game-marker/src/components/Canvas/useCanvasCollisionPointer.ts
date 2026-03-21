import { useCallback, useRef, useState } from 'react'
import { useEditorState, useEditorDispatch } from '../../state/EditorContext'

export const COLLISION_CELL = 4 // pixels per collision grid cell

export type DragPreview = {
  startRow: number; startCol: number; endRow: number; endCol: number
} | null

export function useCanvasCollisionPointer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  const state = useEditorState()
  const dispatch = useEditorDispatch()

  const isDraggingMove = useRef(false)
  const dragMoveOffset = useRef<{ dRow: number; dCol: number }>({ dRow: 0, dCol: 0 })
  const dragMoveZoneId = useRef<string | null>(null)
  const historyPushed = useRef(false)

  // 2-click placement
  const clickStart = useRef<{ row: number; col: number } | null>(null)
  const dragPreviewRef = useRef<DragPreview>(null)

  // Tick to trigger renderer re-draw when preview ref changes
  const [renderTick, setRenderTick] = useState(0)

  const screenToGrid = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left - state.panX) / state.zoom
    const y = (clientY - rect.top - state.panY) / state.zoom
    return { row: Math.floor(y / COLLISION_CELL), col: Math.floor(x / COLLISION_CELL) }
  }, [canvasRef, state.panX, state.panY, state.zoom])

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
      dispatch({ type: 'SELECT_ZONE', zoneId: clickedZone.id })
      isDraggingMove.current = true
      dragMoveZoneId.current = clickedZone.id
      dragMoveOffset.current = { dRow: grid.row - clickedZone.row, dCol: grid.col - clickedZone.col }
      historyPushed.current = false
      return
    }

    if (state.selectedZoneDefType) {
      if (!clickStart.current) {
        // First click: set start point
        clickStart.current = grid
        dragPreviewRef.current = { startRow: grid.row, startCol: grid.col, endRow: grid.row, endCol: grid.col }
      } else {
        // Second click: finalize zone
        const start = clickStart.current
        const minR = Math.min(start.row, grid.row)
        const maxR = Math.max(start.row, grid.row)
        const minC = Math.min(start.col, grid.col)
        const maxC = Math.max(start.col, grid.col)
        const width = maxC - minC + 1
        const height = maxR - minR + 1

        dispatch({ type: 'PUSH_HISTORY' })
        dispatch({ type: 'PLACE_ZONE', row: minR, col: minC, width, height })

        clickStart.current = null
        dragPreviewRef.current = null
      }
      return
    }

    // Click empty space: deselect
    dispatch({ type: 'SELECT_ZONE', zoneId: null })
  }, [screenToGrid, state.zones, state.selectedZoneDefType, dispatch])

  const onCollisionPointerMove = useCallback((e: React.PointerEvent) => {
    const grid = screenToGrid(e.clientX, e.clientY)
    if (!grid) return

    // Update preview while waiting for second click
    if (clickStart.current && state.selectedZoneDefType) {
      const maxRow = (state.gridRows * state.tileSize / COLLISION_CELL) - 1
      const maxCol = (state.gridCols * state.tileSize / COLLISION_CELL) - 1
      dragPreviewRef.current = {
        startRow: clickStart.current.row,
        startCol: clickStart.current.col,
        endRow: Math.max(0, Math.min(maxRow, grid.row)),
        endCol: Math.max(0, Math.min(maxCol, grid.col)),
      }
      setRenderTick(t => t + 1)
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
  }, [screenToGrid, state.gridRows, state.gridCols, state.tileSize, state.selectedZoneDefType, dispatch])

  const onCollisionPointerUp = useCallback(() => {
    isDraggingMove.current = false
    dragMoveZoneId.current = null
  }, [])

  return {
    onCollisionPointerDown,
    onCollisionPointerMove,
    onCollisionPointerUp,
    dragPreviewRef,
    renderTick,
  }
}

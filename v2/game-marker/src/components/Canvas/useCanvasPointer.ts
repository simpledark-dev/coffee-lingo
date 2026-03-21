import { useCallback, useRef } from 'react'
import { useEditorState, useEditorDispatch } from '../../state/EditorContext'
import { tools } from '../../tools'

export function useCanvasPointer(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const isDrawing = useRef(false)
  const lastCell = useRef<string>('')
  const historyPushed = useRef(false)

  const screenToGrid = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left - state.panX) / state.zoom
    const y = (clientY - rect.top - state.panY) / state.zoom
    const col = Math.floor(x / state.tileSize)
    const row = Math.floor(y / state.tileSize)
    return { row, col }
  }, [canvasRef, state.panX, state.panY, state.zoom, state.tileSize])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return // left click only
    const grid = screenToGrid(e.clientX, e.clientY)
    if (!grid) return
    const { row, col } = grid
    if (row < 0 || row >= state.gridRows || col < 0 || col >= state.gridCols) return

    isDrawing.current = true
    historyPushed.current = false
    lastCell.current = `${row},${col}`
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    // Push history before first change
    dispatch({ type: 'PUSH_HISTORY' })
    historyPushed.current = true

    const tool = tools[state.activeTool]
    tool.onDown(row, col, state, dispatch)
  }, [screenToGrid, state, dispatch])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing.current) return
    const grid = screenToGrid(e.clientX, e.clientY)
    if (!grid) return
    const { row, col } = grid
    if (row < 0 || row >= state.gridRows || col < 0 || col >= state.gridCols) return

    const cellKey = `${row},${col}`
    if (cellKey === lastCell.current) return
    lastCell.current = cellKey

    const tool = tools[state.activeTool]
    tool.onMove(row, col, state, dispatch)
  }, [screenToGrid, state, dispatch])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    if (!isDrawing.current) return
    isDrawing.current = false

    const tool = tools[state.activeTool]
    tool.onUp(state, dispatch)
  }, [state, dispatch])

  return { onPointerDown, onPointerMove, onPointerUp }
}

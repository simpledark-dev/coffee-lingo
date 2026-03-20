import { useCallback, useRef, useState } from 'react'
import { useEditorState, useEditorDispatch } from '../../state/EditorContext'

export type HandleId = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const HANDLE_HIT = 12 // px hit area (in screen space)

const CURSORS: Record<HandleId, string> = {
  n: 'ns-resize', s: 'ns-resize',
  e: 'ew-resize', w: 'ew-resize',
  nw: 'nwse-resize', se: 'nwse-resize',
  ne: 'nesw-resize', sw: 'nesw-resize',
}

/** Get 8 handle positions in map-space coordinates */
function getHandlePositions(cols: number, rows: number, tileSize: number) {
  const w = cols * tileSize
  const h = rows * tileSize
  return {
    nw: { x: 0, y: 0 },
    n:  { x: w / 2, y: 0 },
    ne: { x: w, y: 0 },
    w:  { x: 0, y: h / 2 },
    e:  { x: w, y: h / 2 },
    sw: { x: 0, y: h },
    s:  { x: w / 2, y: h },
    se: { x: w, y: h },
  }
}

export function useCanvasResize(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const [hoveredHandle, setHoveredHandle] = useState<HandleId | null>(null)
  const isResizing = useRef(false)
  const activeHandle = useRef<HandleId | null>(null)
  const dragOrigin = useRef({ x: 0, y: 0 })
  const accumulated = useRef({ top: 0, right: 0, bottom: 0, left: 0 })

  const screenToMap = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left - state.panX) / state.zoom
    const y = (clientY - rect.top - state.panY) / state.zoom
    return { x, y }
  }, [canvasRef, state.panX, state.panY, state.zoom])

  const getHandleAt = useCallback((clientX: number, clientY: number): HandleId | null => {
    const pt = screenToMap(clientX, clientY)
    if (!pt) return null
    const handles = getHandlePositions(state.gridCols, state.gridRows, state.tileSize)
    const hitDist = HANDLE_HIT / state.zoom

    for (const [id, pos] of Object.entries(handles) as [HandleId, { x: number; y: number }][]) {
      if (Math.abs(pt.x - pos.x) < hitDist && Math.abs(pt.y - pos.y) < hitDist) {
        return id
      }
    }
    return null
  }, [screenToMap, state.gridCols, state.gridRows, state.tileSize, state.zoom])

  const updateHover = useCallback((clientX: number, clientY: number) => {
    const handle = getHandleAt(clientX, clientY)
    setHoveredHandle(handle)
    return handle
  }, [getHandleAt])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return false
    const handle = getHandleAt(e.clientX, e.clientY)
    if (!handle) return false

    e.preventDefault()
    e.stopPropagation()
    isResizing.current = true
    activeHandle.current = handle
    dragOrigin.current = { x: e.clientX, y: e.clientY }
    accumulated.current = { top: 0, right: 0, bottom: 0, left: 0 }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dispatch({ type: 'PUSH_HISTORY' })
    return true
  }, [getHandleAt, dispatch])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isResizing.current || !activeHandle.current) return false

    const handle = activeHandle.current
    const dx = (e.clientX - dragOrigin.current.x) / state.zoom
    const dy = (e.clientY - dragOrigin.current.y) / state.zoom
    const cellDx = Math.round(dx / state.tileSize)
    const cellDy = Math.round(dy / state.tileSize)

    let top = 0, right = 0, bottom = 0, left = 0

    // North components: dragging up = expand (positive top), dragging down = shrink (negative top)
    if (handle.includes('n')) top = -cellDy
    if (handle.includes('s')) bottom = cellDy
    if (handle.includes('w')) left = -cellDx
    if (handle.includes('e')) right = cellDx

    // Only dispatch if changed
    const a = accumulated.current
    if (top !== a.top || right !== a.right || bottom !== a.bottom || left !== a.left) {
      // Calculate delta from last accumulated
      const dt = top - a.top
      const dr = right - a.right
      const db = bottom - a.bottom
      const dl = left - a.left
      accumulated.current = { top, right, bottom, left }

      if (dt !== 0 || dr !== 0 || db !== 0 || dl !== 0) {
        dispatch({ type: 'RESIZE_MAP', top: dt, right: dr, bottom: db, left: dl })
        // Adjust pan when resizing from top/left so map stays visually stable
        if (dt !== 0 || dl !== 0) {
          dispatch({
            type: 'SET_PAN',
            x: state.panX - dl * state.tileSize * state.zoom,
            y: state.panY - dt * state.tileSize * state.zoom,
          })
        }
      }
    }

    return true
  }, [state.zoom, state.tileSize, state.panX, state.panY, dispatch])

  const onPointerUp = useCallback(() => {
    if (!isResizing.current) return false
    isResizing.current = false
    activeHandle.current = null
    return true
  }, [])

  const cursor = hoveredHandle ? CURSORS[hoveredHandle] : (isResizing.current && activeHandle.current ? CURSORS[activeHandle.current] : null)

  return {
    hoveredHandle,
    resizeCursor: cursor,
    isResizing: isResizing.current,
    updateHover,
    onResizePointerDown: onPointerDown,
    onResizePointerMove: onPointerMove,
    onResizePointerUp: onPointerUp,
    getHandlePositions: () => getHandlePositions(state.gridCols, state.gridRows, state.tileSize),
  }
}

import { useCallback, useRef } from 'react'
import { useEditorState, useEditorDispatch } from '../../state/EditorContext'

export function useCanvasPanZoom(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const isPanning = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Zoom toward cursor
    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const newZoom = Math.max(0.25, Math.min(4, state.zoom * zoomFactor))
    const scale = newZoom / state.zoom

    const newPanX = mouseX - (mouseX - state.panX) * scale
    const newPanY = mouseY - (mouseY - state.panY) * scale

    dispatch({ type: 'SET_ZOOM', zoom: newZoom })
    dispatch({ type: 'SET_PAN', x: newPanX, y: newPanY })
  }, [canvasRef, state.zoom, state.panX, state.panY, dispatch])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Middle mouse button for panning
    if (e.button === 1) {
      e.preventDefault()
      isPanning.current = true
      lastPan.current = { x: e.clientX, y: e.clientY }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    }
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return
    const dx = e.clientX - lastPan.current.x
    const dy = e.clientY - lastPan.current.y
    lastPan.current = { x: e.clientX, y: e.clientY }
    dispatch({ type: 'SET_PAN', x: state.panX + dx, y: state.panY + dy })
  }, [state.panX, state.panY, dispatch])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.button === 1) {
      isPanning.current = false
    }
  }, [])

  return { onWheel, onPanPointerDown: onPointerDown, onPanPointerMove: onPointerMove, onPanPointerUp: onPointerUp, isPanning }
}

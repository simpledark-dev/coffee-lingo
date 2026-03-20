import { useRef, useEffect, useState, useCallback } from 'react'
import { useEditorState, useEditorDispatch } from '../../state/EditorContext'
import { useCanvasRenderer } from './useCanvasRenderer'
import { useCanvasPanZoom } from './useCanvasPanZoom'
import { useCanvasPointer } from './useCanvasPointer'
import { useCanvasResize } from './useCanvasResize'
import { Minimap } from './Minimap'
import { tilesetImageStore } from '../TilePalette'

export function EditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })
  const centered = useRef(false)

  // Center map in viewport on first meaningful size
  useEffect(() => {
    if (centered.current || canvasSize.w === 0 || canvasSize.h === 0) return
    centered.current = true
    const mapW = state.gridCols * state.tileSize
    const mapH = state.gridRows * state.tileSize
    const padding = 40
    const fitZoom = Math.min(
      (canvasSize.w - padding * 2) / mapW,
      (canvasSize.h - padding * 2) / mapH,
      1,
    )
    const panX = (canvasSize.w - mapW * fitZoom) / 2
    const panY = (canvasSize.h - mapH * fitZoom) / 2
    dispatch({ type: 'SET_ZOOM', zoom: fitZoom })
    dispatch({ type: 'SET_PAN', x: panX, y: panY })
  }, [canvasSize, state.gridCols, state.gridRows, state.tileSize, dispatch])

  const screenToGrid = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left - state.panX) / state.zoom
    const y = (clientY - rect.top - state.panY) / state.zoom
    const col = Math.floor(x / state.tileSize)
    const row = Math.floor(y / state.tileSize)
    return { row, col }
  }, [state.panX, state.panY, state.zoom, state.tileSize])

  // Track container size
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setCanvasSize({ w: Math.round(width), h: Math.round(height) })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const {
    hoveredHandle, resizeCursor,
    updateHover,
    onResizePointerDown, onResizePointerMove, onResizePointerUp,
  } = useCanvasResize(canvasRef)

  useCanvasRenderer(canvasRef, tilesetImageStore, hoverCell, canvasSize, hoveredHandle)
  const { onWheel, onPanPointerDown, onPanPointerMove, onPanPointerUp } = useCanvasPanZoom(canvasRef)
  const { onPointerDown, onPointerMove, onPointerUp } = useCanvasPointer(canvasRef)

  const handlePointerDown = (e: React.PointerEvent) => {
    if (state.resizeMode && onResizePointerDown(e)) return
    onPanPointerDown(e)
    if (e.button === 0 && !state.resizeMode) onPointerDown(e)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (state.resizeMode) {
      if (onResizePointerMove(e)) return
      updateHover(e.clientX, e.clientY)
      onPanPointerMove(e)
      return
    }

    onPanPointerMove(e)
    onPointerMove(e)

    const grid = screenToGrid(e.clientX, e.clientY)
    if (grid && grid.row >= 0 && grid.row < state.gridRows && grid.col >= 0 && grid.col < state.gridCols) {
      setHoverCell(prev => {
        if (prev && prev.row === grid.row && prev.col === grid.col) return prev
        return grid
      })
    } else {
      setHoverCell(prev => prev === null ? prev : null)
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (state.resizeMode && onResizePointerUp()) return
    onPanPointerUp(e)
    onPointerUp(e)
  }

  const cursor = resizeCursor ?? 'crosshair'

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-neutral-950 relative" style={{ cursor }}>
      <canvas
        ref={canvasRef}
        style={{ width: canvasSize.w, height: canvasSize.h }}
        onWheel={onWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => { setHoverCell(null); updateHover(-9999, -9999) }}
        onContextMenu={e => e.preventDefault()}
      />
      <div className="absolute top-2 right-2 z-10">
        <Minimap tilesetImages={tilesetImageStore} canvasSize={canvasSize} />
      </div>
    </div>
  )
}

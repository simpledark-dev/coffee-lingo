import { useRef, useEffect, useState, useCallback } from 'react'
import { useEditorState, useEditorDispatch } from '../../state/EditorContext'
import { useCanvasRenderer } from './useCanvasRenderer'
import { useCanvasEntityRenderer } from './useCanvasEntityRenderer'
import { useCanvasPanZoom } from './useCanvasPanZoom'
import { useCanvasPointer } from './useCanvasPointer'
import { useCanvasEntityPointer } from './useCanvasEntityPointer'
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

  // Center map on first load
  useEffect(() => {
    if (centered.current || canvasSize.w === 0 || canvasSize.h === 0) return
    centered.current = true
    const mapW = state.gridCols * state.tileSize
    const mapH = state.gridRows * state.tileSize
    const padding = 40
    const fitZoom = Math.min((canvasSize.w - padding * 2) / mapW, (canvasSize.h - padding * 2) / mapH, 1)
    dispatch({ type: 'SET_ZOOM', zoom: fitZoom })
    dispatch({ type: 'SET_PAN', x: (canvasSize.w - mapW * fitZoom) / 2, y: (canvasSize.h - mapH * fitZoom) / 2 })
  }, [canvasSize, state.gridCols, state.gridRows, state.tileSize, dispatch])

  const screenToGrid = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left - state.panX) / state.zoom
    const y = (clientY - rect.top - state.panY) / state.zoom
    return { row: Math.floor(y / state.tileSize), col: Math.floor(x / state.tileSize) }
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
    hoveredHandle, resizeCursor, updateHover,
    onResizePointerDown, onResizePointerMove, onResizePointerUp,
  } = useCanvasResize(canvasRef)

  useCanvasRenderer(canvasRef, tilesetImageStore, hoverCell, canvasSize, hoveredHandle)
  useCanvasEntityRenderer(canvasRef, tilesetImageStore, hoverCell, canvasSize)

  const { onWheel, onPanPointerDown, onPanPointerMove, onPanPointerUp } = useCanvasPanZoom(canvasRef)
  const { onPointerDown: onTilePointerDown, onPointerMove: onTilePointerMove, onPointerUp: onTilePointerUp } = useCanvasPointer(canvasRef)
  const { onEntityPointerDown, onEntityPointerMove, onEntityPointerUp } = useCanvasEntityPointer(canvasRef)

  const isEntityMode = state.editorMode === 'entity'

  const handlePointerDown = (e: React.PointerEvent) => {
    if (state.resizeMode && onResizePointerDown(e)) return
    onPanPointerDown(e)
    if (e.button === 0 && !state.resizeMode) {
      if (isEntityMode) onEntityPointerDown(e)
      else onTilePointerDown(e)
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (state.resizeMode) {
      if (onResizePointerMove(e)) return
      updateHover(e.clientX, e.clientY)
      onPanPointerMove(e)
      return
    }

    onPanPointerMove(e)
    if (isEntityMode) onEntityPointerMove(e)
    else onTilePointerMove(e)

    // Track hover cell
    const grid = screenToGrid(e.clientX, e.clientY)
    if (grid && grid.row >= 0 && grid.row < state.gridRows && grid.col >= 0 && grid.col < state.gridCols) {
      setHoverCell(prev => (prev && prev.row === grid.row && prev.col === grid.col) ? prev : grid)
    } else {
      setHoverCell(prev => prev === null ? prev : null)
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (state.resizeMode && onResizePointerUp()) return
    onPanPointerUp(e)
    if (isEntityMode) onEntityPointerUp()
    else onTilePointerUp(e)
  }

  // Cursor logic
  let cursor = 'crosshair'
  if (resizeCursor) {
    cursor = resizeCursor
  } else if (isEntityMode && hoverCell) {
    // Check if hovering over an entity
    const onEntity = state.entities.some(e => {
      const def = state.entityDefs.find(d => d.type === e.type)
      if (!def) return false
      return hoverCell.row >= e.row && hoverCell.row < e.row + def.height &&
             hoverCell.col >= e.col && hoverCell.col < e.col + def.width
    })
    cursor = onEntity ? 'move' : 'crosshair'
  } else if (state.activeTool === 'select' && state.selection && hoverCell) {
    const { startRow, startCol, endRow, endCol } = state.selection
    const minR = Math.min(startRow, endRow), maxR = Math.max(startRow, endRow)
    const minC = Math.min(startCol, endCol), maxC = Math.max(startCol, endCol)
    if (hoverCell.row >= minR && hoverCell.row <= maxR && hoverCell.col >= minC && hoverCell.col <= maxC) {
      cursor = 'move'
    }
  }

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

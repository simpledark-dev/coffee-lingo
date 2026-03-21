import { useRef, useEffect, useState } from 'react'
import { useEditorState, useEditorDispatch } from '../../state/EditorContext'
import { CanvasManager } from './CanvasManager'
import { Minimap } from './Minimap'
import { useTilesetImages } from '../../state/TilesetContext'

export function EditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const managerRef = useRef<CanvasManager | null>(null)
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const tilesetImageStore = useTilesetImages()
  const [cursor, setCursor] = useState('crosshair')
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

  // Create manager
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const mgr = new CanvasManager(canvas, dispatch)
    managerRef.current = mgr
    mgr.start()
    return () => { mgr.destroy(); managerRef.current = null }
  }, [dispatch])

  // Sync state → manager
  useEffect(() => {
    managerRef.current?.syncState(state, tilesetImageStore)
  }, [state])

  // Track container size
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      const w = Math.round(width)
      const h = Math.round(height)
      setCanvasSize({ w, h })
      managerRef.current?.resize(w, h)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-neutral-950 relative" style={{ cursor }}>
      <canvas
        ref={canvasRef}
        style={{ width: canvasSize.w, height: canvasSize.h }}
        onWheel={e => managerRef.current?.onWheel(e.nativeEvent)}
        onPointerDown={e => managerRef.current?.onPointerDown(e.nativeEvent)}
        onPointerMove={e => { managerRef.current?.onPointerMove(e.nativeEvent); setCursor(managerRef.current?.getCursor() ?? 'crosshair') }}
        onPointerUp={e => managerRef.current?.onPointerUp(e.nativeEvent)}
        onPointerLeave={() => managerRef.current?.onPointerLeave()}
        onContextMenu={e => e.preventDefault()}
      />
      <div className="absolute top-2 right-2 z-10">
        <Minimap tilesetImages={tilesetImageStore} canvasSize={canvasSize} />
      </div>
    </div>
  )
}

import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { useTilesetConfigs, useTilesetImages, useTilesetLoading } from '../state/TilesetContext'
import { AssetPicker } from './AssetPicker'
import type { EditorState, EditorAction } from '../types/editor'
import type { Dispatch } from 'react'

export function TilePalette() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const configs = useTilesetConfigs()
  const tilesetImages = useTilesetImages()

  const loading = useTilesetLoading()
  const [activeTileset, setActiveTileset] = useState<string>('')

  // Set initial active tileset once configs load
  useEffect(() => {
    if (configs.length > 0 && !activeTileset) {
      setActiveTileset(configs[0].id)
    }
  }, [configs, activeTileset])

  const currentImage = tilesetImages.get(activeTileset)

  if (configs.length === 0) {
    return (
      <div className="h-full bg-neutral-800 border-t border-neutral-700 flex items-center justify-center text-neutral-500 text-xs">
        No tilesets. Upload tileset assets in the Asset Manager.
      </div>
    )
  }

  return (
    <div className="h-full bg-neutral-800 border-t border-neutral-700 flex flex-col">
      <div className="flex items-center px-2 pt-1 pb-1 shrink-0 gap-2">
        <AssetPicker
          value={activeTileset}
          onChange={id => { if (id) setActiveTileset(id) }}
          categories={['tileset']}
          placeholder="-- Tileset --"
        />
        {state.selectedBrush && (
          <span className="text-xs text-neutral-400">
            {state.selectedBrush.width}x{state.selectedBrush.height}
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {!loading && currentImage ? (
          <TileGrid tilesetId={activeTileset} image={currentImage} tileSize={state.tileSize} state={state} dispatch={dispatch} />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-neutral-500">
            {loading ? 'Loading tilesets...' : 'Select a tileset'}
          </div>
        )}
      </div>
    </div>
  )
}

function TileGrid({ tilesetId, image, tileSize, state, dispatch }: {
  tilesetId: string
  image: HTMLImageElement
  tileSize: number
  state: EditorState
  dispatch: Dispatch<EditorAction>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const cols = Math.floor(image.naturalWidth / tileSize)
  const rows = Math.ceil(image.naturalHeight / tileSize)

  // Pan / zoom state for palette
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })

  // Canvas size tracking
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })

  // Drag selection state
  const dragging = useRef(false)
  const dragStart = useRef({ r: 0, c: 0 })
  const [selRect, setSelRect] = useState<{ r1: number; c1: number; r2: number; c2: number } | null>(null)

  // Reset pan/zoom when tileset changes
  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setSelRect(null)
  }, [tilesetId])

  // Track container size
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setCanvasSize({ w: Math.round(width), h: Math.round(height) })
    })
    obs.observe(container)
    return () => obs.disconnect()
  }, [])

  // Convert screen coords to tile cell
  const screenToCell = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left - pan.x) / zoom
    const y = (clientY - rect.top - pan.y) / zoom
    const c = Math.floor(x / tileSize)
    const r = Math.floor(y / tileSize)
    if (c < 0 || c >= cols || r < 0 || r >= rows) return null
    return { r, c }
  }, [pan, zoom, tileSize, cols, rows])

  // Set canvas resolution only when size changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || canvasSize.w === 0) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.w * dpr
    canvas.height = canvasSize.h * dpr
  }, [canvasSize.w, canvasSize.h])

  // Draw
  const draw = useCallback((highlightOverride?: typeof selRect) => {
    const canvas = canvasRef.current
    if (!canvas || cols <= 0 || rows <= 0 || canvasSize.w === 0 || canvasSize.h === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h)

    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)
    ctx.imageSmoothingEnabled = false

    // Draw entire tileset image in one call
    ctx.drawImage(image, 0, 0)

    // Grid lines — only draw visible range
    const invZoom = 1 / zoom
    const startC = Math.max(0, Math.floor(-pan.x / zoom / tileSize))
    const startR = Math.max(0, Math.floor(-pan.y / zoom / tileSize))
    const endC = Math.min(cols, Math.ceil((-pan.x + canvasSize.w) / zoom / tileSize))
    const endR = Math.min(rows, Math.ceil((-pan.y + canvasSize.h) / zoom / tileSize))

    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = invZoom
    for (let r = startR; r <= endR; r++) {
      ctx.beginPath()
      ctx.moveTo(startC * tileSize, r * tileSize)
      ctx.lineTo(endC * tileSize, r * tileSize)
      ctx.stroke()
    }
    for (let c = startC; c <= endC; c++) {
      ctx.beginPath()
      ctx.moveTo(c * tileSize, startR * tileSize)
      ctx.lineTo(c * tileSize, endR * tileSize)
      ctx.stroke()
    }

    // Selection highlight
    const sel = highlightOverride ?? selRect
    if (sel) {
      const minR = Math.min(sel.r1, sel.r2)
      const maxR = Math.max(sel.r1, sel.r2)
      const minC = Math.min(sel.c1, sel.c2)
      const maxC = Math.max(sel.c1, sel.c2)
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2 / zoom
      ctx.strokeRect(
        minC * tileSize + 1, minR * tileSize + 1,
        (maxC - minC + 1) * tileSize - 2, (maxR - minR + 1) * tileSize - 2,
      )
      ctx.fillStyle = 'rgba(56,189,248,0.15)'
      ctx.fillRect(minC * tileSize, minR * tileSize, (maxC - minC + 1) * tileSize, (maxR - minR + 1) * tileSize)
    } else if (state.selectedTile && state.selectedTile.tilesetId === tilesetId && !state.selectedBrush) {
      const idx = state.selectedTile.tileIndex
      const sc = idx % cols
      const sr = Math.floor(idx / cols)
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2 / zoom
      ctx.strokeRect(sc * tileSize + 1, sr * tileSize + 1, tileSize - 2, tileSize - 2)
    }

    ctx.restore()
  }, [image, tilesetId, cols, rows, tileSize, zoom, pan, selRect, state.selectedTile, state.selectedBrush, canvasSize])

  useEffect(() => { draw() }, [draw])

  // ── Wheel zoom ──
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const newZoom = Math.max(0.25, Math.min(6, zoom * factor))
    const scale = newZoom / zoom
    setPan({ x: mx - (mx - pan.x) * scale, y: my - (my - pan.y) * scale })
    setZoom(newZoom)
  }, [zoom, pan])

  // ── Pointer events ──
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Middle button = pan
    if (e.button === 1) {
      e.preventDefault()
      isPanning.current = true
      lastPan.current = { x: e.clientX, y: e.clientY }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      return
    }
    // Left button = select tiles
    if (e.button === 0) {
      const cell = screenToCell(e.clientX, e.clientY)
      if (!cell) return
      dragging.current = true
      dragStart.current = cell
      setSelRect({ r1: cell.r, c1: cell.c, r2: cell.r, c2: cell.c })
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    }
  }, [screenToCell])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - lastPan.current.x
      const dy = e.clientY - lastPan.current.y
      lastPan.current = { x: e.clientX, y: e.clientY }
      setPan(p => ({ x: p.x + dx, y: p.y + dy }))
      return
    }
    if (dragging.current) {
      const cell = screenToCell(e.clientX, e.clientY)
      if (!cell) return
      const newSel = { r1: dragStart.current.r, c1: dragStart.current.c, r2: cell.r, c2: cell.c }
      setSelRect(newSel)
      draw(newSel)
    }
  }, [screenToCell, draw])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.button === 1) { isPanning.current = false; return }
    if (!dragging.current) return
    dragging.current = false
    const cell = screenToCell(e.clientX, e.clientY)
    if (cell) {
      const r1 = dragStart.current.r, c1 = dragStart.current.c
      const r2 = cell.r, c2 = cell.c
      const minR = Math.min(r1, r2), maxR = Math.max(r1, r2)
      const minC = Math.min(c1, c2), maxC = Math.max(c1, c2)
      const w = maxC - minC + 1, h = maxR - minR + 1

      if (w === 1 && h === 1) {
        dispatch({ type: 'SELECT_TILE', tile: { tilesetId, tileIndex: minR * cols + minC } })
        setSelRect(null)
      } else {
        const tiles: (number | null)[][] = []
        for (let r = 0; r < h; r++) {
          const row: (number | null)[] = []
          for (let c = 0; c < w; c++) row.push((minR + r) * cols + (minC + c))
          tiles.push(row)
        }
        dispatch({ type: 'SELECT_BRUSH', brush: { tilesetId, tiles, width: w, height: h } })
        setSelRect({ r1: minR, c1: minC, r2: maxR, c2: maxC })
      }
    }
  }, [screenToCell, cols, tilesetId, dispatch])

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden cursor-crosshair">
      <canvas
        ref={canvasRef}
        style={{ width: canvasSize.w, height: canvasSize.h }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={e => e.preventDefault()}
      />
    </div>
  )
}

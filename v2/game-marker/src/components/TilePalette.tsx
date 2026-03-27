import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { useTilesetConfigs, useTilesetImages, useTilesetLoading, useTilesetNames } from '../state/TilesetContext'
import { useEntityContext } from '../state/EntityContext'
import { AssetPicker } from './AssetPicker'
import { useToast } from './Toast'
import { X } from 'lucide-react'
import type { EditorState, EditorAction } from '../types/editor'
import type { EntityVisual } from '../types/entity'
import type { Dispatch } from 'react'

export function TilePalette() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const configs = useTilesetConfigs()
  const tilesetImages = useTilesetImages()
  const tilesetNames = useTilesetNames()
  const { addEntityDef } = useEntityContext()
  const toast = useToast()

  const handleCreateEntity = useCallback(async (info: { tilesetId: string; tileIndex: number; width: number; height: number }) => {
    const id = Math.random().toString(36).slice(2, 6).toUpperCase()
    const visual: EntityVisual = { mode: 'static', assetId: info.tilesetId, tileIndex: info.tileIndex, width: info.width, height: info.height }
    await addEntityDef({
      name: `Entity ${id}`,
      type: '', tags: [], description: '',
      states: { default: visual },
      defaultState: 'default',
      properties: {},
    })
    toast(`Created Entity ${id}`, 'success')
  }, [addEntityDef, toast])

  const loading = useTilesetLoading()
  const [activeTileset, setActiveTilesetRaw] = useState<string>(() => {
    try { return sessionStorage.getItem('tilePalette:active') ?? '' } catch { return '' }
  })
  // Pinned tabs — tileset IDs the user has opened as tabs
  const [tabs, setTabsRaw] = useState<string[]>(() => {
    try {
      const raw = sessionStorage.getItem('tilePalette:tabs')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })
  const tabBarRef = useRef<HTMLDivElement>(null)

  // Wrap setters to persist
  const setActiveTileset = useCallback((id: string) => {
    setActiveTilesetRaw(id)
    try { sessionStorage.setItem('tilePalette:active', id) } catch { /* */ }
  }, [])

  const setTabs = useCallback((update: string[] | ((prev: string[]) => string[])) => {
    setTabsRaw(prev => {
      const next = typeof update === 'function' ? update(prev) : update
      try { sessionStorage.setItem('tilePalette:tabs', JSON.stringify(next)) } catch { /* */ }
      return next
    })
  }, [])

  // Set initial active tileset once configs load
  useEffect(() => {
    if (configs.length > 0 && !activeTileset) {
      setActiveTileset(configs[0].id)
    }
  }, [configs, activeTileset, setActiveTileset])

  // Auto-add active tileset to tabs if not already there
  useEffect(() => {
    if (activeTileset && !tabs.includes(activeTileset)) {
      setTabs(prev => [...prev, activeTileset])
    }
  }, [activeTileset]) // eslint-disable-line react-hooks/exhaustive-deps

  // Remove tabs whose tileset no longer exists (skip while loading)
  useEffect(() => {
    if (loading || configs.length === 0) return
    const validIds = new Set(configs.map(c => c.id))
    setTabs(prev => {
      const next = prev.filter(id => validIds.has(id))
      return next.length !== prev.length ? next : prev
    })
  }, [configs, setTabs, loading])

  const handleCloseTab = (id: string) => {
    setTabs(prev => prev.filter(t => t !== id))
    if (activeTileset === id) {
      // Switch to an adjacent tab or first remaining
      const idx = tabs.indexOf(id)
      const remaining = tabs.filter(t => t !== id)
      setActiveTileset(remaining[Math.min(idx, remaining.length - 1)] ?? '')
    }
  }

  const handlePickerChange = (id: string) => {
    if (!id) return
    setActiveTileset(id)
    // tab will be auto-added by the effect above
  }

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
      {/* Asset picker row */}
      <div className="flex items-center px-2 pt-1 pb-1 shrink-0 gap-2">
        <AssetPicker
          value={activeTileset}
          onChange={handlePickerChange}
          categories={['tileset']}
          placeholder="-- Tileset --"
        />
        {state.selectedBrush && (
          <span className="text-xs text-neutral-400">
            {state.selectedBrush.width}x{state.selectedBrush.height}
          </span>
        )}
      </div>

      {/* Tab bar */}
      {tabs.length > 0 && (
        <div
          ref={tabBarRef}
          className="flex shrink-0 overflow-x-auto border-b border-neutral-700 bg-neutral-850 scrollbar-none"
          onWheel={e => {
            // Horizontal scroll on wheel
            if (tabBarRef.current) tabBarRef.current.scrollLeft += e.deltaY
          }}
        >
          {tabs.map(id => {
            const name = tilesetNames.get(id) ?? id.slice(0, 8)
            const isActive = id === activeTileset
            return (
              <button
                key={id}
                onClick={() => setActiveTileset(id)}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] shrink-0 border-r border-neutral-700/50 ${
                  isActive
                    ? 'bg-neutral-800 text-neutral-100 border-b-2 border-b-sky-500'
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
                }`}
              >
                <span className="truncate max-w-24">{name}</span>
                {tabs.length > 1 && (
                  <span
                    onClick={e => { e.stopPropagation(); handleCloseTab(id) }}
                    className="p-0.5 rounded hover:bg-neutral-600/50 text-neutral-600 hover:text-neutral-300"
                  >
                    <X size={9} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex-1 min-h-0">
        {!loading && currentImage ? (
          <TileGrid tilesetId={activeTileset} image={currentImage} tileSize={state.tileSize} state={state} dispatch={dispatch} onCreateEntity={handleCreateEntity} />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-neutral-500">
            {loading ? 'Loading tilesets...' : 'Select a tileset'}
          </div>
        )}
      </div>
    </div>
  )
}

function TileGrid({ tilesetId, image, tileSize, state, dispatch, onCreateEntity }: {
  tilesetId: string
  image: HTMLImageElement
  tileSize: number
  state: EditorState
  dispatch: Dispatch<EditorAction>
  onCreateEntity?: (info: { tilesetId: string; tileIndex: number; width: number; height: number }) => void
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

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; info: { tilesetId: string; tileIndex: number; width: number; height: number } } | null>(null)

  // Close menu on click outside
  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [contextMenu])

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden cursor-crosshair relative">
      <canvas
        ref={canvasRef}
        style={{ width: canvasSize.w, height: canvasSize.h }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={e => {
          e.preventDefault()
          if (!onCreateEntity) return
          let info: { tilesetId: string; tileIndex: number; width: number; height: number } | null = null
          if (selRect) {
            const minR = Math.min(selRect.r1, selRect.r2), minC = Math.min(selRect.c1, selRect.c2)
            const w = Math.abs(selRect.c2 - selRect.c1) + 1, h = Math.abs(selRect.r2 - selRect.r1) + 1
            info = { tilesetId, tileIndex: minR * cols + minC, width: w, height: h }
          } else if (state.selectedTile && state.selectedTile.tilesetId === tilesetId) {
            info = { tilesetId, tileIndex: state.selectedTile.tileIndex, width: 1, height: 1 }
          }
          if (info) {
            const rect = containerRef.current?.getBoundingClientRect()
            setContextMenu({ x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0), info })
          }
        }}
      />
      {contextMenu && (
        <div
          className="absolute z-50 bg-neutral-800 border border-neutral-600 shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={e => e.stopPropagation()}
        >
          <button
            onClick={() => { onCreateEntity?.(contextMenu.info); setContextMenu(null) }}
            className="w-full text-left px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-700 flex items-center gap-2"
          >
            Create Entity ({contextMenu.info.width}x{contextMenu.info.height})
          </button>
        </div>
      )}
    </div>
  )
}

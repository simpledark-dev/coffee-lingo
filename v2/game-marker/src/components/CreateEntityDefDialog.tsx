import { useState, useRef, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { useTilesetConfigs, useTilesetImages, useTilesetNames } from '../state/TilesetContext'
import type { EntityDef } from '../types/entity'

export function CreateEntityDefDialog() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const [typeName, setTypeName] = useState('')
  const tilesetConfigs = useTilesetConfigs()
  const tilesetNames = useTilesetNames()
  const [activeTileset, setActiveTileset] = useState(tilesetConfigs[0]?.id ?? '')
  const [selection, setSelection] = useState<{ tileIndex: number; w: number; h: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!state.createEntityDefDialogOpen) return null

  const close = () => {
    dispatch({ type: 'SET_CREATE_ENTITY_DEF_DIALOG', open: false })
    setTypeName('')
    setSelection(null)
    setError(null)
  }

  const handleSave = () => {
    if (!typeName.trim()) { setError('Type name required'); return }
    if (state.entityDefs.some(d => d.type === typeName.trim())) { setError('Type already exists'); return }
    if (!selection) { setError('Drag to select a tile region'); return }

    const def: EntityDef = {
      type: typeName.trim(),
      tilesetId: activeTileset,
      tileIndex: selection.tileIndex,
      width: selection.w,
      height: selection.h,
      properties: {},
    }
    dispatch({ type: 'ADD_ENTITY_DEF', def })
    close()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={close}>
      <div className="bg-neutral-800 border border-neutral-600 w-[600px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-700">
          <span className="text-sm font-bold uppercase tracking-wider">New Entity Type</span>
          <button onClick={close} className="text-neutral-400 hover:text-neutral-100"><X size={16} /></button>
        </div>

        <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1 min-h-0">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-neutral-400 block mb-1">Type Name</label>
              <input
                value={typeName}
                onChange={e => { setTypeName(e.target.value); setError(null) }}
                placeholder="tree, table, npc_spawn..."
                className="w-full bg-neutral-900 border border-neutral-700 text-xs text-neutral-100 px-2 py-1.5 placeholder-neutral-600"
                autoFocus
              />
            </div>
            {selection && (
              <div className="text-xs text-neutral-400 self-end pb-1">
                Size: {selection.w}x{selection.h}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs text-neutral-400">Tileset</label>
              <select
                value={activeTileset}
                onChange={e => { setActiveTileset(e.target.value); setSelection(null) }}
                className="flex-1 bg-neutral-900 border border-neutral-700 text-xs text-neutral-100 px-2 py-1"
              >
                {tilesetConfigs.map(t => <option key={t.id} value={t.id}>{tilesetNames.get(t.id) ?? t.id}</option>)}
              </select>
            </div>
            <div className="text-[10px] text-neutral-500 mb-1">Drag to select region. Scroll to zoom. Right-click drag to pan.</div>
            <EntityTilePicker
              tilesetId={activeTileset}
              tileSize={state.tileSize}
              selection={selection}
              onSelect={setSelection}
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-neutral-700">
          <button onClick={close} className="flex-1 py-1.5 text-xs bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 text-neutral-300">
            Cancel
          </button>
          <button onClick={handleSave} className="flex-1 py-1.5 text-xs bg-sky-700 hover:bg-sky-600 border border-sky-600 text-white">
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

function EntityTilePicker({ tilesetId, tileSize, selection, onSelect }: {
  tilesetId: string
  tileSize: number
  selection: { tileIndex: number; w: number; h: number } | null
  onSelect: (sel: { tileIndex: number; w: number; h: number }) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tilesetImages = useTilesetImages()
  const image = tilesetImages.get(tilesetId)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  // Pan state
  const isPanning = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })

  // Drag select state
  const isDragging = useRef(false)
  const dragStart = useRef({ r: 0, c: 0 })
  const [dragRect, setDragRect] = useState<{ r1: number; c1: number; r2: number; c2: number } | null>(null)

  const cols = image ? Math.floor(image.naturalWidth / tileSize) : 0
  const rows = image ? Math.ceil(image.naturalHeight / tileSize) : 0

  // Reset on tileset change
  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setDragRect(null)
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

  // Compute highlight rect from selection prop
  const highlightRect = (() => {
    if (dragRect) return dragRect
    if (!selection || cols <= 0) return null
    const c1 = selection.tileIndex % cols
    const r1 = Math.floor(selection.tileIndex / cols)
    return { r1, c1, r2: r1 + selection.h - 1, c2: c1 + selection.w - 1 }
  })()

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !image || cols <= 0 || canvasSize.w === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.w * dpr
    canvas.height = canvasSize.h * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h)

    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)
    ctx.imageSmoothingEnabled = false

    // Tiles
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.drawImage(image, c * tileSize, r * tileSize, tileSize, tileSize, c * tileSize, r * tileSize, tileSize, tileSize)
      }
    }

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 1 / zoom
    for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * tileSize); ctx.lineTo(cols * tileSize, r * tileSize); ctx.stroke() }
    for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(c * tileSize, 0); ctx.lineTo(c * tileSize, rows * tileSize); ctx.stroke() }

    // Selection highlight
    if (highlightRect) {
      const minR = Math.min(highlightRect.r1, highlightRect.r2)
      const maxR = Math.max(highlightRect.r1, highlightRect.r2)
      const minC = Math.min(highlightRect.c1, highlightRect.c2)
      const maxC = Math.max(highlightRect.c1, highlightRect.c2)
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2 / zoom
      ctx.strokeRect(minC * tileSize + 1, minR * tileSize + 1, (maxC - minC + 1) * tileSize - 2, (maxR - minR + 1) * tileSize - 2)
      ctx.fillStyle = 'rgba(56,189,248,0.2)'
      ctx.fillRect(minC * tileSize, minR * tileSize, (maxC - minC + 1) * tileSize, (maxR - minR + 1) * tileSize)
    }

    ctx.restore()
  }, [image, cols, rows, tileSize, zoom, pan, canvasSize, highlightRect])

  useEffect(() => { draw() }, [draw])

  // Wheel zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const nz = Math.max(0.25, Math.min(8, zoom * factor))
    const s = nz / zoom
    setPan({ x: mx - (mx - pan.x) * s, y: my - (my - pan.y) * s })
    setZoom(nz)
  }, [zoom, pan])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Right-click = pan
    if (e.button === 2 || e.button === 1) {
      e.preventDefault()
      isPanning.current = true
      lastPan.current = { x: e.clientX, y: e.clientY }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      return
    }
    // Left-click = drag select
    if (e.button === 0) {
      const cell = screenToCell(e.clientX, e.clientY)
      if (!cell) return
      isDragging.current = true
      dragStart.current = cell
      setDragRect({ r1: cell.r, c1: cell.c, r2: cell.r, c2: cell.c })
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
    if (isDragging.current) {
      const cell = screenToCell(e.clientX, e.clientY)
      if (!cell) return
      setDragRect({ r1: dragStart.current.r, c1: dragStart.current.c, r2: cell.r, c2: cell.c })
    }
  }, [screenToCell])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.button === 2 || e.button === 1) { isPanning.current = false; return }
    if (!isDragging.current) return
    isDragging.current = false
    const cell = screenToCell(e.clientX, e.clientY)
    if (cell) {
      const r1 = dragStart.current.r, c1 = dragStart.current.c
      const minR = Math.min(r1, cell.r), maxR = Math.max(r1, cell.r)
      const minC = Math.min(c1, cell.c), maxC = Math.max(c1, cell.c)
      const w = maxC - minC + 1
      const h = maxR - minR + 1
      onSelect({ tileIndex: minR * cols + minC, w, h })
    }
    setDragRect(null)
  }, [screenToCell, cols, onSelect])

  if (!image) return <div className="text-xs text-neutral-500 p-2">No tileset loaded</div>

  return (
    <div ref={containerRef} className="flex-1 min-h-[350px] overflow-hidden border border-neutral-700 cursor-crosshair">
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

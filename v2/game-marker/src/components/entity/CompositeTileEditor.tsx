import { useState, useRef, useEffect, useCallback } from 'react'
import { useTilesetImages } from '../../state/TilesetContext'
import { getAssetBlobUrl } from '../../storage/blobUrlCache'
import { Eraser, Paintbrush, Trash2 } from 'lucide-react'
import type { EntityVisual } from '../../types/entity'

/** Brush: single tile or multi-tile region from palette */
interface Brush {
  /** Top-left tile index in the sheet */
  tileIndex: number
  /** 2D grid of tile indices [row][col] */
  tiles: number[][]
  width: number
  height: number
}

export function CompositeTileEditor({ visual, tileSize, onChange }: {
  visual: EntityVisual
  tileSize: number
  onChange: (tiles: (number | null)[][]) => void
}) {
  const entityTiles = visual.tiles!
  const { width, height } = visual

  const [brush, setBrush] = useState<Brush | null>(null)
  const [tool, setTool] = useState<'paint' | 'erase'>('paint')

  // Grid canvas
  const gridCanvasRef = useRef<HTMLCanvasElement>(null)
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const [gridSize, setGridSize] = useState({ w: 0, h: 0 })
  const [gridZoom, setGridZoom] = useState(2)
  const [gridPan, setGridPan] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })
  const isDrawing = useRef(false)
  const [hoverCell, setHoverCell] = useState<{ r: number; c: number } | null>(null)

  // Palette canvas
  const paletteCanvasRef = useRef<HTMLCanvasElement>(null)
  const paletteContainerRef = useRef<HTMLDivElement>(null)
  const [paletteSize, setPaletteSize] = useState({ w: 0, h: 0 })
  const [paletteZoom, setPaletteZoom] = useState(1)
  const [palettePan, setPalettePan] = useState({ x: 0, y: 0 })
  const isPalettePanning = useRef(false)
  const lastPalettePan = useRef({ x: 0, y: 0 })

  // Palette drag selection
  const paletteDragging = useRef(false)
  const paletteDragStart = useRef({ r: 0, c: 0 })
  const [paletteSelRect, setPaletteSelRect] = useState<{ r1: number; c1: number; r2: number; c2: number } | null>(null)

  // Resizable divider
  const [paletteWidth, setPaletteWidth] = useState(500)
  const isDividerDragging = useRef(false)

  // Load image
  const tilesetImages = useTilesetImages()
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const cached = tilesetImages.get(visual.assetId)
    if (cached) { setImage(cached); return }
    let cancelled = false
    getAssetBlobUrl(visual.assetId).then(url => {
      if (cancelled) return
      const img = new Image()
      img.onload = () => { if (!cancelled) setImage(img) }
      img.src = url
    }).catch(() => {})
    return () => { cancelled = true }
  }, [visual.assetId, tilesetImages])

  const cols = image ? Math.floor(image.naturalWidth / tileSize) : 0
  const rows = image ? Math.floor(image.naturalHeight / tileSize) : 0

  // Track container sizes
  useEffect(() => {
    const g = gridContainerRef.current
    if (!g) return
    const obs = new ResizeObserver(entries => {
      const { width: w, height: h } = entries[0].contentRect
      setGridSize({ w: Math.round(w), h: Math.round(h) })
    })
    obs.observe(g)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const p = paletteContainerRef.current
    if (!p) return
    const obs = new ResizeObserver(entries => {
      const { width: w, height: h } = entries[0].contentRect
      setPaletteSize({ w: Math.round(w), h: Math.round(h) })
    })
    obs.observe(p)
    return () => obs.disconnect()
  }, [])

  // Grid cell from screen coords
  const gridScreenToCell = useCallback((clientX: number, clientY: number) => {
    const canvas = gridCanvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left - gridPan.x) / gridZoom
    const y = (clientY - rect.top - gridPan.y) / gridZoom
    const c = Math.floor(x / tileSize)
    const r = Math.floor(y / tileSize)
    if (c < 0 || c >= width || r < 0 || r >= height) return null
    return { r, c }
  }, [gridPan, gridZoom, tileSize, width, height])

  // Palette cell from screen coords
  const paletteScreenToCell = useCallback((clientX: number, clientY: number) => {
    const canvas = paletteCanvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left - palettePan.x) / paletteZoom
    const y = (clientY - rect.top - palettePan.y) / paletteZoom
    const c = Math.floor(x / tileSize)
    const r = Math.floor(y / tileSize)
    if (c < 0 || c >= cols || r < 0 || r >= rows) return null
    return { r, c }
  }, [palettePan, paletteZoom, tileSize, cols, rows])

  // Paint at cell with current brush
  const paintAt = useCallback((r: number, c: number) => {
    if (tool === 'erase') {
      if (entityTiles[r]?.[c] == null) return
      const newTiles = entityTiles.map((row, ri) =>
        ri === r ? row.map((cell, ci) => ci === c ? null : cell) : row
      )
      onChange(newTiles)
      return
    }
    if (!brush) return
    const newTiles = entityTiles.map(row => [...row])
    for (let dr = 0; dr < brush.height; dr++) {
      for (let dc = 0; dc < brush.width; dc++) {
        const tr = r + dr, tc = c + dc
        if (tr >= 0 && tr < height && tc >= 0 && tc < width) {
          newTiles[tr][tc] = brush.tiles[dr][dc]
        }
      }
    }
    onChange(newTiles)
  }, [tool, brush, entityTiles, onChange, width, height])

  // ── Draw grid canvas ──
  const drawGrid = useCallback(() => {
    const canvas = gridCanvasRef.current
    if (!canvas || gridSize.w === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = gridSize.w * dpr
    canvas.height = gridSize.h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, gridSize.w, gridSize.h)

    ctx.save()
    ctx.translate(gridPan.x, gridPan.y)
    ctx.scale(gridZoom, gridZoom)
    ctx.imageSmoothingEnabled = false

    // Checkerboard bg
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#1e1e32' : '#16162a'
        ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize)
      }
    }

    // Draw placed tiles
    if (image && cols > 0) {
      for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
          const ti = entityTiles[r]?.[c]
          if (ti == null) continue
          const sc = ti % cols, sr = Math.floor(ti / cols)
          ctx.drawImage(image, sc * tileSize, sr * tileSize, tileSize, tileSize, c * tileSize, r * tileSize, tileSize, tileSize)
        }
      }
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1 / gridZoom
    for (let r = 0; r <= height; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * tileSize); ctx.lineTo(width * tileSize, r * tileSize); ctx.stroke()
    }
    for (let c = 0; c <= width; c++) {
      ctx.beginPath(); ctx.moveTo(c * tileSize, 0); ctx.lineTo(c * tileSize, height * tileSize); ctx.stroke()
    }

    // Hover ghost preview
    if (hoverCell && tool === 'paint' && brush && image && cols > 0) {
      ctx.globalAlpha = 0.5
      for (let dr = 0; dr < brush.height; dr++) {
        for (let dc = 0; dc < brush.width; dc++) {
          const tr = hoverCell.r + dr, tc = hoverCell.c + dc
          if (tr < height && tc < width) {
            const ti = brush.tiles[dr][dc]
            const sc = ti % cols, sr = Math.floor(ti / cols)
            ctx.drawImage(image, sc * tileSize, sr * tileSize, tileSize, tileSize, tc * tileSize, tr * tileSize, tileSize, tileSize)
          }
        }
      }
      ctx.globalAlpha = 1
      // Brush outline
      ctx.strokeStyle = 'rgba(56,189,248,0.5)'
      ctx.lineWidth = 2 / gridZoom
      const bw = Math.min(brush.width, width - hoverCell.c), bh = Math.min(brush.height, height - hoverCell.r)
      ctx.strokeRect(hoverCell.c * tileSize, hoverCell.r * tileSize, bw * tileSize, bh * tileSize)
    } else if (hoverCell) {
      ctx.fillStyle = 'rgba(56,189,248,0.2)'
      ctx.fillRect(hoverCell.c * tileSize, hoverCell.r * tileSize, tileSize, tileSize)
    }

    // Border
    ctx.strokeStyle = 'rgba(56,189,248,0.4)'
    ctx.lineWidth = 2 / gridZoom
    ctx.strokeRect(0, 0, width * tileSize, height * tileSize)

    ctx.restore()
  }, [gridSize, gridPan, gridZoom, tileSize, width, height, entityTiles, image, cols, hoverCell, tool, brush])

  useEffect(() => { drawGrid() }, [drawGrid])

  // ── Draw palette canvas ──
  const drawPalette = useCallback(() => {
    const canvas = paletteCanvasRef.current
    if (!canvas || !image || paletteSize.w === 0 || cols <= 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = paletteSize.w * dpr
    canvas.height = paletteSize.h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, paletteSize.w, paletteSize.h)

    ctx.save()
    ctx.translate(palettePan.x, palettePan.y)
    ctx.scale(paletteZoom, paletteZoom)
    ctx.imageSmoothingEnabled = false

    ctx.drawImage(image, 0, 0)

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 1 / paletteZoom
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * tileSize); ctx.lineTo(cols * tileSize, r * tileSize); ctx.stroke()
    }
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath(); ctx.moveTo(c * tileSize, 0); ctx.lineTo(c * tileSize, rows * tileSize); ctx.stroke()
    }

    // Selection highlight
    const sel = paletteSelRect
    if (sel) {
      const minR = Math.min(sel.r1, sel.r2), maxR = Math.max(sel.r1, sel.r2)
      const minC = Math.min(sel.c1, sel.c2), maxC = Math.max(sel.c1, sel.c2)
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2 / paletteZoom
      ctx.strokeRect(minC * tileSize + 1, minR * tileSize + 1, (maxC - minC + 1) * tileSize - 2, (maxR - minR + 1) * tileSize - 2)
      ctx.fillStyle = 'rgba(56,189,248,0.15)'
      ctx.fillRect(minC * tileSize, minR * tileSize, (maxC - minC + 1) * tileSize, (maxR - minR + 1) * tileSize)
    } else if (brush) {
      // Highlight single-tile brush
      const sc = brush.tileIndex % cols, sr = Math.floor(brush.tileIndex / cols)
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2 / paletteZoom
      ctx.strokeRect(sc * tileSize + 1, sr * tileSize + 1, brush.width * tileSize - 2, brush.height * tileSize - 2)
    }

    ctx.restore()
  }, [paletteSize, palettePan, paletteZoom, tileSize, image, cols, rows, brush, paletteSelRect])

  useEffect(() => { drawPalette() }, [drawPalette])

  // ── Grid events ──
  const onGridWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const rect = gridCanvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const nz = Math.max(0.5, Math.min(10, gridZoom * factor))
    const scale = nz / gridZoom
    setGridPan({ x: mx - (mx - gridPan.x) * scale, y: my - (my - gridPan.y) * scale })
    setGridZoom(nz)
  }, [gridZoom, gridPan])

  const onGridPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1) {
      isPanning.current = true
      lastPan.current = { x: e.clientX, y: e.clientY }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      return
    }
    if (e.button === 0) {
      const cell = gridScreenToCell(e.clientX, e.clientY)
      if (!cell) return
      isDrawing.current = true
      paintAt(cell.r, cell.c)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    }
  }, [gridScreenToCell, paintAt])

  const onGridPointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - lastPan.current.x, dy = e.clientY - lastPan.current.y
      lastPan.current = { x: e.clientX, y: e.clientY }
      setGridPan(p => ({ x: p.x + dx, y: p.y + dy }))
      return
    }
    const cell = gridScreenToCell(e.clientX, e.clientY)
    setHoverCell(cell)
    if (isDrawing.current && cell) paintAt(cell.r, cell.c)
  }, [gridScreenToCell, paintAt])

  const onGridPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.button === 1) isPanning.current = false
    isDrawing.current = false
  }, [])

  // ── Palette events (drag selection like TilePalette) ──
  const onPaletteWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const rect = paletteCanvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const nz = Math.max(0.25, Math.min(6, paletteZoom * factor))
    const scale = nz / paletteZoom
    setPalettePan({ x: mx - (mx - palettePan.x) * scale, y: my - (my - palettePan.y) * scale })
    setPaletteZoom(nz)
  }, [paletteZoom, palettePan])

  const onPalettePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1) {
      isPalettePanning.current = true
      lastPalettePan.current = { x: e.clientX, y: e.clientY }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      return
    }
    if (e.button === 0) {
      const cell = paletteScreenToCell(e.clientX, e.clientY)
      if (!cell) return
      paletteDragging.current = true
      paletteDragStart.current = cell
      setPaletteSelRect({ r1: cell.r, c1: cell.c, r2: cell.r, c2: cell.c })
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    }
  }, [paletteScreenToCell])

  const onPalettePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPalettePanning.current) {
      const dx = e.clientX - lastPalettePan.current.x, dy = e.clientY - lastPalettePan.current.y
      lastPalettePan.current = { x: e.clientX, y: e.clientY }
      setPalettePan(p => ({ x: p.x + dx, y: p.y + dy }))
      return
    }
    if (paletteDragging.current) {
      const cell = paletteScreenToCell(e.clientX, e.clientY)
      if (cell) {
        setPaletteSelRect({ r1: paletteDragStart.current.r, c1: paletteDragStart.current.c, r2: cell.r, c2: cell.c })
      }
    }
  }, [paletteScreenToCell])

  const onPalettePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.button === 1) { isPalettePanning.current = false; return }
    if (!paletteDragging.current) return
    paletteDragging.current = false

    const cell = paletteScreenToCell(e.clientX, e.clientY)
    if (!cell) { setPaletteSelRect(null); return }

    const r1 = paletteDragStart.current.r, c1 = paletteDragStart.current.c
    const minR = Math.min(r1, cell.r), maxR = Math.max(r1, cell.r)
    const minC = Math.min(c1, cell.c), maxC = Math.max(c1, cell.c)
    const bw = maxC - minC + 1, bh = maxR - minR + 1

    // Build brush tiles grid
    const brushTiles: number[][] = []
    for (let r = 0; r < bh; r++) {
      const row: number[] = []
      for (let c = 0; c < bw; c++) {
        row.push((minR + r) * cols + (minC + c))
      }
      brushTiles.push(row)
    }

    setBrush({ tileIndex: minR * cols + minC, tiles: brushTiles, width: bw, height: bh })
    setPaletteSelRect({ r1: minR, c1: minC, r2: maxR, c2: maxC })
    setTool('paint')
  }, [paletteScreenToCell, cols])

  // ── Divider drag ──
  const onDividerPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    isDividerDragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onDividerPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDividerDragging.current) return
    const parent = (e.target as HTMLElement).parentElement
    if (!parent) return
    const parentRect = parent.getBoundingClientRect()
    const newWidth = Math.max(120, Math.min(parentRect.width * 0.7, parentRect.right - e.clientX))
    setPaletteWidth(newWidth)
  }, [])

  const onDividerPointerUp = useCallback(() => {
    isDividerDragging.current = false
  }, [])

  const handleClearAll = () => {
    onChange(Array.from({ length: height }, () => Array<number | null>(width).fill(null)))
  }

  const brushLabel = brush
    ? brush.width === 1 && brush.height === 1
      ? `tile: ${brush.tileIndex}`
      : `${brush.width}x${brush.height}`
    : null

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-neutral-700 shrink-0">
        <button onClick={() => setTool('paint')}
          className={`p-1 text-xs border ${tool === 'paint' ? 'bg-sky-700 border-sky-600 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'}`}>
          <Paintbrush size={12} />
        </button>
        <button onClick={() => setTool('erase')}
          className={`p-1 text-xs border ${tool === 'erase' ? 'bg-sky-700 border-sky-600 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'}`}>
          <Eraser size={12} />
        </button>
        <button onClick={handleClearAll}
          className="p-1 text-xs bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-red-400 hover:bg-neutral-700">
          <Trash2 size={12} />
        </button>
        {brushLabel && (
          <span className="text-[10px] text-neutral-500 ml-1">{brushLabel}</span>
        )}
      </div>

      {/* Split: grid + divider + palette */}
      <div className="flex flex-1 min-h-0">
        {/* Entity grid */}
        <div ref={gridContainerRef} className="flex-1 min-w-0 overflow-hidden cursor-crosshair">
          <canvas
            ref={gridCanvasRef}
            style={{ width: gridSize.w, height: gridSize.h }}
            onWheel={onGridWheel}
            onPointerDown={onGridPointerDown}
            onPointerMove={onGridPointerMove}
            onPointerUp={onGridPointerUp}
            onPointerLeave={() => setHoverCell(null)}
            onContextMenu={e => e.preventDefault()}
          />
        </div>

        {/* Resizable divider */}
        <div
          className="w-1 shrink-0 bg-neutral-700 hover:bg-sky-600 cursor-col-resize"
          onPointerDown={onDividerPointerDown}
          onPointerMove={onDividerPointerMove}
          onPointerUp={onDividerPointerUp}
        />

        {/* Palette */}
        <div style={{ width: paletteWidth }} className="shrink-0 flex flex-col">
          <div className="px-2 py-1 text-[10px] text-neutral-500 border-b border-neutral-700 shrink-0">
            Source Tiles
          </div>
          <div ref={paletteContainerRef} className="flex-1 min-h-0 overflow-hidden cursor-crosshair">
            <canvas
              ref={paletteCanvasRef}
              style={{ width: paletteSize.w, height: paletteSize.h }}
              onWheel={onPaletteWheel}
              onPointerDown={onPalettePointerDown}
              onPointerMove={onPalettePointerMove}
              onPointerUp={onPalettePointerUp}
              onContextMenu={e => e.preventDefault()}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

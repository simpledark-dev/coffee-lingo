import { useState, useRef, useEffect, useCallback } from 'react'
import { useTilesetImages } from '../../state/TilesetContext'
import { getAssetBlobUrl } from '../../storage/blobUrlCache'
import { computeAnimFrames } from '../../types/entity'

/** Tile region picker for selecting sprite region from an asset. Loads image from TilesetContext or blob URL fallback. */
export function EntityTilePicker({ assetId, tileSize, selection, onSelect, frameCount }: {
  assetId: string
  tileSize: number
  selection: { tileIndex: number; w: number; h: number } | null
  onSelect: (sel: { tileIndex: number; w: number; h: number }) => void
  /** For animated mode: number of cloned frames to show after the selection */
  frameCount?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tilesetImages = useTilesetImages()
  const [fallbackImage, setFallbackImage] = useState<HTMLImageElement | null>(null)
  const image = tilesetImages.get(assetId) ?? fallbackImage

  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  const isPanning = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ r: 0, c: 0 })
  const [dragRect, setDragRect] = useState<{ r1: number; c1: number; r2: number; c2: number } | null>(null)

  const cols = image ? Math.floor(image.naturalWidth / tileSize) : 0
  const rows = image ? Math.ceil(image.naturalHeight / tileSize) : 0

  // Load image from blob URL if not in TilesetContext
  useEffect(() => {
    if (tilesetImages.has(assetId)) { setFallbackImage(null); return }
    if (!assetId) { setFallbackImage(null); return }
    let cancelled = false
    getAssetBlobUrl(assetId).then(url => {
      if (cancelled) return
      const img = new Image()
      img.onload = () => { if (!cancelled) setFallbackImage(img) }
      img.src = url
    }).catch(() => {})
    return () => { cancelled = true }
  }, [assetId, tilesetImages])

  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); setDragRect(null) }, [assetId])

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
    const el = containerRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const x = (clientX - rect.left - pan.x) / zoom
    const y = (clientY - rect.top - pan.y) / zoom
    const c = Math.floor(x / tileSize)
    const r = Math.floor(y / tileSize)
    if (c < 0 || c >= cols || r < 0 || r >= rows) return null
    return { r, c }
  }, [pan, zoom, tileSize, cols, rows])

  const highlightRect = (() => {
    if (dragRect) return dragRect
    if (!selection || cols <= 0) return null
    const c1 = selection.tileIndex % cols
    const r1 = Math.floor(selection.tileIndex / cols)
    return { r1, c1, r2: r1 + selection.h - 1, c2: c1 + selection.w - 1 }
  })()

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
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.drawImage(image, c * tileSize, r * tileSize, tileSize, tileSize, c * tileSize, r * tileSize, tileSize, tileSize)
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 1 / zoom
    for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * tileSize); ctx.lineTo(cols * tileSize, r * tileSize); ctx.stroke() }
    for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(c * tileSize, 0); ctx.lineTo(c * tileSize, rows * tileSize); ctx.stroke() }
    if (highlightRect) {
      const minR = Math.min(highlightRect.r1, highlightRect.r2), maxR = Math.max(highlightRect.r1, highlightRect.r2)
      const minC = Math.min(highlightRect.c1, highlightRect.c2), maxC = Math.max(highlightRect.c1, highlightRect.c2)
      const fw = maxC - minC + 1, fh = maxR - minR + 1
      // Primary selection (filled)
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2 / zoom
      ctx.strokeRect(minC * tileSize + 1, minR * tileSize + 1, fw * tileSize - 2, fh * tileSize - 2)
      ctx.fillStyle = 'rgba(56,189,248,0.2)'
      ctx.fillRect(minC * tileSize, minR * tileSize, fw * tileSize, fh * tileSize)

      // Clone frame boxes (stroke only, no fill)
      if (frameCount && frameCount > 1 && selection && !dragRect) {
        const cloneFrames = computeAnimFrames(
          { mode: 'animated', assetId: '', width: fw, height: fh, tileIndex: minR * cols + minC, frameCount },
          cols,
        )
        for (let i = 1; i < cloneFrames.length; i++) {
          const ci = cloneFrames[i]
          const cc = ci % cols, cr = Math.floor(ci / cols)
          ctx.strokeStyle = 'rgba(250,204,21,0.6)'
          ctx.lineWidth = 1.5 / zoom
          ctx.strokeRect(cc * tileSize + 1, cr * tileSize + 1, fw * tileSize - 2, fh * tileSize - 2)
          // Frame index label
          ctx.fillStyle = 'rgba(250,204,21,0.8)'
          ctx.font = `${Math.max(8, 10 / zoom)}px monospace`
          ctx.fillText(String(i), cc * tileSize + 3, cr * tileSize + Math.max(10, 12 / zoom))
        }
      }
    }
    ctx.restore()
  }, [image, cols, rows, tileSize, zoom, pan, canvasSize, highlightRect, frameCount, selection, dragRect])

  useEffect(() => { draw() }, [draw])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const nz = Math.max(0.25, Math.min(8, zoom * factor))
    const s = nz / zoom
    setPan({ x: mx - (mx - pan.x) * s, y: my - (my - pan.y) * s })
    setZoom(nz)
  }, [zoom, pan])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 2 || e.button === 1) {
      e.preventDefault(); isPanning.current = true; lastPan.current = { x: e.clientX, y: e.clientY }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); return
    }
    if (e.button === 0) {
      const cell = screenToCell(e.clientX, e.clientY)
      if (!cell) return
      isDragging.current = true; dragStart.current = cell
      setDragRect({ r1: cell.r, c1: cell.c, r2: cell.r, c2: cell.c })
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
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
      if (cell) setDragRect({ r1: dragStart.current.r, c1: dragStart.current.c, r2: cell.r, c2: cell.c })
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
      onSelect({ tileIndex: minR * cols + minC, w: maxC - minC + 1, h: maxR - minR + 1 })
    }
    setDragRect(null)
  }, [screenToCell, cols, onSelect])

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden cursor-crosshair"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={e => e.preventDefault()}>
      {!image ? (
        <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">Loading asset...</div>
      ) : (
        <canvas ref={canvasRef}
          style={{ width: canvasSize.w, height: canvasSize.h, pointerEvents: 'none' }} />
      )}
    </div>
  )
}

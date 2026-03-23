import { useRef, useEffect, useState, useCallback } from 'react'
import { Play, Pause } from 'lucide-react'
import type { EntityVisual } from '../../types/entity'
import { computeAnimFrames } from '../../types/entity'

/**
 * Full-size animation canvas with pan/zoom. Fills its parent container.
 * Returns current frame index via onFrameChange callback.
 */
export function AnimationCanvas({ visual, image, tileSize = 32, onFrameChange, forcedFrame, onClearForced }: {
  visual: EntityVisual
  image: HTMLImageElement
  tileSize?: number
  onFrameChange?: (frameIdx: number) => void
  /** When set, pauses animation and shows this frame */
  forcedFrame?: number | null
  /** Called when user resumes playback, parent should clear forcedFrame */
  onClearForced?: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [playing, setPlaying] = useState(true)
  const [frameIdx, setFrameIdx] = useState(0)
  const lastTime = useRef(0)
  const rafId = useRef(0)
  const isPanning = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })
  const fitted = useRef(false)

  const sheetCols = Math.floor(image.naturalWidth / tileSize)
  const sheetRows = Math.floor(image.naturalHeight / tileSize)
  const frames = visual.mode === 'animated' ? computeAnimFrames(visual, sheetCols, sheetRows) : [visual.tileIndex ?? 0]
  const duration = visual.frameDuration ?? 100
  const loop = visual.loop ?? 'loop'

  // External frame control
  const isForced = forcedFrame != null && forcedFrame >= 0
  const displayFrame = isForced ? forcedFrame : frameIdx
  const isPlaying = isForced ? false : playing
  const frameW = visual.width * tileSize
  const frameH = visual.height * tileSize

  // Track container size
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setCanvasSize({ w: Math.round(width), h: Math.round(height) })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Auto-fit on first render
  useEffect(() => {
    if (fitted.current || canvasSize.w === 0 || canvasSize.h === 0 || frameW === 0) return
    fitted.current = true
    const fitZoom = Math.min(canvasSize.w / frameW, canvasSize.h / frameH, 4) * 0.8
    setZoom(fitZoom)
    setPan({ x: (canvasSize.w - frameW * fitZoom) / 2, y: (canvasSize.h - frameH * fitZoom) / 2 })
  }, [canvasSize, frameW, frameH])

  // Animation tick
  const tick = useCallback((time: number) => {
    if (!lastTime.current) lastTime.current = time
    if (time - lastTime.current >= duration) {
      lastTime.current = time
      setFrameIdx(prev => {
        if (frames.length <= 1) return 0
        const next = prev + 1
        if (next >= frames.length) {
          if (loop === 'once') { setPlaying(false); return prev }
          if (loop === 'pingpong') return Math.max(0, frames.length - 2)
          return 0
        }
        return next
      })
    }
    if (isPlaying) rafId.current = requestAnimationFrame(tick)
  }, [duration, frames.length, loop, isPlaying])

  useEffect(() => {
    if (isPlaying && frames.length > 1) {
      lastTime.current = 0
      rafId.current = requestAnimationFrame(tick)
    }
    return () => cancelAnimationFrame(rafId.current)
  }, [isPlaying, tick, frames.length])

  // Reset animation when visual changes (e.g. state switch)
  useEffect(() => { setFrameIdx(0); setPlaying(true); lastTime.current = 0 }, [visual.tileIndex, visual.frameCount, visual.assetId, visual.loop])

  // Notify parent of frame change
  useEffect(() => { onFrameChange?.(displayFrame) }, [displayFrame, onFrameChange])

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || canvasSize.w === 0) return
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

    // Draw current frame
    const fi = displayFrame % Math.max(1, frames.length)
    const tileIndex = frames.length > 0 ? frames[fi] : (visual.tileIndex ?? 0)
    if (sheetCols > 0) {
      for (let dr = 0; dr < visual.height; dr++) {
        for (let dc = 0; dc < visual.width; dc++) {
          let srcCol: number, srcRow: number
          if (visual.tiles) {
            const ti = visual.tiles[dr]?.[dc]
            if (ti == null) continue
            srcCol = ti % sheetCols; srcRow = Math.floor(ti / sheetCols)
          } else {
            const baseCol = tileIndex % sheetCols
            const baseRow = Math.floor(tileIndex / sheetCols)
            srcCol = baseCol + dc; srcRow = baseRow + dr
          }
          ctx.drawImage(image,
            srcCol * tileSize, srcRow * tileSize, tileSize, tileSize,
            dc * tileSize, dr * tileSize, tileSize, tileSize)
        }
      }
    }

    // Draw border around frame
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1 / zoom
    ctx.strokeRect(0, 0, frameW, frameH)

    ctx.restore()
  }, [canvasSize, pan, zoom, image, visual, displayFrame, frames, sheetCols, tileSize])

  // Wheel zoom — same pattern as EntityTilePicker
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const nz = Math.max(0.25, Math.min(20, zoom * factor))
    const s = nz / zoom
    setPan({ x: mx - (mx - pan.x) * s, y: my - (my - pan.y) * s })
    setZoom(nz)
  }, [zoom, pan])

  // Pan — same pattern as EntityTilePicker
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 0 || e.button === 1) {
      e.preventDefault()
      isPanning.current = true
      lastPan.current = { x: e.clientX, y: e.clientY }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return
    const dx = e.clientX - lastPan.current.x
    const dy = e.clientY - lastPan.current.y
    lastPan.current = { x: e.clientX, y: e.clientY }
    setPan(p => ({ x: p.x + dx, y: p.y + dy }))
  }, [])

  const onPointerUp = useCallback(() => { isPanning.current = false }, [])

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden"
      style={{ background: 'repeating-conic-gradient(#1a1a1a 0% 25%, #222 0% 50%) 50% / 16px 16px' }}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={e => e.preventDefault()}>
      <canvas ref={canvasRef}
        style={{ width: canvasSize.w, height: canvasSize.h, pointerEvents: 'none' }} />

      {/* Controls overlay — stop pointer propagation so pan doesn't interfere */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-neutral-900/80 px-2 py-1 pointer-events-auto"
        onPointerDown={e => e.stopPropagation()}>
        {frames.length > 1 && (
          <button onClick={() => {
              if (isForced) { onClearForced?.(); setPlaying(true); setFrameIdx(0) }
              else if (!playing) { setFrameIdx(0); setPlaying(true) }
              else { setPlaying(false) }
              lastTime.current = 0
            }}
            className="text-neutral-400 hover:text-neutral-200">
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
        )}
        <span className="text-[12px] text-neutral-500">
          {frames.length > 1 ? `Frame ${(displayFrame % frames.length) + 1}/${frames.length}` : 'Static'}
        </span>
        <span className="text-[12px] text-neutral-600">{Math.round(zoom * 100)}%</span>
        <span className="text-[12px] text-neutral-600">{frameW}x{frameH}px</span>
      </div>
    </div>
  )
}

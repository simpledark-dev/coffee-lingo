import { useRef, useEffect, useState, useCallback } from 'react'
import { Play, Pause } from 'lucide-react'
import type { EntityVisual } from '../../types/entity'
import { computeAnimFrames } from '../../types/entity'

export function AnimationPreview({ visual, image, tileSize = 32 }: {
  visual: EntityVisual
  image: HTMLImageElement | undefined
  tileSize?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [playing, setPlaying] = useState(true)
  const [frameIdx, setFrameIdx] = useState(0)
  const lastTime = useRef(0)
  const rafId = useRef(0)

  const sheetCols = image ? Math.floor(image.naturalWidth / tileSize) : 0
  const frames = visual.mode === 'animated' ? computeAnimFrames(visual, sheetCols) : []
  const duration = visual.frameDuration ?? 100
  const loop = visual.loop ?? 'loop'
  const size = 128

  const tick = useCallback((time: number) => {
    if (!lastTime.current) lastTime.current = time
    const dt = time - lastTime.current

    if (dt >= duration) {
      lastTime.current = time
      setFrameIdx(prev => {
        if (frames.length === 0) return 0
        const next = prev + 1
        if (next >= frames.length) {
          if (loop === 'once') { setPlaying(false); return prev }
          if (loop === 'pingpong') return Math.max(0, frames.length - 2)
          return 0
        }
        return next
      })
    }

    if (playing) rafId.current = requestAnimationFrame(tick)
  }, [duration, frames.length, loop, playing])

  useEffect(() => {
    if (playing && frames.length > 1) {
      rafId.current = requestAnimationFrame(tick)
    }
    return () => cancelAnimationFrame(rafId.current)
  }, [playing, tick, frames.length])

  // Reset frame when visual changes
  useEffect(() => { setFrameIdx(0) }, [visual.tileIndex, visual.frameCount, visual.assetId])

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !image) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, size, size)
    ctx.imageSmoothingEnabled = false

    // Determine which tileIndex to draw (frame 0 for static, current frame for animated)
    const tileIndex = visual.mode === 'animated' && frames.length > 0
      ? frames[frameIdx % frames.length]
      : (visual.tileIndex ?? 0)

    const cols = Math.floor(image.naturalWidth / tileSize)
    if (cols <= 0) return
    const baseCol = tileIndex % cols
    const baseRow = Math.floor(tileIndex / cols)
    const w = visual.width * tileSize
    const h = visual.height * tileSize
    const scale = Math.min(size / w, size / h)
    const dw = w * scale, dh = h * scale
    const ox = (size - dw) / 2, oy = (size - dh) / 2

    for (let dr = 0; dr < visual.height; dr++) {
      for (let dc = 0; dc < visual.width; dc++) {
        ctx.drawImage(image,
          (baseCol + dc) * tileSize, (baseRow + dr) * tileSize, tileSize, tileSize,
          ox + dc * (dw / visual.width), oy + dr * (dh / visual.height),
          dw / visual.width, dh / visual.height,
        )
      }
    }
  }, [visual, image, frameIdx, frames, tileSize])

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, imageRendering: 'pixelated' }}
        className="bg-neutral-800 border border-neutral-700"
      />
      {visual.mode === 'animated' && frames.length > 1 && (
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <button onClick={() => { setPlaying(!playing); lastTime.current = 0 }} className="p-1 hover:text-neutral-200">
            {playing ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <span>Frame {(frameIdx % frames.length) + 1}/{frames.length}</span>
        </div>
      )}
    </div>
  )
}

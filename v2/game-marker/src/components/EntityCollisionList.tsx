import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { useEntityContext } from '../state/EntityContext'
import { useEntityImages } from '../state/useEntityImages'
import { computeAnimFrames } from '../types/entity'

export function EntityCollisionList() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const { entityDefs } = useEntityContext()
  const entityImages = useEntityImages()
  const { tileSize } = state

  return (
    <div className="h-full bg-neutral-800 flex flex-col">
      <div className="flex items-center px-2 py-1.5 border-b border-neutral-700 shrink-0">
        <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Entity Collision</span>
      </div>

      {entityDefs.length === 0 ? (
        <div className="px-3 py-3 text-xs text-neutral-500 text-center">
          No entity defs. Create entities in Entity page first.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-wrap gap-1 p-2">
            {entityDefs.map(def => (
              <CollisionThumb
                key={def.id}
                def={def}
                tileSize={tileSize}
                images={entityImages}
                onClick={() => dispatch({ type: 'SELECT_ENTITY_DEF_FOR_COLLISION', entityDefId: def.id })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CollisionThumb({ def, tileSize, images, onClick }: {
  def: import('../types/entity').EntityDef
  tileSize: number
  images: Map<string, HTMLImageElement>
  onClick: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frameIdx, setFrameIdx] = useState(0)
  const rafId = useRef(0)
  const lastTime = useRef(0)

  const img = images.get(def.visual.assetId)
  const sheetCols = img ? Math.floor(img.naturalWidth / tileSize) : 0
  const frames = def.visual.mode === 'animated' ? computeAnimFrames(def.visual, sheetCols) : []
  const isAnimated = frames.length > 1

  const tick = useCallback((time: number) => {
    if (!lastTime.current) lastTime.current = time
    if (time - lastTime.current >= (def.visual.frameDuration ?? 100)) {
      lastTime.current = time
      setFrameIdx(prev => (prev + 1) % frames.length)
    }
    rafId.current = requestAnimationFrame(tick)
  }, [frames.length, def.visual.frameDuration])

  useEffect(() => {
    if (isAnimated) { rafId.current = requestAnimationFrame(tick) }
    return () => cancelAnimationFrame(rafId.current)
  }, [isAnimated, tick])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !img || sheetCols <= 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const thumbSize = 64
    const dpr = window.devicePixelRatio || 1
    canvas.width = thumbSize * dpr
    canvas.height = thumbSize * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, thumbSize, thumbSize)
    ctx.imageSmoothingEnabled = false

    const tileIndex = isAnimated ? frames[frameIdx % frames.length] : (def.visual.tileIndex ?? 0)
    const baseCol = tileIndex % sheetCols
    const baseRow = Math.floor(tileIndex / sheetCols)

    const srcW = def.visual.width * tileSize
    const srcH = def.visual.height * tileSize
    const scale = Math.min(thumbSize / srcW, thumbSize / srcH)
    const dw = srcW * scale, dh = srcH * scale
    const ox = (thumbSize - dw) / 2, oy = (thumbSize - dh) / 2

    for (let dr = 0; dr < def.visual.height; dr++) {
      for (let dc = 0; dc < def.visual.width; dc++) {
        ctx.drawImage(img, (baseCol + dc) * tileSize, (baseRow + dr) * tileSize, tileSize, tileSize,
          ox + dc * (dw / def.visual.width), oy + dr * (dh / def.visual.height),
          dw / def.visual.width, dh / def.visual.height)
      }
    }

    // Draw collision zones overlay (scaled to fit)
    if (def.collision?.zones && def.collision.zones.length > 0) {
      const cellScale = scale * 4  // 4px collision cells scaled
      ctx.fillStyle = 'rgba(255,193,7,0.2)'
      ctx.strokeStyle = 'rgba(255,193,7,0.6)'
      ctx.lineWidth = 1
      for (const z of def.collision.zones) {
        ctx.fillRect(ox + z.col * cellScale, oy + z.row * cellScale, z.width * cellScale, z.height * cellScale)
        ctx.strokeRect(ox + z.col * cellScale, oy + z.row * cellScale, z.width * cellScale, z.height * cellScale)
      }
    }
  }, [def, tileSize, img, sheetCols, frameIdx, frames, isAnimated])

  return (
    <button
      onClick={onClick}
      className="shrink-0 flex flex-col items-center gap-0.5 p-1 border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 hover:border-neutral-500 cursor-pointer"
      title={def.name}
    >
      <canvas
        ref={canvasRef}
        className="bg-neutral-900"
        style={{ width: 64, height: 64, imageRendering: 'pixelated' }}
      />
      <span className="text-[9px] text-neutral-400 truncate max-w-12">{def.name}</span>
    </button>
  )
}

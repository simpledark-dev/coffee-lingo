import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { useEntityContext } from '../state/EntityContext'
import { useEntityImages } from '../state/useEntityImages'
import { computeAnimFrames, getDefVisual } from '../types/entity'
import type { EntityDef } from '../types/entity'

export function EntityPalette() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const { entityDefs } = useEntityContext()

  return (
    <div className="h-full bg-neutral-800 flex flex-col">
      <div className="flex items-center px-2 py-1 border-b border-neutral-700 shrink-0">
        <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Entity Defs</span>
        <span className="text-[10px] text-neutral-600 ml-auto">{entityDefs.length}</span>
      </div>
      {entityDefs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-neutral-500">
          No entity defs
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-wrap gap-1 p-2">
            {entityDefs.map(def => (
              <EntityDefItem
                key={def.id}
                def={def}
                active={state.selectedEntityDefId === def.id}
                tileSize={state.tileSize}
                onSelect={() => dispatch({ type: 'SELECT_ENTITY_DEF', entityDefId: state.selectedEntityDefId === def.id ? null : def.id })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EntityDefItem({ def, active, tileSize, onSelect }: {
  def: EntityDef
  active: boolean
  tileSize: number
  onSelect: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const entityImages = useEntityImages()
  const previewSize = 48
  const [frameIdx, setFrameIdx] = useState(0)
  const rafId = useRef(0)
  const lastTime = useRef(0)

  const visual = getDefVisual(def)
  const img = entityImages.get(visual.assetId)
  const sheetCols = img ? Math.floor(img.naturalWidth / tileSize) : 0
  const sheetRows = img ? Math.floor(img.naturalHeight / tileSize) : 0
  const frames = visual.mode === 'animated' ? computeAnimFrames(visual, sheetCols, sheetRows) : []
  const isAnimated = frames.length > 1

  // Animation loop
  const tick = useCallback((time: number) => {
    if (!lastTime.current) lastTime.current = time
    if (time - lastTime.current >= (visual.frameDuration ?? 100)) {
      lastTime.current = time
      setFrameIdx(prev => (prev + 1) % frames.length)
    }
    rafId.current = requestAnimationFrame(tick)
  }, [frames.length, visual.frameDuration])

  useEffect(() => {
    if (isAnimated) {
      rafId.current = requestAnimationFrame(tick)
    }
    return () => cancelAnimationFrame(rafId.current)
  }, [isAnimated, tick])

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = previewSize * dpr
    canvas.height = previewSize * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, previewSize, previewSize)
    ctx.imageSmoothingEnabled = false

    const tileIndex = isAnimated ? frames[frameIdx % frames.length] : (visual.tileIndex ?? 0)
    if (sheetCols <= 0) return
    const baseCol = tileIndex % sheetCols
    const baseRow = Math.floor(tileIndex / sheetCols)

    const pw = previewSize * visual.width
    const ph = previewSize * visual.height
    const scale = Math.min(previewSize / pw, previewSize / ph)
    const dw = pw * scale, dh = ph * scale
    const ox = (previewSize - dw) / 2, oy = (previewSize - dh) / 2
    const cellW = dw / visual.width, cellH = dh / visual.height

    for (let dr = 0; dr < visual.height; dr++) {
      for (let dc = 0; dc < visual.width; dc++) {
        let srcCol: number, srcRow: number
        if (visual.tiles) {
          const ti = visual.tiles[dr]?.[dc]
          if (ti == null) continue
          srcCol = ti % sheetCols; srcRow = Math.floor(ti / sheetCols)
        } else {
          srcCol = baseCol + dc; srcRow = baseRow + dr
        }
        ctx.drawImage(img, srcCol * tileSize, srcRow * tileSize, tileSize, tileSize,
          ox + dc * cellW, oy + dr * cellH, cellW, cellH)
      }
    }
  }, [def, tileSize, img, sheetCols, frameIdx, frames, isAnimated])

  return (
    <div
      onClick={onSelect}
      className={`flex flex-col items-center gap-0.5 p-1.5 cursor-pointer border border-neutral-700/50 ${
        active ? 'bg-sky-900/40 border-sky-500' : 'hover:bg-neutral-700/50'
      }`}
    >
      <canvas ref={canvasRef} style={{ width: previewSize, height: previewSize, imageRendering: 'pixelated' }} className="shrink-0" />
      <div className="text-[10px] text-neutral-300 truncate max-w-16 text-center">{def.name}</div>
    </div>
  )
}

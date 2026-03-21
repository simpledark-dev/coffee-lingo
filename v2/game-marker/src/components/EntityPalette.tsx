import { useEffect, useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { Tooltip } from './Tooltip'
import { useTilesetImages } from '../state/TilesetContext'

export function EntityPalette() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()

  return (
    <div className="h-full bg-neutral-800 flex flex-col">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-neutral-700 shrink-0">
        <span className="text-xs text-neutral-400 uppercase tracking-wider">Entity Defs</span>
        <Tooltip text="New Entity Type" side="left">
          <button
            onClick={() => dispatch({ type: 'SET_CREATE_ENTITY_DEF_DIALOG', open: true })}
            className="p-0.5 text-neutral-400 hover:text-neutral-100 bg-neutral-700 hover:bg-neutral-600"
          >
            <Plus size={14} />
          </button>
        </Tooltip>
      </div>

      <div className="flex-1 overflow-y-auto">
        {state.entityDefs.length === 0 ? (
          <div className="p-3 text-xs text-neutral-500 text-center">
            No entity types defined yet. Click + to create one.
          </div>
        ) : (
          state.entityDefs.map(def => (
            <EntityDefItem
              key={def.type}
              def={def}
              active={state.selectedEntityDefType === def.type}
              tileSize={state.tileSize}
              onSelect={() => dispatch({ type: 'SELECT_ENTITY_DEF', entityType: state.selectedEntityDefType === def.type ? null : def.type })}
              onDelete={() => dispatch({ type: 'REMOVE_ENTITY_DEF', entityType: def.type })}
            />
          ))
        )}
      </div>
    </div>
  )
}

function EntityDefItem({ def, active, tileSize, onSelect, onDelete }: {
  def: import('../types/entity').EntityDef
  active: boolean
  tileSize: number
  onSelect: () => void
  onDelete: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tilesetImages = useTilesetImages()
  const previewSize = 28

  const pw = previewSize * def.width
  const ph = previewSize * def.height
  // Fit preview into a square
  const scale = Math.min(previewSize / pw, previewSize / ph)
  const drawW = pw * scale
  const drawH = ph * scale

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = tilesetImages.get(def.tilesetId)
    if (!img) return

    canvas.width = previewSize
    canvas.height = previewSize
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, previewSize, previewSize)

    const tsCols = Math.floor(img.naturalWidth / tileSize)
    if (tsCols <= 0) return
    const baseCol = def.tileIndex % tsCols
    const baseRow = Math.floor(def.tileIndex / tsCols)
    const ox = (previewSize - drawW) / 2
    const oy = (previewSize - drawH) / 2
    const cellW = drawW / def.width
    const cellH = drawH / def.height
    for (let dr = 0; dr < def.height; dr++) {
      for (let dc = 0; dc < def.width; dc++) {
        ctx.drawImage(img, (baseCol + dc) * tileSize, (baseRow + dr) * tileSize, tileSize, tileSize, ox + dc * cellW, oy + dr * cellH, cellW, cellH)
      }
    }
  }, [def, tileSize, drawW, drawH, tilesetImages])

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer border-b border-neutral-700/50 ${
        active ? 'bg-sky-900/40 border-l-2 border-l-sky-500' : 'hover:bg-neutral-700/50'
      }`}
    >
      <canvas ref={canvasRef} style={{ width: previewSize, height: previewSize }} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-neutral-100 truncate">{def.type}</div>
        <div className="text-[10px] text-neutral-500">{def.width}x{def.height}</div>
      </div>
      <Tooltip text="Delete" side="left" delay={600}>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-0.5 text-neutral-500 hover:text-red-400"
        >
          <Trash2 size={12} />
        </button>
      </Tooltip>
    </div>
  )
}

import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { useTilesetImages } from '../state/TilesetContext'

export function EntityCollisionList() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const tilesetImageStore = useTilesetImages()
  const { entityDefs, tileSize } = state

  return (
    <div className="h-full bg-neutral-800 flex flex-col">
      <div className="flex items-center px-2 py-1.5 border-b border-neutral-700 shrink-0">
        <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Entity Collision</span>
      </div>

      {entityDefs.length === 0 ? (
        <div className="px-3 py-3 text-xs text-neutral-500 text-center">
          No entity defs. Create entities in Entity mode first.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-wrap gap-1 p-2">
            {entityDefs.map(def => (
              <button
                key={def.type}
                onClick={() => dispatch({ type: 'SELECT_ENTITY_DEF_FOR_COLLISION', entityType: def.type })}
                className="shrink-0 flex flex-col items-center gap-0.5 p-1 border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 hover:border-neutral-500 rounded cursor-pointer"
                title={def.type}
              >
                <canvas
                  className="bg-neutral-900"
                  style={{ width: def.width * 16, height: def.height * 16, imageRendering: 'pixelated' }}
                  ref={canvas => {
                    if (!canvas) return
                    const ctx = canvas.getContext('2d')
                    if (!ctx) return
                    canvas.width = def.width * tileSize
                    canvas.height = def.height * tileSize
                    ctx.imageSmoothingEnabled = false
                    const img = tilesetImageStore.get(def.tilesetId)
                    if (!img) return
                    const tsCols = Math.floor(img.naturalWidth / tileSize)
                    if (tsCols <= 0) return
                    const baseCol = def.tileIndex % tsCols
                    const baseRow = Math.floor(def.tileIndex / tsCols)
                    for (let dr = 0; dr < def.height; dr++) {
                      for (let dc = 0; dc < def.width; dc++) {
                        ctx.drawImage(img, (baseCol + dc) * tileSize, (baseRow + dr) * tileSize, tileSize, tileSize, dc * tileSize, dr * tileSize, tileSize, tileSize)
                      }
                    }
                    if (def.collisionZones && def.collisionZones.length > 0) {
                      ctx.fillStyle = 'rgba(255,193,7,0.2)'
                      ctx.strokeStyle = 'rgba(255,193,7,0.6)'
                      ctx.lineWidth = 2
                      for (const z of def.collisionZones) {
                        ctx.fillRect(z.col * 4, z.row * 4, z.width * 4, z.height * 4)
                        ctx.strokeRect(z.col * 4, z.row * 4, z.width * 4, z.height * 4)
                      }
                    }
                  }}
                />
                <span className="text-[9px] text-neutral-400 truncate max-w-[48px]">{def.type}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

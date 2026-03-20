import { useEffect } from 'react'
import { useEditorState } from '../../state/EditorContext'
import type { EntityDef } from '../../types/entity'

export function useCanvasEntityRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  tilesetImages: Map<string, HTMLImageElement>,
  hoverCell: { row: number; col: number } | null,
  canvasSize: { w: number; h: number },
) {
  const state = useEditorState()

  useEffect(() => {
    if (state.editorMode !== 'entity') return
    const canvas = canvasRef.current
    if (!canvas || canvasSize.w === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Entity renderer draws on top of the tile renderer
    // We need to draw after useCanvasRenderer finishes
    // Use a microtask to ensure we draw after
    const handle = requestAnimationFrame(() => {
      ctx.save()
      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.translate(state.panX, state.panY)
      ctx.scale(state.zoom, state.zoom)
      ctx.imageSmoothingEnabled = false

      const { tileSize, entityDefs, entities, selectedEntityId } = state

      // Draw placed entities
      for (const entity of entities) {
        const def = entityDefs.find(d => d.type === entity.type)
        if (!def) continue
        drawEntity(ctx, entity.row, entity.col, def, tileSize, tilesetImages, entity.id === selectedEntityId)
      }

      // Ghost preview
      if (hoverCell && state.selectedEntityDefType) {
        const def = entityDefs.find(d => d.type === state.selectedEntityDefType)
        if (def) {
          const { row, col } = hoverCell
          if (row >= 0 && col >= 0 && row + def.height <= state.gridRows && col + def.width <= state.gridCols) {
            // Check overlap
            const overlaps = entities.some(e => {
              const eDef = entityDefs.find(d => d.type === e.type)
              if (!eDef) return false
              return row < e.row + eDef.height && row + def.height > e.row &&
                     col < e.col + eDef.width && col + def.width > e.col
            })

            ctx.globalAlpha = 0.5
            drawEntitySprite(ctx, row, col, def, tileSize, tilesetImages)
            ctx.globalAlpha = 1

            // Highlight zone
            ctx.fillStyle = overlaps ? 'rgba(239,68,68,0.15)' : 'rgba(56,189,248,0.15)'
            ctx.fillRect(col * tileSize, row * tileSize, def.width * tileSize, def.height * tileSize)
            ctx.strokeStyle = overlaps ? 'rgba(239,68,68,0.5)' : 'rgba(56,189,248,0.5)'
            ctx.lineWidth = 2 / state.zoom
            ctx.strokeRect(col * tileSize, row * tileSize, def.width * tileSize, def.height * tileSize)
          }
        }
      }

      ctx.restore()
    })

    return () => cancelAnimationFrame(handle)
  }, [canvasRef, state, tilesetImages, hoverCell, canvasSize])
}

function drawEntity(
  ctx: CanvasRenderingContext2D,
  row: number, col: number,
  def: EntityDef,
  tileSize: number,
  images: Map<string, HTMLImageElement>,
  selected: boolean,
) {
  drawEntitySprite(ctx, row, col, def, tileSize, images)

  // Entity border
  ctx.strokeStyle = selected ? '#f59e0b' : 'rgba(255,255,255,0.3)'
  ctx.lineWidth = selected ? 2 : 1
  ctx.setLineDash(selected ? [] : [3, 3])
  ctx.strokeRect(col * tileSize, row * tileSize, def.width * tileSize, def.height * tileSize)
  ctx.setLineDash([])

  if (selected) {
    ctx.fillStyle = 'rgba(245,158,11,0.1)'
    ctx.fillRect(col * tileSize, row * tileSize, def.width * tileSize, def.height * tileSize)
  }
}

function drawEntitySprite(
  ctx: CanvasRenderingContext2D,
  row: number, col: number,
  def: EntityDef,
  tileSize: number,
  images: Map<string, HTMLImageElement>,
) {
  const img = images.get(def.tilesetId)
  if (!img) return
  const tsCols = Math.floor(img.naturalWidth / tileSize)
  if (tsCols <= 0) return
  // tileIndex = top-left tile in tileset; draw width x height tiles from there
  const baseCol = def.tileIndex % tsCols
  const baseRow = Math.floor(def.tileIndex / tsCols)
  for (let dr = 0; dr < def.height; dr++) {
    for (let dc = 0; dc < def.width; dc++) {
      const srcX = (baseCol + dc) * tileSize
      const srcY = (baseRow + dr) * tileSize
      ctx.drawImage(img, srcX, srcY, tileSize, tileSize, (col + dc) * tileSize, (row + dr) * tileSize, tileSize, tileSize)
    }
  }
}

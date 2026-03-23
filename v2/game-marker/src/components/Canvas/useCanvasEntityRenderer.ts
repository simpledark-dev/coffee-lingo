import { useEffect } from 'react'
import { useEditorState } from '../../state/EditorContext'
import { getDefVisual } from '../../types/entity'
import type { EntityDef } from '../../types/entity'

export function useCanvasEntityRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  tilesetImages: Map<string, HTMLImageElement>,
  hoverCell: { row: number; col: number } | null,
  canvasSize: { w: number; h: number },
  entityDefs: EntityDef[],
) {
  const state = useEditorState()

  useEffect(() => {
    if (state.editorMode !== 'entity' && state.editorMode !== 'collision') return
    const canvas = canvasRef.current
    if (!canvas || canvasSize.w === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const handle = requestAnimationFrame(() => {
      ctx.save()
      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.translate(state.panX, state.panY)
      ctx.scale(state.zoom, state.zoom)
      ctx.imageSmoothingEnabled = false

      const { tileSize, selectedEntityId } = state

      // Draw placed entities
      for (const elayer of state.entityLayers) {
        if (!elayer.visible) continue
        for (const entity of elayer.entities) {
          const def = entityDefs.find(d => d.id === entity.defId)
          if (!def) continue
          drawEntity(ctx, entity.row, entity.col, def, tileSize, tilesetImages, entity.id === selectedEntityId)
        }
      }

      // Ghost preview (only in entity mode)
      if (state.editorMode === 'entity' && hoverCell && state.selectedEntityDefId) {
        const def = entityDefs.find(d => d.id === state.selectedEntityDefId)
        if (def) {
          const { row, col } = hoverCell
          const v = getDefVisual(def)
          if (row >= 0 && col >= 0 && row + v.height <= state.gridRows && col + v.width <= state.gridCols) {
            ctx.globalAlpha = 0.5
            drawEntitySprite(ctx, row, col, def, tileSize, tilesetImages)
            ctx.globalAlpha = 1

            ctx.fillStyle = 'rgba(56,189,248,0.15)'
            ctx.fillRect(col * tileSize, row * tileSize, v.width * tileSize, v.height * tileSize)
            ctx.strokeStyle = 'rgba(56,189,248,0.5)'
            ctx.lineWidth = 2 / state.zoom
            ctx.strokeRect(col * tileSize, row * tileSize, getDefVisual(def).width * tileSize, getDefVisual(def).height * tileSize)
          }
        }
      }

      ctx.restore()
    })

    return () => cancelAnimationFrame(handle)
  }, [canvasRef, state, tilesetImages, hoverCell, canvasSize, entityDefs])
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
  ctx.strokeRect(col * tileSize, row * tileSize, getDefVisual(def).width * tileSize, getDefVisual(def).height * tileSize)
  ctx.setLineDash([])

  if (selected) {
    ctx.fillStyle = 'rgba(245,158,11,0.1)'
    ctx.fillRect(col * tileSize, row * tileSize, getDefVisual(def).width * tileSize, getDefVisual(def).height * tileSize)
  }
}

function drawEntitySprite(
  ctx: CanvasRenderingContext2D,
  row: number, col: number,
  def: EntityDef,
  tileSize: number,
  images: Map<string, HTMLImageElement>,
) {
  const visual = getDefVisual(def)
  const img = images.get(visual.assetId) // images should include both tileset + sprite-sheet
  if (!img) return
  const tsCols = Math.floor(img.naturalWidth / tileSize)
  if (tsCols <= 0) return

  // Composite static: per-cell tile indices
  if (visual.tiles) {
    for (let dr = 0; dr < visual.height; dr++) {
      for (let dc = 0; dc < visual.width; dc++) {
        const ti = visual.tiles[dr]?.[dc]
        if (ti == null) continue
        const sc = ti % tsCols, sr = Math.floor(ti / tsCols)
        ctx.drawImage(img, sc * tileSize, sr * tileSize, tileSize, tileSize, (col + dc) * tileSize, (row + dr) * tileSize, tileSize, tileSize)
      }
    }
    return
  }

  // tileIndex = top-left tile in tileset; draw width x height tiles from there
  const baseCol = (visual.tileIndex ?? 0) % tsCols
  const baseRow = Math.floor((visual.tileIndex ?? 0) / tsCols)
  for (let dr = 0; dr < visual.height; dr++) {
    for (let dc = 0; dc < visual.width; dc++) {
      const srcX = (baseCol + dc) * tileSize
      const srcY = (baseRow + dr) * tileSize
      ctx.drawImage(img, srcX, srcY, tileSize, tileSize, (col + dc) * tileSize, (row + dr) * tileSize, tileSize, tileSize)
    }
  }
}

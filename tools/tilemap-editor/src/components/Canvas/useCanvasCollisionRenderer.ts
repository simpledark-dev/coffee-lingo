import { useEffect } from 'react'
import { useEditorState } from '../../state/EditorContext'
import type { Zone } from '../../types/collision'
import type { DragPreview } from './useCanvasCollisionPointer'

/** Convert any CSS color string to rgba with given alpha */
function colorWithAlpha(color: string, alpha: number): string {
  // Use a temporary canvas to parse any CSS color
  const ctx = document.createElement('canvas').getContext('2d')!
  ctx.fillStyle = color
  const parsed = ctx.fillStyle // normalized to #rrggbb or rgb(...)
  // Extract RGB from hex
  if (parsed.startsWith('#')) {
    const r = parseInt(parsed.slice(1, 3), 16)
    const g = parseInt(parsed.slice(3, 5), 16)
    const b = parseInt(parsed.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  // Fallback
  return `rgba(128,128,128,${alpha})`
}

export function useCanvasCollisionRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  hoverCell: { row: number; col: number } | null,
  canvasSize: { w: number; h: number },
  dragPreviewRef: React.RefObject<DragPreview>,
) {
  const state = useEditorState()

  useEffect(() => {
    if (state.editorMode !== 'collision') return
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

      const { tileSize, zones, zoneDefs, selectedZoneId, entities, entityDefs } = state

      // Draw entity footprints (read-only indicator)
      for (const entity of entities) {
        const eDef = entityDefs.find(d => d.type === entity.type)
        if (!eDef) continue
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.lineWidth = 1 / state.zoom
        ctx.setLineDash([3 / state.zoom, 3 / state.zoom])
        ctx.strokeRect(
          entity.col * tileSize, entity.row * tileSize,
          eDef.width * tileSize, eDef.height * tileSize,
        )
        ctx.setLineDash([])
      }

      // Draw placed zones
      for (const zone of zones) {
        const def = zoneDefs.find(d => d.type === zone.type)
        if (!def) continue
        const selected = zone.id === selectedZoneId
        drawZone(ctx, zone, def.color, tileSize, state.zoom, selected)
      }

      // Ghost preview: hover 1x1 or drag rectangle
      const dragPreview = dragPreviewRef.current
      if (dragPreview && state.selectedZoneDefType) {
        const def = zoneDefs.find(d => d.type === state.selectedZoneDefType)
        if (def) {
          const minR = Math.min(dragPreview.startRow, dragPreview.endRow)
          const maxR = Math.max(dragPreview.startRow, dragPreview.endRow)
          const minC = Math.min(dragPreview.startCol, dragPreview.endCol)
          const maxC = Math.max(dragPreview.startCol, dragPreview.endCol)
          const w = maxC - minC + 1
          const h = maxR - minR + 1

          ctx.fillStyle = colorWithAlpha(def.color, 0.3)
          ctx.fillRect(minC * tileSize, minR * tileSize, w * tileSize, h * tileSize)
          ctx.strokeStyle = colorWithAlpha(def.color, 0.7)
          ctx.lineWidth = 2 / state.zoom
          ctx.setLineDash([4 / state.zoom, 4 / state.zoom])
          ctx.strokeRect(minC * tileSize, minR * tileSize, w * tileSize, h * tileSize)
          ctx.setLineDash([])
        }
      } else if (hoverCell && state.selectedZoneDefType) {
        const def = zoneDefs.find(d => d.type === state.selectedZoneDefType)
        if (def) {
          const { row, col } = hoverCell
          if (row >= 0 && col >= 0 && row < state.gridRows && col < state.gridCols) {
            ctx.fillStyle = colorWithAlpha(def.color, 0.3)
            ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize)
            ctx.strokeStyle = colorWithAlpha(def.color, 0.7)
            ctx.lineWidth = 2 / state.zoom
            ctx.strokeRect(col * tileSize, row * tileSize, tileSize, tileSize)
          }
        }
      }

      ctx.restore()
    })

    return () => cancelAnimationFrame(handle)
  }, [canvasRef, state, hoverCell, canvasSize, dragPreviewRef])
}

function drawZone(
  ctx: CanvasRenderingContext2D,
  zone: Zone,
  color: string,
  tileSize: number,
  zoom: number,
  selected: boolean,
) {
  const x = zone.col * tileSize
  const y = zone.row * tileSize
  const w = zone.width * tileSize
  const h = zone.height * tileSize

  // Fill
  ctx.fillStyle = colorWithAlpha(color, 0.35)
  ctx.fillRect(x, y, w, h)

  // Border
  ctx.strokeStyle = colorWithAlpha(color, selected ? 0.9 : 0.7)
  ctx.lineWidth = (selected ? 3 : 1.5) / zoom
  if (selected) {
    ctx.setLineDash([6 / zoom, 4 / zoom])
  }
  ctx.strokeRect(x, y, w, h)
  ctx.setLineDash([])

  // Label
  const fontSize = Math.max(9, 11 / zoom)
  ctx.font = `${fontSize}px 'Courier New', monospace`
  ctx.fillStyle = colorWithAlpha(color, 0.9)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(zone.type, x + 3 / zoom, y + 2 / zoom)
}

import { useEffect } from 'react'
import { useEditorState } from '../../state/EditorContext'
import type { HandleId } from './useCanvasResize'

export function useCanvasRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  tilesetImages: Map<string, HTMLImageElement>,
  hoverCell: { row: number; col: number } | null,
  canvasSize: { w: number; h: number },
  hoveredHandle?: HandleId | null,
) {
  const state = useEditorState()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || canvasSize.w === 0 || canvasSize.h === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.w * dpr
    canvas.height = canvasSize.h * dpr
    ctx.scale(dpr, dpr)

    // Clear
    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h)

    ctx.save()
    ctx.translate(state.panX, state.panY)
    ctx.scale(state.zoom, state.zoom)
    ctx.imageSmoothingEnabled = false

    const { gridCols, gridRows, tileSize } = state
    const mapW = gridCols * tileSize
    const mapH = gridRows * tileSize

    // Background
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, mapW, mapH)

    // Checkerboard for transparency
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        if ((r + c) % 2 === 0) {
          ctx.fillStyle = '#1e1e32'
        } else {
          ctx.fillStyle = '#16162a'
        }
        ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize)
      }
    }

    // Draw layers bottom to top
    for (const layer of state.layers) {
      if (!layer.visible) continue
      for (const [key, tile] of Object.entries(layer.tiles)) {
        const [r, c] = key.split(',').map(Number)
        const img = tilesetImages.get(tile.tilesetId)
        if (!img) continue

        const cols = Math.floor(img.naturalWidth / tileSize)
        if (cols <= 0) continue
        const srcX = (tile.tileIndex % cols) * tileSize
        const srcY = Math.floor(tile.tileIndex / cols) * tileSize

        ctx.drawImage(
          img,
          srcX, srcY, tileSize, tileSize,
          c * tileSize, r * tileSize, tileSize, tileSize,
        )
      }
    }

    // Grid
    if (state.showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1 / state.zoom
      for (let r = 0; r <= gridRows; r++) {
        ctx.beginPath()
        ctx.moveTo(0, r * tileSize)
        ctx.lineTo(mapW, r * tileSize)
        ctx.stroke()
      }
      for (let c = 0; c <= gridCols; c++) {
        ctx.beginPath()
        ctx.moveTo(c * tileSize, 0)
        ctx.lineTo(c * tileSize, mapH)
        ctx.stroke()
      }
    }

    // Brush / tile preview on hover
    if (hoverCell && (state.activeTool === 'pencil' || state.activeTool === 'fill')) {
      const { row: hr, col: hc } = hoverCell

      if (state.selectedBrush) {
        const brush = state.selectedBrush
        const img = tilesetImages.get(brush.tilesetId)
        for (let br = 0; br < brush.height; br++) {
          for (let bc = 0; bc < brush.width; bc++) {
            const tileIndex = brush.tiles[br][bc]
            if (tileIndex === null) continue
            const r = hr + br
            const c = hc + bc
            if (r < 0 || r >= gridRows || c < 0 || c >= gridCols) continue

            // Draw tile preview (semi-transparent)
            if (img) {
              const cols = Math.floor(img.naturalWidth / tileSize)
              if (cols > 0) {
                const srcX = (tileIndex % cols) * tileSize
                const srcY = Math.floor(tileIndex / cols) * tileSize
                ctx.globalAlpha = 0.5
                ctx.drawImage(
                  img,
                  srcX, srcY, tileSize, tileSize,
                  c * tileSize, r * tileSize, tileSize, tileSize,
                )
                ctx.globalAlpha = 1
              }
            }

            // Blue tint overlay
            ctx.fillStyle = 'rgba(56,189,248,0.15)'
            ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize)
          }
        }

        // Border around brush preview
        const minR = Math.max(0, hr)
        const minC = Math.max(0, hc)
        const maxR = Math.min(gridRows - 1, hr + brush.height - 1)
        const maxC = Math.min(gridCols - 1, hc + brush.width - 1)
        if (maxR >= minR && maxC >= minC) {
          ctx.strokeStyle = 'rgba(56,189,248,0.5)'
          ctx.lineWidth = 2 / state.zoom
          ctx.strokeRect(
            minC * tileSize,
            minR * tileSize,
            (maxC - minC + 1) * tileSize,
            (maxR - minR + 1) * tileSize,
          )
        }
      } else if (state.selectedTile) {
        if (hr >= 0 && hr < gridRows && hc >= 0 && hc < gridCols) {
          const tile = state.selectedTile
          const img = tilesetImages.get(tile.tilesetId)
          if (img) {
            const cols = Math.floor(img.naturalWidth / tileSize)
            if (cols > 0) {
              const srcX = (tile.tileIndex % cols) * tileSize
              const srcY = Math.floor(tile.tileIndex / cols) * tileSize
              ctx.globalAlpha = 0.5
              ctx.drawImage(
                img,
                srcX, srcY, tileSize, tileSize,
                hc * tileSize, hr * tileSize, tileSize, tileSize,
              )
              ctx.globalAlpha = 1
            }
          }
          ctx.fillStyle = 'rgba(56,189,248,0.15)'
          ctx.fillRect(hc * tileSize, hr * tileSize, tileSize, tileSize)
          ctx.strokeStyle = 'rgba(56,189,248,0.5)'
          ctx.lineWidth = 2 / state.zoom
          ctx.strokeRect(hc * tileSize, hr * tileSize, tileSize, tileSize)
        }
      }
    }

    // Selection
    if (state.selection) {
      const { startRow, startCol, endRow, endCol } = state.selection
      const minR = Math.min(startRow, endRow)
      const maxR = Math.max(startRow, endRow)
      const minC = Math.min(startCol, endCol)
      const maxC = Math.max(startCol, endCol)
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2 / state.zoom
      ctx.setLineDash([4 / state.zoom, 4 / state.zoom])
      ctx.strokeRect(
        minC * tileSize,
        minR * tileSize,
        (maxC - minC + 1) * tileSize,
        (maxR - minR + 1) * tileSize,
      )
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(56,189,248,0.1)'
      ctx.fillRect(
        minC * tileSize,
        minR * tileSize,
        (maxC - minC + 1) * tileSize,
        (maxR - minR + 1) * tileSize,
      )
    }

    // Resize mode overlay + handles
    if (state.resizeMode) {
      const mapW = gridCols * tileSize
      const mapH = gridRows * tileSize

      // Dim overlay
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(0, 0, mapW, mapH)

      // Dashed border
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2 / state.zoom
      ctx.setLineDash([6 / state.zoom, 4 / state.zoom])
      ctx.strokeRect(0, 0, mapW, mapH)
      ctx.setLineDash([])

      // 8 handles
      const handleSize = 10 / state.zoom
      const positions: [string, number, number][] = [
        ['nw', 0, 0], ['n', mapW / 2, 0], ['ne', mapW, 0],
        ['w', 0, mapH / 2], ['e', mapW, mapH / 2],
        ['sw', 0, mapH], ['s', mapW / 2, mapH], ['se', mapW, mapH],
      ]
      for (const [id, hx, hy] of positions) {
        const isHovered = hoveredHandle === id
        ctx.fillStyle = isHovered ? '#38bdf8' : '#ffffff'
        ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize)
        ctx.strokeStyle = '#1e293b'
        ctx.lineWidth = 1.5 / state.zoom
        ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize)
      }

      // Arrow indicators on 4 edges
      const arrowLen = 16 / state.zoom
      const arrowW = 5 / state.zoom
      ctx.fillStyle = 'rgba(56,189,248,0.6)'
      // Top arrow (up)
      ctx.beginPath()
      ctx.moveTo(mapW / 2, -arrowLen - 4 / state.zoom)
      ctx.lineTo(mapW / 2 - arrowW, -4 / state.zoom)
      ctx.lineTo(mapW / 2 + arrowW, -4 / state.zoom)
      ctx.fill()
      // Bottom arrow (down)
      ctx.beginPath()
      ctx.moveTo(mapW / 2, mapH + arrowLen + 4 / state.zoom)
      ctx.lineTo(mapW / 2 - arrowW, mapH + 4 / state.zoom)
      ctx.lineTo(mapW / 2 + arrowW, mapH + 4 / state.zoom)
      ctx.fill()
      // Left arrow
      ctx.beginPath()
      ctx.moveTo(-arrowLen - 4 / state.zoom, mapH / 2)
      ctx.lineTo(-4 / state.zoom, mapH / 2 - arrowW)
      ctx.lineTo(-4 / state.zoom, mapH / 2 + arrowW)
      ctx.fill()
      // Right arrow
      ctx.beginPath()
      ctx.moveTo(mapW + arrowLen + 4 / state.zoom, mapH / 2)
      ctx.lineTo(mapW + 4 / state.zoom, mapH / 2 - arrowW)
      ctx.lineTo(mapW + 4 / state.zoom, mapH / 2 + arrowW)
      ctx.fill()

      // Size label
      ctx.fillStyle = 'rgba(56,189,248,0.9)'
      const fontSize = Math.max(12, 14 / state.zoom)
      ctx.font = `${fontSize}px 'Courier New', monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${gridCols} x ${gridRows}`, mapW / 2, mapH / 2)
    }

    ctx.restore()
  }, [canvasRef, state, tilesetImages, hoverCell, canvasSize, hoveredHandle])
}

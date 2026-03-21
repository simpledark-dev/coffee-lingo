import { useRef, useEffect, useCallback } from 'react'
import { useEditorState, useEditorDispatch } from '../../state/EditorContext'

const MINIMAP_W = 160
const MINIMAP_H = 120

export function Minimap({
  tilesetImages,
  canvasSize,
}: {
  tilesetImages: Map<string, HTMLImageElement>
  canvasSize: { w: number; h: number }
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const state = useEditorState()
  const dispatch = useEditorDispatch()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = MINIMAP_W * dpr
    canvas.height = MINIMAP_H * dpr
    ctx.scale(dpr, dpr)

    const { gridCols, gridRows, tileSize } = state
    const mapW = gridCols * tileSize
    const mapH = gridRows * tileSize

    // Scale to fit minimap
    const scale = Math.min(MINIMAP_W / mapW, MINIMAP_H / mapH)
    const offsetX = (MINIMAP_W - mapW * scale) / 2
    const offsetY = (MINIMAP_H - mapH * scale) / 2

    // Background
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H)

    ctx.save()
    ctx.translate(offsetX, offsetY)
    ctx.scale(scale, scale)
    ctx.imageSmoothingEnabled = false

    // Map background
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, mapW, mapH)

    // Draw tiles (all layers)
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

    ctx.restore()

    // Viewport rectangle
    if (canvasSize.w > 0 && canvasSize.h > 0) {
      const vpLeft = -state.panX / state.zoom
      const vpTop = -state.panY / state.zoom
      const vpW = canvasSize.w / state.zoom
      const vpH = canvasSize.h / state.zoom

      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 1.5
      ctx.strokeRect(
        offsetX + vpLeft * scale,
        offsetY + vpTop * scale,
        vpW * scale,
        vpH * scale,
      )
    }
  }, [state, tilesetImages, canvasSize])

  // Click on minimap to pan
  const handleClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const { gridCols, gridRows, tileSize } = state
    const mapW = gridCols * tileSize
    const mapH = gridRows * tileSize
    const scale = Math.min(MINIMAP_W / mapW, MINIMAP_H / mapH)
    const offsetX = (MINIMAP_W - mapW * scale) / 2
    const offsetY = (MINIMAP_H - mapH * scale) / 2

    // Convert minimap coords to map coords
    const mapX = (mx - offsetX) / scale
    const mapY = (my - offsetY) / scale

    // Center viewport on this point
    const newPanX = canvasSize.w / 2 - mapX * state.zoom
    const newPanY = canvasSize.h / 2 - mapY * state.zoom
    dispatch({ type: 'SET_PAN', x: newPanX, y: newPanY })
  }, [state, canvasSize, dispatch])

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ width: MINIMAP_W, height: MINIMAP_H }}
      className="border border-neutral-600 cursor-pointer bg-neutral-900"
    />
  )
}

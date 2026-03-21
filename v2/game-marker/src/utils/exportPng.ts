import type { EditorState } from '../types/editor'

export function exportPng(
  state: EditorState,
  tilesetImages: Map<string, HTMLImageElement>,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const { gridCols, gridRows, tileSize } = state
    const canvas = document.createElement('canvas')
    canvas.width = gridCols * tileSize
    canvas.height = gridRows * tileSize
    const ctx = canvas.getContext('2d')
    if (!ctx) { reject(new Error('Failed to get canvas context')); return }

    ctx.imageSmoothingEnabled = false

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
        ctx.drawImage(img, srcX, srcY, tileSize, tileSize, c * tileSize, r * tileSize, tileSize, tileSize)
      }
    }

    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to export PNG'))
    }, 'image/png')
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

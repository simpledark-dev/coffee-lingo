import type { TilesetConfig } from '../types/editor'

export function loadTilesetImage(config: TilesetConfig): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load tileset: ${config.src}`))
    img.src = config.src
  })
}

export async function loadAllTilesets(
  configs: TilesetConfig[]
): Promise<Map<string, HTMLImageElement>> {
  const map = new Map<string, HTMLImageElement>()
  const results = await Promise.allSettled(
    configs.map(async (c) => {
      const img = await loadTilesetImage(c)
      map.set(c.id, img)
    })
  )
  for (const r of results) {
    if (r.status === 'rejected') console.warn(r.reason)
  }
  return map
}

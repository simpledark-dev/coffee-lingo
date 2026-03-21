import type { TilemapJSON, TilemapJSON_V1, Layer, TilePlacement } from '../types/editor'

/** Parse and normalize any version to internal format (TilemapJSON v2 + hydrated layers) */
export function parseImportJson(text: string): TilemapJSON {
  const data = JSON.parse(text)
  if (!data.name || !data.gridCols || !data.gridRows || !data.tileSize) {
    throw new Error('Missing required fields')
  }
  if (!Array.isArray(data.layers) || data.layers.length === 0) {
    throw new Error('Missing layers')
  }

  if (data.version === 1) {
    return convertV1toV2(data as TilemapJSON_V1)
  }
  if (data.version === 2) {
    return data as TilemapJSON
  }
  throw new Error(`Unsupported version: ${data.version}`)
}

/** Convert v1 format to v2 */
function convertV1toV2(v1: TilemapJSON_V1): TilemapJSON {
  const tilesetIds = new Set<string>()
  for (const layer of v1.layers) {
    for (const tile of Object.values(layer.tiles)) {
      tilesetIds.add(tile.tilesetId)
    }
  }
  const tilesets = Array.from(tilesetIds)
  const tsIndexMap = new Map(tilesets.map((id, i) => [id, i]))

  return {
    version: 2,
    name: v1.name,
    gridCols: v1.gridCols,
    gridRows: v1.gridRows,
    tileSize: v1.tileSize,
    tilesets,
    layers: v1.layers.map(l => {
      const tiles: number[] = []
      for (const [key, tile] of Object.entries(l.tiles)) {
        const [r, c] = key.split(',').map(Number)
        tiles.push(r, c, tsIndexMap.get(tile.tilesetId)!, tile.tileIndex)
      }
      return { id: l.id, name: l.name, visible: l.visible, locked: l.locked, tiles }
    }),
  }
}

/** Hydrate v2 JSON layers into internal Layer format with Record<string, TilePlacement> */
export function hydrateLayers(json: TilemapJSON): Layer[] {
  return json.layers.map(l => {
    const tiles: Record<string, TilePlacement> = {}
    for (let i = 0; i < l.tiles.length; i += 4) {
      const r = l.tiles[i]
      const c = l.tiles[i + 1]
      const tsIdx = l.tiles[i + 2]
      const tileIndex = l.tiles[i + 3]
      const tilesetId = json.tilesets[tsIdx]
      if (tilesetId !== undefined) {
        tiles[`${r},${c}`] = { tilesetId, tileIndex }
      }
    }
    return { id: l.id, name: l.name, visible: l.visible, locked: l.locked, tiles }
  })
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

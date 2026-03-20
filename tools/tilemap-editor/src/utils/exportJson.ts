import type { EditorState, TilemapJSON } from '../types/editor'

export function exportJson(state: EditorState): TilemapJSON {
  // Build tileset index: collect all unique tilesetIds
  const tilesetIds = new Set<string>()
  for (const layer of state.layers) {
    for (const tile of Object.values(layer.tiles)) {
      tilesetIds.add(tile.tilesetId)
    }
  }
  const tilesets = Array.from(tilesetIds)
  const tsIndexMap = new Map(tilesets.map((id, i) => [id, i]))

  return {
    version: 2,
    name: state.mapName,
    gridCols: state.gridCols,
    gridRows: state.gridRows,
    tileSize: state.tileSize,
    tilesets,
    layers: state.layers.map(l => {
      const tiles: number[] = []
      for (const [key, tile] of Object.entries(l.tiles)) {
        const [r, c] = key.split(',').map(Number)
        tiles.push(r, c, tsIndexMap.get(tile.tilesetId)!, tile.tileIndex)
      }
      return {
        id: l.id,
        name: l.name,
        visible: l.visible,
        locked: l.locked,
        tiles,
      }
    }),
    entityDefs: state.entityDefs.length > 0 ? state.entityDefs : undefined,
    entities: state.entities.length > 0 ? state.entities : undefined,
  }
}

export function downloadJson(data: TilemapJSON, filename: string) {
  const json = JSON.stringify(data)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

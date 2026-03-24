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
    entityLayers: state.entityLayers.length > 0 ? state.entityLayers : undefined,
    renderOrder: state.renderOrder,
    zoneDefs: state.zoneDefs.length > 0 ? state.zoneDefs : undefined,
    zones: state.zones.length > 0 ? state.zones : undefined,
    viewport: { zoom: state.zoom, panX: state.panX, panY: state.panY },
  } as TilemapJSON
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

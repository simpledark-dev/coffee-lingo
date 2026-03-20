import type { EditorState, TilemapJSON } from '../types/editor'

export function exportJson(state: EditorState): TilemapJSON {
  return {
    version: 1,
    name: state.mapName,
    gridCols: state.gridCols,
    gridRows: state.gridRows,
    tileSize: state.tileSize,
    tilesets: state.tilesets,
    layers: state.layers.map(l => ({
      id: l.id,
      name: l.name,
      visible: l.visible,
      locked: l.locked,
      tiles: { ...l.tiles },
    })),
  }
}

export function downloadJson(data: TilemapJSON, filename: string) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

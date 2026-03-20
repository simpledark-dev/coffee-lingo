import type { TilemapJSON } from '../types/editor'

export function parseImportJson(text: string): TilemapJSON {
  const data = JSON.parse(text)
  if (data.version !== 1) throw new Error(`Unsupported version: ${data.version}`)
  if (!data.name || !data.gridCols || !data.gridRows || !data.tileSize) {
    throw new Error('Missing required fields')
  }
  if (!Array.isArray(data.layers) || data.layers.length === 0) {
    throw new Error('Missing layers')
  }
  return data as TilemapJSON
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

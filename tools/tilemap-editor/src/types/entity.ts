export interface EntityDef {
  type: string
  tilesetId: string
  tileIndex: number
  width: number   // tiles
  height: number  // tiles
  properties: Record<string, unknown>
}

export interface Entity {
  id: string
  type: string
  row: number
  col: number
  properties: Record<string, unknown>
}

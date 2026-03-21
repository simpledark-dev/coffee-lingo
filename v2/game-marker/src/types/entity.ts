export interface EntityDef {
  type: string
  tilesetId: string
  tileIndex: number
  width: number   // tiles
  height: number  // tiles
  properties: Record<string, unknown>
  /** Collision zones relative to entity origin, in collision cells (4px each) */
  collisionZones?: { type: string; row: number; col: number; width: number; height: number }[]
}

export interface Entity {
  id: string
  type: string
  row: number
  col: number
  properties: Record<string, unknown>
}

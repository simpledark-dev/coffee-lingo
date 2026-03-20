export interface ZoneDef {
  type: string
  color: string
  properties: Record<string, unknown>
}

export interface Zone {
  id: string
  type: string
  row: number
  col: number
  width: number
  height: number
  properties: Record<string, unknown>
}

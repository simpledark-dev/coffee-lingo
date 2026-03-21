// ── New entity types ─────────────────────────────────────

export interface EntityVisual {
  mode: 'static' | 'animated'
  assetId: string          // project asset ID
  tileIndex?: number       // top-left tile of frame 0 (both modes)
  width: number            // frame width in tiles
  height: number           // frame height in tiles
  // Animated mode: frames auto-generated from tileIndex, going right then wrapping
  frameCount?: number      // total frames (animated only)
  frameDuration?: number   // ms per frame, default 100
  loop?: 'loop' | 'pingpong' | 'once'
}

/**
 * Compute tile indices for each frame of an animated entity.
 * Frames go right from tileIndex, wrapping to next row when hitting sheet edge.
 */
export function computeAnimFrames(
  visual: EntityVisual,
  sheetWidthTiles: number,
): number[] {
  const count = visual.frameCount ?? 1
  if (count <= 0 || sheetWidthTiles <= 0) return []
  const startTile = visual.tileIndex ?? 0
  const startCol = startTile % sheetWidthTiles
  const startRow = Math.floor(startTile / sheetWidthTiles)
  const frames: number[] = []
  let col = startCol, row = startRow
  for (let i = 0; i < count; i++) {
    frames.push(row * sheetWidthTiles + col)
    col += visual.width
    if (col + visual.width > sheetWidthTiles) {
      col = 0
      row += visual.height
    }
  }
  return frames
}

export interface EntityCollisionZone {
  type: string
  row: number
  col: number
  width: number
  height: number
}

export interface EntityDef {
  id: string
  name: string
  type: string             // classification label
  tags: string[]
  description: string
  visual: EntityVisual
  collision?: {
    zones: EntityCollisionZone[]
  }
  properties: Record<string, unknown>
}

export interface Entity {
  id: string
  defId: string            // references EntityDef.id
  row: number
  col: number
  properties: Record<string, unknown>
}

// ── Legacy types (for migration) ─────────────────────────

export interface LegacyEntityDef {
  type: string
  tilesetId: string
  tileIndex: number
  width: number
  height: number
  properties: Record<string, unknown>
  collisionZones?: { type: string; row: number; col: number; width: number; height: number }[]
}

export interface LegacyEntity {
  id: string
  type: string
  row: number
  col: number
  properties: Record<string, unknown>
}

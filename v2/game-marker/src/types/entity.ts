// ── New entity types ─────────────────────────────────────

export type Direction = 'down' | 'left' | 'right' | 'up'
export const DIRECTIONS: Direction[] = ['down', 'left', 'right', 'up']

export interface EntityVisual {
  mode: 'static' | 'animated'
  assetId: string          // project asset ID
  tileIndex?: number       // top-left tile of frame 0 (both modes)
  width: number            // frame width in tiles
  height: number           // frame height in tiles
  // Composite static: per-cell tile indices (overrides tileIndex when present)
  tiles?: (number | null)[][]  // [row][col] grid, null = transparent
  // Animated mode: frames auto-generated from tileIndex, going right then wrapping
  frameCount?: number      // total frames (animated only)
  frameDuration?: number   // ms per frame, default 100
  frameGap?: number        // extra tiles to skip between frames (default 0)
  loop?: 'loop' | 'pingpong' | 'once'
}

export function createTilesGrid(width: number, height: number): (number | null)[][] {
  return Array.from({ length: height }, () => Array<number | null>(width).fill(null))
}

export function resizeTilesGrid(tiles: (number | null)[][], newWidth: number, newHeight: number): (number | null)[][] {
  return Array.from({ length: newHeight }, (_, r) =>
    Array.from({ length: newWidth }, (_, c) =>
      r < tiles.length && c < (tiles[r]?.length ?? 0) ? tiles[r][c] : null
    )
  )
}

/**
 * Compute tile indices for each frame of an animated entity.
 * Frames go right from tileIndex by frame width, wrapping to next row when hitting sheet edge.
 * If frames exceed the sheet, wraps back to the start position.
 */
export function computeAnimFrames(
  visual: EntityVisual,
  sheetWidthTiles: number,
  sheetHeightTiles?: number,
): number[] {
  const count = visual.frameCount ?? 1
  if (count <= 0 || sheetWidthTiles <= 0) return []
  const startTile = visual.tileIndex ?? 0
  const startCol = startTile % sheetWidthTiles
  const startRow = Math.floor(startTile / sheetWidthTiles)

  const gap = visual.frameGap ?? 0
  const step = visual.width + gap

  const frames: number[] = []
  let col = startCol, row = startRow
  for (let i = 0; i < count; i++) {
    frames.push(row * sheetWidthTiles + col)
    col += step
    if (col + visual.width > sheetWidthTiles) {
      col = 0
      row += visual.height
      // If no room for next row, wrap back to top
      if (sheetHeightTiles != null && row + visual.height > sheetHeightTiles) {
        row = 0
      }
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

/** State visual: either a single visual (no directions) or per-direction visuals */
export type StateVisual = EntityVisual | Partial<Record<Direction, EntityVisual>>

/** Check if a StateVisual is a directional record (vs single EntityVisual) */
export function isDirectional(sv: StateVisual): sv is Partial<Record<Direction, EntityVisual>> {
  return !('mode' in sv)
}

export interface EntityDef {
  id: string
  name: string
  type: string             // classification label
  tags: string[]
  description: string
  states: Record<string, StateVisual>  // keyed by state name
  defaultState: string
  defaultDirection?: Direction         // default direction for directional entities
  collision?: {
    zones: EntityCollisionZone[]
  }
  properties: Record<string, unknown>
}

/** Get the visual for a given state + direction. */
export function getDefVisual(def: EntityDef, state?: string, direction?: Direction): EntityVisual {
  const stateKey = state ?? def.defaultState
  const sv = def.states[stateKey]
    ?? def.states[Object.keys(def.states)[0]]
  if (!sv) return { mode: 'static', assetId: '', width: 1, height: 1 }

  if (isDirectional(sv)) {
    const dir = direction ?? def.defaultDirection ?? DIRECTIONS.find(d => sv[d]) ?? 'down'
    return sv[dir] ?? Object.values(sv).find(Boolean) ?? { mode: 'static', assetId: '', width: 1, height: 1 }
  }
  return sv
}

export interface Entity {
  id: string
  defId: string            // references EntityDef.id
  name?: string            // display name, auto-generated on placement
  row: number
  col: number
  flipX?: boolean
  flipY?: boolean
  state?: string           // override active state (default = def.defaultState)
  direction?: Direction    // override active direction (default = def.defaultDirection ?? 'down')
  properties: Record<string, unknown>
}

export interface EntityLayer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  entities: Entity[]
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

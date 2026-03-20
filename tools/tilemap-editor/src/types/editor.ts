// ── Tileset ──────────────────────────────────────────────

export interface TilesetConfig {
  id: string
  src: string
}

// ── Tile Placement ──────────────────────────────────────

export interface TilePlacement {
  tilesetId: string
  tileIndex: number
  tileId?: string
}

// ── Tile Brush (multi-tile selection from palette) ──────

export interface TileBrush {
  tilesetId: string
  // 2D grid of tile indices [row][col], null = empty
  tiles: (number | null)[][]
  width: number  // cols
  height: number // rows
}

// ── Layer ────────────────────────────────────────────────

export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  tiles: Record<string, TilePlacement> // key: "row,col"
}

// ── JSON Format (v2 - compact) ──────────────────────────

export interface TilemapJSON {
  version: 2
  name: string
  gridCols: number
  gridRows: number
  tileSize: number
  tilesets: string[]        // tileset IDs as array, index = tilesetIdx
  layers: {
    id: string
    name: string
    visible: boolean
    locked: boolean
    tiles: number[]          // flat: [row, col, tilesetIdx, tileIndex, ...]
  }[]
  entityDefs?: import('./entity').EntityDef[]
  entities?: import('./entity').Entity[]
  zoneDefs?: import('./collision').ZoneDef[]
  zones?: import('./collision').Zone[]
}

// v1 format for backward compat import
export interface TilemapJSON_V1 {
  version: 1
  name: string
  gridCols: number
  gridRows: number
  tileSize: number
  tilesets: TilesetConfig[]
  layers: Layer[]
}

// ── Tools ───────────────────────────────────────────────

export type ToolType = 'pencil' | 'eraser' | 'fill' | 'select' | 'eyedropper'

// ── Selection ───────────────────────────────────────────

export interface Selection {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

// ── Editor Mode ─────────────────────────────────────────

export type EditorMode = 'tile' | 'entity' | 'collision'

// ── Editor State ────────────────────────────────────────

export interface EditorState {
  // Map metadata
  mapName: string
  gridCols: number
  gridRows: number
  tileSize: number

  // Tilesets
  tilesets: TilesetConfig[]

  // Layers
  layers: Layer[]
  activeLayerId: string

  // Active tool
  activeTool: ToolType
  selectedTile: TilePlacement | null
  selectedBrush: TileBrush | null

  // Selection
  selection: Selection | null
  clipboard: Record<string, TilePlacement> | null

  // View
  showGrid: boolean
  zoom: number
  panX: number
  panY: number

  // History
  undoStack: Layer[][]
  redoStack: Layer[][]

  // Modes
  editorMode: EditorMode
  resizeMode: boolean

  // Entities
  entityDefs: import('./entity').EntityDef[]
  entities: import('./entity').Entity[]
  selectedEntityDefType: string | null
  selectedEntityId: string | null

  // Collision zones
  zoneDefs: import('./collision').ZoneDef[]
  zones: import('./collision').Zone[]
  selectedZoneDefType: string | null
  selectedZoneId: string | null

  // UI
  exportDialogOpen: boolean
  importDialogOpen: boolean
  createEntityDefDialogOpen: boolean
}

// ── Actions ─────────────────────────────────────────────

export type EditorAction =
  | { type: 'SET_TOOL'; tool: ToolType }
  | { type: 'SELECT_TILE'; tile: TilePlacement | null }
  | { type: 'SELECT_BRUSH'; brush: TileBrush | null }
  | { type: 'PLACE_TILE'; row: number; col: number }
  | { type: 'PLACE_BRUSH'; row: number; col: number }
  | { type: 'ERASE_TILE'; row: number; col: number }
  | { type: 'FILL_TILES'; tiles: Record<string, TilePlacement> }
  | { type: 'ADD_LAYER' }
  | { type: 'REMOVE_LAYER'; layerId: string }
  | { type: 'REORDER_LAYER'; layerId: string; direction: 'up' | 'down' }
  | { type: 'TOGGLE_LAYER_VISIBILITY'; layerId: string }
  | { type: 'TOGGLE_LAYER_LOCK'; layerId: string }
  | { type: 'RENAME_LAYER'; layerId: string; name: string }
  | { type: 'SET_ACTIVE_LAYER'; layerId: string }
  | { type: 'SET_SELECTION'; selection: Selection | null }
  | { type: 'COPY_SELECTION' }
  | { type: 'PASTE_SELECTION'; row: number; col: number }
  | { type: 'DELETE_SELECTION' }
  | { type: 'MOVE_SELECTION'; dRow: number; dCol: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PUSH_HISTORY' }
  | { type: 'IMPORT_MAP'; data: TilemapJSON }
  | { type: 'SET_GRID_SIZE'; cols: number; rows: number }
  | { type: 'RESIZE_MAP'; top: number; right: number; bottom: number; left: number }
  | { type: 'SET_TILE_SIZE'; size: number }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_PAN'; x: number; y: number }
  | { type: 'TOGGLE_GRID' }
  | { type: 'TOGGLE_RESIZE_MODE' }
  | { type: 'SET_EDITOR_MODE'; mode: EditorMode }
  | { type: 'ADD_ENTITY_DEF'; def: import('./entity').EntityDef }
  | { type: 'REMOVE_ENTITY_DEF'; entityType: string }
  | { type: 'SELECT_ENTITY_DEF'; entityType: string | null }
  | { type: 'PLACE_ENTITY'; row: number; col: number }
  | { type: 'SELECT_ENTITY'; entityId: string | null }
  | { type: 'MOVE_ENTITY'; entityId: string; row: number; col: number }
  | { type: 'DELETE_ENTITY'; entityId: string }
  | { type: 'UPDATE_ENTITY_PROPS'; entityId: string; properties: Record<string, unknown> }
  | { type: 'ADD_ZONE_DEF'; def: import('./collision').ZoneDef }
  | { type: 'REMOVE_ZONE_DEF'; zoneType: string }
  | { type: 'SELECT_ZONE_DEF'; zoneType: string | null }
  | { type: 'PLACE_ZONE'; row: number; col: number; width: number; height: number }
  | { type: 'SELECT_ZONE'; zoneId: string | null }
  | { type: 'MOVE_ZONE'; zoneId: string; row: number; col: number }
  | { type: 'DELETE_ZONE'; zoneId: string }
  | { type: 'UPDATE_ZONE_PROPS'; zoneId: string; properties: Record<string, unknown> }
  | { type: 'ADD_TILESET'; tileset: TilesetConfig }
  | { type: 'REMOVE_TILESET'; tilesetId: string }
  | { type: 'SET_EXPORT_DIALOG'; open: boolean }
  | { type: 'SET_IMPORT_DIALOG'; open: boolean }
  | { type: 'SET_CREATE_ENTITY_DEF_DIALOG'; open: boolean }

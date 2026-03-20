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

// ── JSON Format ─────────────────────────────────────────

export interface TilemapJSON {
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

  // UI
  exportDialogOpen: boolean
  importDialogOpen: boolean
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
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PUSH_HISTORY' }
  | { type: 'IMPORT_MAP'; data: TilemapJSON }
  | { type: 'SET_GRID_SIZE'; cols: number; rows: number }
  | { type: 'SET_TILE_SIZE'; size: number }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_PAN'; x: number; y: number }
  | { type: 'TOGGLE_GRID' }
  | { type: 'ADD_TILESET'; tileset: TilesetConfig }
  | { type: 'REMOVE_TILESET'; tilesetId: string }
  | { type: 'SET_EXPORT_DIALOG'; open: boolean }
  | { type: 'SET_IMPORT_DIALOG'; open: boolean }

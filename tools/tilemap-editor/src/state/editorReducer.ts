import type { EditorState, EditorAction, Layer } from '../types/editor'
import { generateId } from '../utils/generateId'
import { hydrateLayers } from '../utils/importJson'

const MAX_HISTORY = 50

function createLayer(name: string): Layer {
  return {
    id: generateId(),
    name,
    visible: true,
    locked: false,
    tiles: {},
  }
}

export function createInitialState(): EditorState {
  const layer = createLayer('Layer 1')
  return {
    mapName: 'Untitled',
    gridCols: 30,
    gridRows: 30,
    tileSize: 32,
    tilesets: [],
    layers: [layer],
    activeLayerId: layer.id,
    activeTool: 'pencil',
    selectedTile: null,
    selectedBrush: null,
    selection: null,
    clipboard: null,
    showGrid: true,
    zoom: 1,
    panX: 0,
    panY: 0,
    undoStack: [],
    redoStack: [],
    editorMode: 'tile',
    resizeMode: false,
    entityDefs: [],
    entities: [],
    selectedEntityDefType: null,
    selectedEntityId: null,
    zoneDefs: [],
    zones: [],
    selectedZoneDefType: null,
    selectedZoneId: null,
    selectedEntityDefForCollision: null,
    exportDialogOpen: false,
    importDialogOpen: false,
    createEntityDefDialogOpen: false,
  }
}

function cloneLayers(layers: Layer[]): Layer[] {
  return layers.map(l => ({ ...l, tiles: { ...l.tiles } }))
}

function getActiveLayer(state: EditorState): Layer | undefined {
  return state.layers.find(l => l.id === state.activeLayerId)
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    // ── Tool ──
    case 'SET_TOOL':
      return { ...state, activeTool: action.tool, selection: action.tool !== 'select' ? null : state.selection }

    case 'SELECT_TILE':
      return { ...state, selectedTile: action.tile, selectedBrush: null }

    case 'SELECT_BRUSH':
      return { ...state, selectedBrush: action.brush, selectedTile: action.brush ? { tilesetId: action.brush.tilesetId, tileIndex: action.brush.tiles[0][0] ?? 0 } : state.selectedTile }

    // ── Tile ops ──
    case 'PLACE_BRUSH': {
      const layer = getActiveLayer(state)
      if (!layer || layer.locked || !layer.visible || !state.selectedBrush) return state
      const brush = state.selectedBrush
      const newTiles = { ...layer.tiles }
      for (let br = 0; br < brush.height; br++) {
        for (let bc = 0; bc < brush.width; bc++) {
          const tileIndex = brush.tiles[br][bc]
          if (tileIndex === null) continue
          const r = action.row + br
          const c = action.col + bc
          if (r < 0 || r >= state.gridRows || c < 0 || c >= state.gridCols) continue
          newTiles[`${r},${c}`] = { tilesetId: brush.tilesetId, tileIndex }
        }
      }
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id === layer.id ? { ...l, tiles: newTiles } : l
        ),
      }
    }

    case 'PLACE_TILE': {
      const layer = getActiveLayer(state)
      if (!layer || layer.locked || !layer.visible || !state.selectedTile) return state
      const key = `${action.row},${action.col}`
      if (action.row < 0 || action.row >= state.gridRows || action.col < 0 || action.col >= state.gridCols) return state
      const existing = layer.tiles[key]
      if (existing && existing.tilesetId === state.selectedTile.tilesetId && existing.tileIndex === state.selectedTile.tileIndex) return state
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id === layer.id
            ? { ...l, tiles: { ...l.tiles, [key]: { ...state.selectedTile! } } }
            : l
        ),
      }
    }

    case 'ERASE_TILE': {
      const layer = getActiveLayer(state)
      if (!layer || layer.locked || !layer.visible) return state
      const key = `${action.row},${action.col}`
      if (!(key in layer.tiles)) return state
      const newTiles = { ...layer.tiles }
      delete newTiles[key]
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id === layer.id ? { ...l, tiles: newTiles } : l
        ),
      }
    }

    case 'FILL_TILES': {
      const layer = getActiveLayer(state)
      if (!layer || layer.locked || !layer.visible) return state
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id === layer.id
            ? { ...l, tiles: { ...l.tiles, ...action.tiles } }
            : l
        ),
      }
    }

    // ── Layers ──
    case 'ADD_LAYER': {
      const newLayer = createLayer(`Layer ${state.layers.length + 1}`)
      return {
        ...state,
        layers: [...state.layers, newLayer],
        activeLayerId: newLayer.id,
      }
    }

    case 'REMOVE_LAYER': {
      if (state.layers.length <= 1) return state
      const filtered = state.layers.filter(l => l.id !== action.layerId)
      return {
        ...state,
        layers: filtered,
        activeLayerId: state.activeLayerId === action.layerId ? filtered[filtered.length - 1].id : state.activeLayerId,
      }
    }

    case 'REORDER_LAYER': {
      const idx = state.layers.findIndex(l => l.id === action.layerId)
      if (idx === -1) return state
      const newIdx = action.direction === 'up' ? idx + 1 : idx - 1
      if (newIdx < 0 || newIdx >= state.layers.length) return state
      const newLayers = [...state.layers]
      ;[newLayers[idx], newLayers[newIdx]] = [newLayers[newIdx], newLayers[idx]]
      return { ...state, layers: newLayers }
    }

    case 'TOGGLE_LAYER_VISIBILITY':
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id === action.layerId ? { ...l, visible: !l.visible } : l
        ),
      }

    case 'TOGGLE_LAYER_LOCK':
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id === action.layerId ? { ...l, locked: !l.locked } : l
        ),
      }

    case 'RENAME_LAYER':
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id === action.layerId ? { ...l, name: action.name } : l
        ),
      }

    case 'SET_ACTIVE_LAYER':
      return { ...state, activeLayerId: action.layerId }

    // ── Selection ──
    case 'SET_SELECTION':
      return { ...state, selection: action.selection }

    case 'COPY_SELECTION': {
      if (!state.selection) return state
      const layer = getActiveLayer(state)
      if (!layer) return state
      const { startRow, startCol, endRow, endCol } = state.selection
      const minR = Math.min(startRow, endRow)
      const maxR = Math.max(startRow, endRow)
      const minC = Math.min(startCol, endCol)
      const maxC = Math.max(startCol, endCol)
      const clip: Record<string, typeof state.selectedTile & object> = {}
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const key = `${r},${c}`
          if (layer.tiles[key]) {
            clip[`${r - minR},${c - minC}`] = { ...layer.tiles[key] }
          }
        }
      }
      return { ...state, clipboard: clip }
    }

    case 'PASTE_SELECTION': {
      const layer = getActiveLayer(state)
      if (!layer || layer.locked || !state.clipboard) return state
      const newTiles = { ...layer.tiles }
      for (const [relKey, tile] of Object.entries(state.clipboard)) {
        const [rr, rc] = relKey.split(',').map(Number)
        const r = action.row + rr
        const c = action.col + rc
        if (r >= 0 && r < state.gridRows && c >= 0 && c < state.gridCols) {
          newTiles[`${r},${c}`] = tile
        }
      }
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id === layer.id ? { ...l, tiles: newTiles } : l
        ),
      }
    }

    case 'DELETE_SELECTION': {
      if (!state.selection) return state
      const layer = getActiveLayer(state)
      if (!layer || layer.locked) return state
      const { startRow, startCol, endRow, endCol } = state.selection
      const minR = Math.min(startRow, endRow)
      const maxR = Math.max(startRow, endRow)
      const minC = Math.min(startCol, endCol)
      const maxC = Math.max(startCol, endCol)
      const newTiles = { ...layer.tiles }
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          delete newTiles[`${r},${c}`]
        }
      }
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id === layer.id ? { ...l, tiles: newTiles } : l
        ),
        selection: null,
      }
    }

    case 'MOVE_SELECTION': {
      if (!state.selection) return state
      const layer = getActiveLayer(state)
      if (!layer || layer.locked) return state
      const { startRow, startCol, endRow, endCol } = state.selection
      const minR = Math.min(startRow, endRow)
      const maxR = Math.max(startRow, endRow)
      const minC = Math.min(startCol, endCol)
      const maxC = Math.max(startCol, endCol)
      const { dRow, dCol } = action

      // Collect tiles in selection
      const moving: Record<string, typeof layer.tiles[string]> = {}
      const newTiles = { ...layer.tiles }
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const key = `${r},${c}`
          if (newTiles[key]) {
            moving[key] = newTiles[key]
            delete newTiles[key]
          }
        }
      }

      // Place at new position
      for (const [key, tile] of Object.entries(moving)) {
        const [r, c] = key.split(',').map(Number)
        const nr = r + dRow
        const nc = c + dCol
        if (nr >= 0 && nr < state.gridRows && nc >= 0 && nc < state.gridCols) {
          newTiles[`${nr},${nc}`] = tile
        }
      }

      return {
        ...state,
        layers: state.layers.map(l =>
          l.id === layer.id ? { ...l, tiles: newTiles } : l
        ),
        selection: {
          startRow: minR + dRow,
          startCol: minC + dCol,
          endRow: maxR + dRow,
          endCol: maxC + dCol,
        },
      }
    }

    // ── History ──
    case 'PUSH_HISTORY':
      return {
        ...state,
        undoStack: [...state.undoStack.slice(-(MAX_HISTORY - 1)), cloneLayers(state.layers)],
        redoStack: [],
      }

    case 'UNDO': {
      if (state.undoStack.length === 0) return state
      const prev = state.undoStack[state.undoStack.length - 1]
      return {
        ...state,
        layers: prev,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, cloneLayers(state.layers)],
      }
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state
      const next = state.redoStack[state.redoStack.length - 1]
      return {
        ...state,
        layers: next,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, cloneLayers(state.layers)],
      }
    }

    // ── Import ──
    case 'IMPORT_MAP': {
      const hydratedLayers = hydrateLayers(action.data)
      return {
        ...state,
        mapName: action.data.name,
        gridCols: action.data.gridCols,
        gridRows: action.data.gridRows,
        tileSize: action.data.tileSize,
        layers: hydratedLayers,
        activeLayerId: hydratedLayers[0]?.id ?? state.activeLayerId,
        entityDefs: action.data.entityDefs ?? [],
        entities: action.data.entities ?? [],
        selectedEntityId: null,
        selectedEntityDefType: null,
        zoneDefs: action.data.zoneDefs ?? [],
        zones: action.data.zones ?? [],
        selectedZoneDefType: null,
        selectedZoneId: null,
        undoStack: [],
        redoStack: [],
        importDialogOpen: false,
      }
    }

    case 'SET_GRID_SIZE':
      return { ...state, gridCols: action.cols, gridRows: action.rows }

    case 'RESIZE_MAP': {
      const { top, right, bottom, left } = action
      const newCols = Math.max(1, state.gridCols + left + right)
      const newRows = Math.max(1, state.gridRows + top + bottom)
      // Offset tiles when expanding/shrinking from top or left
      const dr = top
      const dc = left
      const newLayers = state.layers.map(layer => {
        const newTiles: Record<string, typeof layer.tiles[string]> = {}
        for (const [key, tile] of Object.entries(layer.tiles)) {
          const [r, c] = key.split(',').map(Number)
          const nr = r + dr
          const nc = c + dc
          if (nr >= 0 && nr < newRows && nc >= 0 && nc < newCols) {
            newTiles[`${nr},${nc}`] = tile
          }
        }
        return { ...layer, tiles: newTiles }
      })
      return { ...state, gridCols: newCols, gridRows: newRows, layers: newLayers }
    }

    case 'SET_TILE_SIZE':
      return { ...state, tileSize: Math.max(8, Math.min(128, action.size)) }

    // ── View ──
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(0.25, Math.min(4, action.zoom)) }

    case 'SET_PAN':
      return { ...state, panX: action.x, panY: action.y }

    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid }

    case 'TOGGLE_RESIZE_MODE':
      return { ...state, resizeMode: !state.resizeMode }

    // ── Editor Mode ──
    case 'SET_EDITOR_MODE':
      return { ...state, editorMode: action.mode, resizeMode: false }

    // ── Entity Defs ──
    case 'ADD_ENTITY_DEF':
      if (state.entityDefs.some(d => d.type === action.def.type)) return state
      return { ...state, entityDefs: [...state.entityDefs, action.def] }

    case 'REMOVE_ENTITY_DEF':
      return {
        ...state,
        entityDefs: state.entityDefs.filter(d => d.type !== action.entityType),
        entities: state.entities.filter(e => e.type !== action.entityType),
        selectedEntityDefType: state.selectedEntityDefType === action.entityType ? null : state.selectedEntityDefType,
      }

    case 'SELECT_ENTITY_DEF':
      return { ...state, selectedEntityDefType: action.entityType, selectedEntityId: null }

    // ── Entities ──
    case 'PLACE_ENTITY': {
      const def = state.entityDefs.find(d => d.type === state.selectedEntityDefType)
      if (!def) return state
      // Check overlap
      const newR = action.row, newC = action.col
      const overlaps = state.entities.some(e => {
        const eDef = state.entityDefs.find(d => d.type === e.type)
        if (!eDef) return false
        return newR < e.row + eDef.height && newR + def.height > e.row &&
               newC < e.col + eDef.width && newC + def.width > e.col
      })
      if (overlaps) return state
      // Check bounds
      if (newR < 0 || newC < 0 || newR + def.height > state.gridRows || newC + def.width > state.gridCols) return state
      const entity = { id: generateId(), type: def.type, row: newR, col: newC, properties: { ...def.properties } }
      return { ...state, entities: [...state.entities, entity] }
    }

    case 'SELECT_ENTITY':
      return { ...state, selectedEntityId: action.entityId }

    case 'MOVE_ENTITY': {
      const entity = state.entities.find(e => e.id === action.entityId)
      if (!entity) return state
      const def = state.entityDefs.find(d => d.type === entity.type)
      if (!def) return state
      if (action.row < 0 || action.col < 0 || action.row + def.height > state.gridRows || action.col + def.width > state.gridCols) return state
      // Check overlap with other entities
      const overlaps2 = state.entities.some(e => {
        if (e.id === action.entityId) return false
        const eDef = state.entityDefs.find(d => d.type === e.type)
        if (!eDef) return false
        return action.row < e.row + eDef.height && action.row + def.height > e.row &&
               action.col < e.col + eDef.width && action.col + def.width > e.col
      })
      if (overlaps2) return state
      return {
        ...state,
        entities: state.entities.map(e => e.id === action.entityId ? { ...e, row: action.row, col: action.col } : e),
      }
    }

    case 'DELETE_ENTITY':
      return {
        ...state,
        entities: state.entities.filter(e => e.id !== action.entityId),
        selectedEntityId: state.selectedEntityId === action.entityId ? null : state.selectedEntityId,
      }

    case 'UPDATE_ENTITY_PROPS':
      return {
        ...state,
        entities: state.entities.map(e =>
          e.id === action.entityId ? { ...e, properties: { ...e.properties, ...action.properties } } : e
        ),
      }

    case 'SET_CREATE_ENTITY_DEF_DIALOG':
      return { ...state, createEntityDefDialogOpen: action.open }

    // ── Zone Defs ──
    case 'ADD_ZONE_DEF':
      if (state.zoneDefs.some(d => d.type === action.def.type)) return state
      return { ...state, zoneDefs: [...state.zoneDefs, action.def] }

    case 'REMOVE_ZONE_DEF':
      return {
        ...state,
        zoneDefs: state.zoneDefs.filter(d => d.type !== action.zoneType),
        zones: state.zones.filter(z => z.type !== action.zoneType),
        selectedZoneDefType: state.selectedZoneDefType === action.zoneType ? null : state.selectedZoneDefType,
      }

    case 'SELECT_ZONE_DEF':
      return { ...state, selectedZoneDefType: action.zoneType, selectedZoneId: null }

    // ── Zones ──
    case 'PLACE_ZONE': {
      const zoneDef = state.zoneDefs.find(d => d.type === state.selectedZoneDefType)
      if (!zoneDef) return state
      const { row, col, width, height } = action
      const maxCells = (axis: number) => axis * state.tileSize / 2  // 2px per collision cell
      if (row < 0 || col < 0 || row + height > maxCells(state.gridRows) || col + width > maxCells(state.gridCols)) return state
      const zone = { id: generateId(), type: zoneDef.type, row, col, width, height, properties: { ...zoneDef.properties } }
      return { ...state, zones: [...state.zones, zone] }
    }

    case 'SELECT_ZONE':
      return { ...state, selectedZoneId: action.zoneId }

    case 'MOVE_ZONE': {
      const zone = state.zones.find(z => z.id === action.zoneId)
      if (!zone) return state
      const maxCells2 = (axis: number) => axis * state.tileSize / 2
      if (action.row < 0 || action.col < 0 || action.row + zone.height > maxCells2(state.gridRows) || action.col + zone.width > maxCells2(state.gridCols)) return state
      return {
        ...state,
        zones: state.zones.map(z => z.id === action.zoneId ? { ...z, row: action.row, col: action.col } : z),
      }
    }

    case 'DELETE_ZONE':
      return {
        ...state,
        zones: state.zones.filter(z => z.id !== action.zoneId),
        selectedZoneId: state.selectedZoneId === action.zoneId ? null : state.selectedZoneId,
      }

    case 'UPDATE_ZONE_PROPS':
      return {
        ...state,
        zones: state.zones.map(z =>
          z.id === action.zoneId ? { ...z, properties: { ...z.properties, ...action.properties } } : z
        ),
      }

    // ── Entity Collision ──
    case 'SELECT_ENTITY_DEF_FOR_COLLISION':
      return { ...state, selectedEntityDefForCollision: action.entityType }

    case 'UPDATE_ENTITY_DEF_COLLISION':
      return {
        ...state,
        entityDefs: state.entityDefs.map(def =>
          def.type === action.entityType ? { ...def, collisionZones: action.collisionZones } : def
        ),
      }

    // ── Tilesets ──
    case 'ADD_TILESET':
      if (state.tilesets.some(t => t.id === action.tileset.id)) return state
      return { ...state, tilesets: [...state.tilesets, action.tileset] }

    case 'REMOVE_TILESET':
      return { ...state, tilesets: state.tilesets.filter(t => t.id !== action.tilesetId) }

    // ── UI ──
    case 'SET_EXPORT_DIALOG':
      return { ...state, exportDialogOpen: action.open }

    case 'SET_IMPORT_DIALOG':
      return { ...state, importDialogOpen: action.open }

    default:
      return state
  }
}

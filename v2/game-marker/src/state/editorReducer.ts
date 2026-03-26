import type { EditorState, EditorAction, Layer } from '../types/editor'
import { generateId } from '../utils/generateId'
import { hydrateLayers } from '../utils/importJson'
import { getDefVisual, type EntityLayer } from '../types/entity'

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
  const entityLayer: EntityLayer = { id: generateId(), name: 'Entities', visible: true, locked: false, entities: [] as import('../types/entity').Entity[] }
  return {
    currentMapId: null,
    mapName: 'Untitled',
    gridCols: 30,
    gridRows: 30,
    tileSize: 32,
    tilesets: [],
    layers: [layer],
    activeLayerId: layer.id,
    renderOrder: [{ type: 'tile', id: layer.id }, { type: 'entity', id: entityLayer.id }],
    activeTool: 'pencil',
    selectedTile: null,
    selectedBrush: null,
    selection: null,
    clipboard: null,
    showGrid: true,
    showEntityOverlay: false,
    entityGridSnap: 1 as const,
    zoom: 1,
    panX: 0,
    panY: 0,
    undoStack: [],
    redoStack: [],
    editorMode: 'tile',
    resizeMode: false,
    entityLayers: [entityLayer],
    activeEntityLayerId: entityLayer.id,
    selectedEntityDefId: null,
    selectedEntityId: null,
    selectedEntityIds: [],
    zoneDefs: [],
    zones: [],
    selectedZoneDefType: null,
    selectedZoneId: null,
    selectedEntityDefForCollision: null,
    exportDialogOpen: false,
    importDialogOpen: false,
  }
}

function cloneLayers(layers: Layer[]): Layer[] {
  return layers.map(l => ({ ...l, tiles: { ...l.tiles } }))
}

function getActiveLayer(state: EditorState): Layer | undefined {
  return state.layers.find(l => l.id === state.activeLayerId)
}

function findEntityInLayers(layers: EntityLayer[], entityId: string) {
  for (const layer of layers) {
    const entity = layer.entities.find(e => e.id === entityId)
    if (entity) return { layer, entity }
  }
  return null
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
        renderOrder: [...state.renderOrder, { type: 'tile' as const, id: newLayer.id }],
      }
    }

    case 'REMOVE_LAYER': {
      if (state.layers.length <= 1) return state
      const filtered = state.layers.filter(l => l.id !== action.layerId)
      return {
        ...state,
        layers: filtered,
        activeLayerId: state.activeLayerId === action.layerId ? filtered[filtered.length - 1].id : state.activeLayerId,
        renderOrder: state.renderOrder.filter(r => !(r.type === 'tile' && r.id === action.layerId)),
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

    case 'SOLO_LAYER': {
      const allVisible = state.layers.every(l => l.id === action.layerId ? l.visible : !l.visible)
      return {
        ...state,
        layers: state.layers.map(l =>
          // If already solo → show all; otherwise solo this one
          allVisible
            ? { ...l, visible: true }
            : { ...l, visible: l.id === action.layerId }
        ),
      }
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
      const importedEntityLayers: EntityLayer[] = action.data.entityLayers
        ?? [{ id: generateId(), name: 'Entities', visible: true, locked: false, entities: (action.data.entities ?? []) as import('../types/entity').Entity[] }]
      // Build render order: use saved or default (tiles first, then entities)
      const importedRenderOrder: { type: 'tile' | 'entity'; id: string }[] =
        (action.data as unknown as { renderOrder?: { type: 'tile' | 'entity'; id: string }[] }).renderOrder ??
        [
          ...hydratedLayers.map(l => ({ type: 'tile' as const, id: l.id })),
          ...importedEntityLayers.map(l => ({ type: 'entity' as const, id: l.id })),
        ]
      return {
        ...state,
        currentMapId: action.mapId ?? state.currentMapId,
        mapName: action.data.name,
        gridCols: action.data.gridCols,
        gridRows: action.data.gridRows,
        tileSize: action.data.tileSize,
        layers: hydratedLayers,
        activeLayerId: hydratedLayers[0]?.id ?? state.activeLayerId,
        renderOrder: importedRenderOrder,
        entityLayers: importedEntityLayers,
        activeEntityLayerId: importedEntityLayers[0]?.id ?? state.activeEntityLayerId,
        selectedEntityId: null,
        selectedEntityIds: [],
        selectedEntityDefId: null,
        zoneDefs: action.data.zoneDefs ?? [],
        zones: action.data.zones ?? [],
        selectedZoneDefType: null,
        selectedZoneId: null,
        zoom: action.data.viewport?.zoom ?? state.zoom,
        panX: action.data.viewport?.panX ?? state.panX,
        panY: action.data.viewport?.panY ?? state.panY,
        undoStack: [],
        redoStack: [],
        importDialogOpen: false,
      }
    }

    case 'SET_MAP_ID':
      return { ...state, currentMapId: action.mapId }

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
      // Offset entities + zones when expanding/shrinking from top or left
      const newEntityLayers = (dr !== 0 || dc !== 0)
        ? state.entityLayers.map(l => ({
            ...l,
            entities: l.entities.map(e => ({ ...e, row: e.row + dr, col: e.col + dc }))
              .filter(e => e.row >= 0 && e.col >= 0),
          }))
        : state.entityLayers
      const newZones = (dr !== 0 || dc !== 0)
        ? state.zones.map(z => ({ ...z, row: z.row + dr, col: z.col + dc }))
            .filter(z => z.row >= 0 && z.col >= 0)
        : state.zones
      return { ...state, gridCols: newCols, gridRows: newRows, layers: newLayers, entityLayers: newEntityLayers, zones: newZones }
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

    case 'TOGGLE_ENTITY_OVERLAY':
      return { ...state, showEntityOverlay: !state.showEntityOverlay }

    case 'CYCLE_ENTITY_GRID_SNAP': {
      const next = { 1: 2, 2: 4, 4: 1 } as const
      return { ...state, entityGridSnap: next[state.entityGridSnap] }
    }

    case 'SET_EDITOR_PREFS':
      return {
        ...state,
        ...(action.prefs.showGrid != null ? { showGrid: action.prefs.showGrid } : {}),
        ...(action.prefs.showEntityOverlay != null ? { showEntityOverlay: action.prefs.showEntityOverlay } : {}),
        ...(action.prefs.entityGridSnap != null ? { entityGridSnap: action.prefs.entityGridSnap } : {}),
      }

    case 'REORDER_RENDER': {
      const idx = state.renderOrder.findIndex(r => r.id === action.id)
      if (idx === -1) return state
      const newIdx = action.direction === 'up' ? idx + 1 : idx - 1
      if (newIdx < 0 || newIdx >= state.renderOrder.length) return state
      const order = [...state.renderOrder]
      ;[order[idx], order[newIdx]] = [order[newIdx], order[idx]]
      return { ...state, renderOrder: order }
    }

    case 'TOGGLE_RESIZE_MODE':
      return { ...state, resizeMode: !state.resizeMode }

    // ── Editor Mode ──
    case 'SET_EDITOR_MODE':
      return { ...state, editorMode: action.mode, resizeMode: false }

    // ── Entity Layers ──
    case 'ADD_ENTITY_LAYER': {
      const newLayer: EntityLayer = { id: generateId(), name: `Entity Layer ${state.entityLayers.length + 1}`, visible: true, locked: false, entities: [] }
      return { ...state, entityLayers: [...state.entityLayers, newLayer], activeEntityLayerId: newLayer.id, renderOrder: [...state.renderOrder, { type: 'entity' as const, id: newLayer.id }] }
    }

    case 'REMOVE_ENTITY_LAYER': {
      if (state.entityLayers.length <= 1) return state
      const filtered = state.entityLayers.filter(l => l.id !== action.layerId)
      return {
        ...state,
        entityLayers: filtered,
        activeEntityLayerId: state.activeEntityLayerId === action.layerId ? filtered[filtered.length - 1].id : state.activeEntityLayerId,
        selectedEntityId: null,
        renderOrder: state.renderOrder.filter(r => !(r.type === 'entity' && r.id === action.layerId)),
      }
    }

    case 'REORDER_ENTITY_LAYER': {
      const idx = state.entityLayers.findIndex(l => l.id === action.layerId)
      if (idx === -1) return state
      const newIdx = action.direction === 'up' ? idx + 1 : idx - 1
      if (newIdx < 0 || newIdx >= state.entityLayers.length) return state
      const newLayers = [...state.entityLayers]
      ;[newLayers[idx], newLayers[newIdx]] = [newLayers[newIdx], newLayers[idx]]
      return { ...state, entityLayers: newLayers }
    }

    case 'RENAME_ENTITY_LAYER':
      return { ...state, entityLayers: state.entityLayers.map(l => l.id === action.layerId ? { ...l, name: action.name } : l) }

    case 'TOGGLE_ENTITY_LAYER_VISIBILITY':
      return { ...state, entityLayers: state.entityLayers.map(l => l.id === action.layerId ? { ...l, visible: !l.visible } : l) }

    case 'SOLO_ENTITY_LAYER': {
      const allVisible = state.entityLayers.every(l => l.id === action.layerId ? l.visible : !l.visible)
      return {
        ...state,
        entityLayers: state.entityLayers.map(l =>
          allVisible ? { ...l, visible: true } : { ...l, visible: l.id === action.layerId }
        ),
      }
    }

    case 'TOGGLE_ENTITY_LAYER_LOCK':
      return { ...state, entityLayers: state.entityLayers.map(l => l.id === action.layerId ? { ...l, locked: !l.locked } : l) }

    case 'SET_ACTIVE_ENTITY_LAYER':
      return { ...state, activeEntityLayerId: action.layerId }

    // ── Entity Def Selection ──
    case 'SELECT_ENTITY_DEF':
      return { ...state, selectedEntityDefId: action.entityDefId, selectedEntityId: null, selectedEntityIds: [] }

    // ── Entities ──
    case 'PLACE_ENTITY': {
      const def = action.def
      const activeLayer = state.entityLayers.find(l => l.id === state.activeEntityLayerId)
      if (!activeLayer || activeLayer.locked || !activeLayer.visible) return state
      const newR = action.row, newC = action.col
      const v = getDefVisual(def)
      if (newR < 0 || newC < 0 || newR + v.height > state.gridRows || newC + v.width > state.gridCols) return state
      // Count existing instances of this def across all layers for naming
      let count = 0
      for (const l of state.entityLayers) {
        for (const e of l.entities) {
          if (e.defId === def.id) count++
        }
      }
      const entity = { id: generateId(), defId: def.id, name: `${def.name} (${count + 1})`, row: newR, col: newC, properties: { ...def.properties } }
      return {
        ...state,
        entityLayers: state.entityLayers.map(l => l.id === state.activeEntityLayerId ? { ...l, entities: [...l.entities, entity] } : l),
      }
    }

    case 'SELECT_ENTITY': {
      if (action.entityId == null) {
        return { ...state, selectedEntityId: null, selectedEntityIds: [] }
      }
      if (action.add) {
        // Toggle in multi-select
        const ids = state.selectedEntityIds.includes(action.entityId)
          ? state.selectedEntityIds.filter(id => id !== action.entityId)
          : [...state.selectedEntityIds, action.entityId]
        return { ...state, selectedEntityId: ids[ids.length - 1] ?? null, selectedEntityIds: ids }
      }
      return { ...state, selectedEntityId: action.entityId, selectedEntityIds: [action.entityId] }
    }

    case 'MOVE_ENTITY': {
      const found = findEntityInLayers(state.entityLayers, action.entityId)
      if (!found) return state
      const def = action.entityDefs.find(d => d.id === found.entity.defId)
      if (!def) return state
      if (action.row < 0 || action.col < 0 || action.row + getDefVisual(def).height > state.gridRows || action.col + getDefVisual(def).width > state.gridCols) return state
      return {
        ...state,
        entityLayers: state.entityLayers.map(l => ({
          ...l,
          entities: l.entities.map(e => e.id === action.entityId ? { ...e, row: action.row, col: action.col } : e),
        })),
      }
    }

    case 'MOVE_ENTITIES': {
      const ids = new Set(state.selectedEntityIds)
      if (ids.size === 0) return state
      // Validate bounds for all
      for (const l of state.entityLayers) {
        for (const e of l.entities) {
          if (!ids.has(e.id)) continue
          const def = action.entityDefs.find(d => d.id === e.defId)
          if (!def) continue
          const nr = e.row + action.dRow, nc = e.col + action.dCol
          if (nr < 0 || nc < 0 || nr + getDefVisual(def).height > state.gridRows || nc + getDefVisual(def).width > state.gridCols) return state
        }
      }
      return {
        ...state,
        entityLayers: state.entityLayers.map(l => ({
          ...l,
          entities: l.entities.map(e =>
            ids.has(e.id) ? { ...e, row: e.row + action.dRow, col: e.col + action.dCol } : e
          ),
        })),
      }
    }

    case 'DELETE_ENTITY':
      return {
        ...state,
        entityLayers: state.entityLayers.map(l => ({
          ...l,
          entities: l.entities.filter(e => e.id !== action.entityId),
        })),
        selectedEntityId: state.selectedEntityId === action.entityId ? null : state.selectedEntityId,
        selectedEntityIds: state.selectedEntityIds.filter(id => id !== action.entityId),
      }

    case 'DELETE_ENTITIES': {
      const ids = new Set(state.selectedEntityIds)
      return {
        ...state,
        entityLayers: state.entityLayers.map(l => ({
          ...l,
          entities: l.entities.filter(e => !ids.has(e.id)),
        })),
        selectedEntityId: null,
        selectedEntityIds: [],
      }
    }

    case 'REORDER_ENTITY': {
      return {
        ...state,
        entityLayers: state.entityLayers.map(l => {
          const idx = l.entities.findIndex(e => e.id === action.entityId)
          if (idx === -1) return l
          // 'up' = higher draw order = move toward end of array
          const newIdx = action.direction === 'up' ? idx + 1 : idx - 1
          if (newIdx < 0 || newIdx >= l.entities.length) return l
          const entities = [...l.entities]
          ;[entities[idx], entities[newIdx]] = [entities[newIdx], entities[idx]]
          return { ...l, entities }
        }),
      }
    }

    case 'FLIP_ENTITY':
      return {
        ...state,
        entityLayers: state.entityLayers.map(l => ({
          ...l,
          entities: l.entities.map(e =>
            e.id === action.entityId
              ? { ...e, [action.axis === 'x' ? 'flipX' : 'flipY']: !(action.axis === 'x' ? e.flipX : e.flipY) }
              : e
          ),
        })),
      }

    case 'UPDATE_ENTITY_PROPS':
      return {
        ...state,
        entityLayers: state.entityLayers.map(l => ({
          ...l,
          entities: l.entities.map(e =>
            e.id === action.entityId ? { ...e, properties: { ...e.properties, ...action.properties } } : e
          ),
        })),
      }

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
      return { ...state, selectedEntityDefForCollision: action.entityDefId }

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

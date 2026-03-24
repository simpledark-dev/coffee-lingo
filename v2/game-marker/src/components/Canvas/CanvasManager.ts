import type { EditorState, EditorAction } from '../../types/editor'
import { getDefVisual, computeAnimFrames } from '../../types/entity'
import type { Entity, EntityDef } from '../../types/entity'
import { tools } from '../../tools'

const COLLISION_CELL = 4
const HANDLE_HIT = 12

type HandleId = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
const CURSORS: Record<HandleId, string> = {
  n: 'ns-resize', s: 'ns-resize',
  e: 'ew-resize', w: 'ew-resize',
  nw: 'nwse-resize', se: 'nwse-resize',
  ne: 'nesw-resize', sw: 'nesw-resize',
}

function colorWithAlpha(color: string, alpha: number): string {
  const c = document.createElement('canvas').getContext('2d')!
  c.fillStyle = color
  const p = c.fillStyle
  if (p.startsWith('#')) {
    const r = parseInt(p.slice(1, 3), 16)
    const g = parseInt(p.slice(3, 5), 16)
    const b = parseInt(p.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  return `rgba(128,128,128,${alpha})`
}

export class CanvasManager {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private rafId = 0
  private running = false
  private w = 0
  private h = 0

  // Synced from React
  private state!: EditorState
  private tilesetImages: Map<string, HTMLImageElement> = new Map()
  private dispatch: (action: EditorAction) => void

  // Pan/zoom (internal, not from React state)
  private panX = 0
  private panY = 0
  private zoom = 1
  private isPanning = false
  private lastPan = { x: 0, y: 0 }
  private zoomSyncTimer = 0

  // Hover
  private hoverCell: { row: number; col: number } | null = null

  // Tile tool
  private isDrawing = false
  private lastDrawCell = ''

  // Entity
  private entityDefs: EntityDef[] = []
  private animFrameMap: Map<string, number> = new Map() // defId → current frame index
  private animTimeMap: Map<string, number> = new Map()  // defId → last frame time
  private isDraggingEntity = false
  private dragEntityId: string | null = null
  private dragEntityOffset = { dRow: 0, dCol: 0 }
  private isBoxSelecting = false
  private boxSelectStart = { row: 0, col: 0 }
  private boxSelectEnd = { row: 0, col: 0 }

  // Collision 2-click
  private collisionClickStart: { row: number; col: number } | null = null
  private collisionPreview: { sR: number; sC: number; eR: number; eC: number } | null = null
  private isDraggingZone = false
  private dragZoneId: string | null = null
  private dragZoneOffset = { dRow: 0, dCol: 0 }
  private zoneHistoryPushed = false

  // Resize
  private isResizing = false
  private activeHandle: HandleId | null = null
  private hoveredHandle: HandleId | null = null
  private resizeDragOrigin = { x: 0, y: 0 }
  private accumulated = { top: 0, right: 0, bottom: 0, left: 0 }

  constructor(canvas: HTMLCanvasElement, dispatch: (action: EditorAction) => void) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.dispatch = dispatch
  }

  syncState(state: EditorState, images: Map<string, HTMLImageElement>) {
    // Sync pan/zoom from React only when not actively manipulating
    if (!this.isPanning && !this.zoomSyncTimer) {
      this.panX = state.panX
      this.panY = state.panY
      this.zoom = state.zoom
    }
    this.state = state
    this.tilesetImages = images
  }

  syncEntityDefs(defs: EntityDef[]) {
    this.entityDefs = defs
  }

  private entityImages: Map<string, HTMLImageElement> = new Map()
  syncEntityImages(images: Map<string, HTMLImageElement>) {
    this.entityImages = images
  }

  // ─── Lifecycle ────────────────────────────────────────

  start() { this.running = true; this.loop() }

  stop() { this.running = false; cancelAnimationFrame(this.rafId) }

  destroy() { this.stop() }

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = w * dpr
    this.canvas.height = h * dpr
    // Render immediately to avoid black flash
    this.render()
  }

  getCursor(): string {
    if (this.hoveredHandle) return CURSORS[this.hoveredHandle]
    if (this.isResizing && this.activeHandle) return CURSORS[this.activeHandle]
    const s = this.state
    if (!s) return 'crosshair'
    const h = this.hoverCell
    if (s.editorMode === 'entity' && h) {
      let on = false
      for (const el of s.entityLayers) {
        if (!el.visible) continue
        if (el.entities.some(e => {
          const d = this.entityDefs.find(dd => dd.id === e.defId)
          return d && h.row >= e.row && h.row < e.row + getDefVisual(d).height && h.col >= e.col && h.col < e.col + getDefVisual(d).width
        })) { on = true; break }
      }
      return on ? 'move' : 'crosshair'
    }
    if (s.editorMode === 'collision' && h) {
      const C = COLLISION_CELL
      const on = s.zones.some(z => h.row * s.tileSize >= z.row * C && h.row * s.tileSize < (z.row + z.height) * C && h.col * s.tileSize >= z.col * C && h.col * s.tileSize < (z.col + z.height) * C)
      return on && !s.selectedZoneDefType ? 'move' : 'crosshair'
    }
    if (s.activeTool === 'select' && s.selection && h) {
      const { startRow: sr, startCol: sc, endRow: er, endCol: ec } = s.selection
      const minR = Math.min(sr, er), maxR = Math.max(sr, er)
      const minC = Math.min(sc, ec), maxC = Math.max(sc, ec)
      if (h.row >= minR && h.row <= maxR && h.col >= minC && h.col <= maxC) return 'move'
    }
    return 'crosshair'
  }

  // ─── Coordinate helpers ─────────────────────────────

  private screenToGrid(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect()
    const x = (clientX - rect.left - this.panX) / this.zoom
    const y = (clientY - rect.top - this.panY) / this.zoom
    return { row: Math.floor(y / this.state.tileSize), col: Math.floor(x / this.state.tileSize) }
  }

  private screenToCollisionGrid(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect()
    const x = (clientX - rect.left - this.panX) / this.zoom
    const y = (clientY - rect.top - this.panY) / this.zoom
    return { row: Math.floor(y / COLLISION_CELL), col: Math.floor(x / COLLISION_CELL) }
  }

  private screenToMap(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: (clientX - rect.left - this.panX) / this.zoom,
      y: (clientY - rect.top - this.panY) / this.zoom,
    }
  }

  // ─── Events ─────────────────────────────────────────

  onWheel(e: WheelEvent) {
    e.preventDefault()
    const rect = this.canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const newZoom = Math.max(0.25, Math.min(4, this.zoom * factor))
    const scale = newZoom / this.zoom
    this.zoom = newZoom
    this.panX = mouseX - (mouseX - this.panX) * scale
    this.panY = mouseY - (mouseY - this.panY) * scale
    // Debounce dispatch to React
    clearTimeout(this.zoomSyncTimer)
    this.zoomSyncTimer = window.setTimeout(() => {
      this.dispatch({ type: 'SET_ZOOM', zoom: this.zoom })
      this.dispatch({ type: 'SET_PAN', x: this.panX, y: this.panY })
    }, 150)
  }

  onPointerDown(e: PointerEvent) {
    const s = this.state
    // Middle mouse → pan
    if (e.button === 1) {
      this.isPanning = true
      this.lastPan = { x: e.clientX, y: e.clientY }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    if (e.button !== 0) return

    // Resize mode
    if (s.resizeMode) {
      const handle = this.getHandleAt(e.clientX, e.clientY)
      if (handle) {
        e.preventDefault()
        this.isResizing = true
        this.activeHandle = handle
        this.resizeDragOrigin = { x: e.clientX, y: e.clientY }
        this.accumulated = { top: 0, right: 0, bottom: 0, left: 0 }
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        this.dispatch({ type: 'PUSH_HISTORY' })
        return
      }
    }

    // Mode-specific
    if (s.editorMode === 'entity') this.entityPointerDown(e)
    else if (s.editorMode === 'collision') this.collisionPointerDown(e)
    else this.tilePointerDown(e)
  }

  onPointerMove(e: PointerEvent) {
    const s = this.state

    // Update hover
    const grid = this.screenToGrid(e.clientX, e.clientY)
    if (grid.row >= 0 && grid.row < s.gridRows && grid.col >= 0 && grid.col < s.gridCols) {
      this.hoverCell = grid
    } else {
      this.hoverCell = null
    }

    // Resize
    if (s.resizeMode) {
      if (this.isResizing) { this.resizePointerMove(e); return }
      this.hoveredHandle = this.getHandleAt(e.clientX, e.clientY)
    }

    // Pan (internal, dispatch on release)
    if (this.isPanning) {
      const dx = e.clientX - this.lastPan.x
      const dy = e.clientY - this.lastPan.y
      this.lastPan = { x: e.clientX, y: e.clientY }
      this.panX += dx
      this.panY += dy
      return
    }

    // Mode-specific
    if (s.editorMode === 'entity') this.entityPointerMove(e)
    else if (s.editorMode === 'collision') this.collisionPointerMove(e)
    else this.tilePointerMove(e)
  }

  onPointerUp(e: PointerEvent) {
    if (e.button === 1) {
      this.isPanning = false
      this.dispatch({ type: 'SET_PAN', x: this.panX, y: this.panY })
      return
    }

    if (this.isResizing) {
      this.isResizing = false
      this.activeHandle = null
      return
    }

    const s = this.state
    if (s.editorMode === 'entity') this.entityPointerUp(e)
    else if (s.editorMode === 'collision') this.collisionPointerUp()
    else this.tilePointerUp()
  }

  onPointerLeave() {
    this.hoverCell = null
    this.hoveredHandle = null
  }

  // ─── Tile Pointer ──────────────────────────────────

  private tilePointerDown(e: PointerEvent) {
    const s = this.state
    const { row, col } = this.screenToGrid(e.clientX, e.clientY)
    if (row < 0 || row >= s.gridRows || col < 0 || col >= s.gridCols) return

    this.isDrawing = true
    this.lastDrawCell = `${row},${col}`
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    this.dispatch({ type: 'PUSH_HISTORY' })
    tools[s.activeTool].onDown(row, col, s, this.dispatch)
  }

  private tilePointerMove(e: PointerEvent) {
    if (!this.isDrawing) return
    const s = this.state
    const { row, col } = this.screenToGrid(e.clientX, e.clientY)
    if (row < 0 || row >= s.gridRows || col < 0 || col >= s.gridCols) return
    const key = `${row},${col}`
    if (key === this.lastDrawCell) return
    this.lastDrawCell = key
    tools[s.activeTool].onMove(row, col, s, this.dispatch)
  }

  private tilePointerUp() {
    if (!this.isDrawing) return
    this.isDrawing = false
    tools[this.state.activeTool].onUp(this.state, this.dispatch)
  }

  // ─── Entity Pointer ────────────────────────────────

  private entityPointerDown(e: PointerEvent) {
    const s = this.state
    const { row, col } = this.screenToGrid(e.clientX, e.clientY)

    // If placing mode (def selected) → always place, don't select instances
    if (s.selectedEntityDefId) {
      const def = this.entityDefs.find(d => d.id === s.selectedEntityDefId)
      if (!def) return
      this.dispatch({ type: 'PUSH_HISTORY' })
      this.dispatch({ type: 'PLACE_ENTITY', row, col, def, entityDefs: this.entityDefs })
      return
    }

    // Selection mode — search ALL visible layers (top-first)
    let clicked: Entity | null = null
    let clickedLayerId: string | null = null
    for (let li = s.entityLayers.length - 1; li >= 0; li--) {
      const el = s.entityLayers[li]
      if (!el.visible) continue
      for (let i = el.entities.length - 1; i >= 0; i--) {
        const ent = el.entities[i]
        const def = this.entityDefs.find(d => d.id === ent.defId)
        if (!def) continue
        if (row >= ent.row && row < ent.row + getDefVisual(def).height && col >= ent.col && col < ent.col + getDefVisual(def).width) {
          clicked = ent; clickedLayerId = el.id; break
        }
      }
      if (clicked) break
    }

    if (clicked) {
      const isCtrl = e.ctrlKey || e.metaKey
      const alreadySelected = s.selectedEntityIds.includes(clicked.id)

      if (isCtrl) {
        this.dispatch({ type: 'SELECT_ENTITY', entityId: clicked.id, add: true })
      } else if (!alreadySelected) {
        this.dispatch({ type: 'SELECT_ENTITY', entityId: clicked.id })
      }

      if (clickedLayerId) this.dispatch({ type: 'SET_ACTIVE_ENTITY_LAYER', layerId: clickedLayerId })
      this.isDraggingEntity = true
      this.dragEntityId = clicked.id
      this.dragEntityOffset = { dRow: row - clicked.row, dCol: col - clicked.col }
      this.lastDragGrid = { row: row - (row - clicked.row), col: col - (col - clicked.col) }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      this.dispatch({ type: 'PUSH_HISTORY' })
    } else {
      // Start box select on empty space
      this.isBoxSelecting = true
      this.boxSelectStart = { row, col }
      this.boxSelectEnd = { row, col }
      if (!(e.ctrlKey || e.metaKey)) {
        this.dispatch({ type: 'SELECT_ENTITY', entityId: null })
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    }
  }

  private lastDragGrid = { row: 0, col: 0 }

  private entityPointerMove(e: PointerEvent) {
    if (this.isBoxSelecting) {
      const { row, col } = this.screenToGrid(e.clientX, e.clientY)
      this.boxSelectEnd = { row, col }
      return
    }
    if (!this.isDraggingEntity || !this.dragEntityId) return
    const { row, col } = this.screenToGrid(e.clientX, e.clientY)
    const newRow = row - this.dragEntityOffset.dRow
    const newCol = col - this.dragEntityOffset.dCol
    const dRow = newRow - this.lastDragGrid.row
    const dCol = newCol - this.lastDragGrid.col
    if (dRow === 0 && dCol === 0) return

    if (this.state.selectedEntityIds.length > 1) {
      this.dispatch({ type: 'MOVE_ENTITIES', dRow, dCol, entityDefs: this.entityDefs })
    } else {
      this.dispatch({ type: 'MOVE_ENTITY', entityId: this.dragEntityId, row: newRow, col: newCol, entityDefs: this.entityDefs })
    }
    this.lastDragGrid = { row: newRow, col: newCol }
  }

  private entityPointerUp(e: PointerEvent) {
    if (this.isBoxSelecting) {
      this.isBoxSelecting = false
      // Find all entities intersecting the box
      const minR = Math.min(this.boxSelectStart.row, this.boxSelectEnd.row)
      const maxR = Math.max(this.boxSelectStart.row, this.boxSelectEnd.row)
      const minC = Math.min(this.boxSelectStart.col, this.boxSelectEnd.col)
      const maxC = Math.max(this.boxSelectStart.col, this.boxSelectEnd.col)
      const isCtrl = e.ctrlKey || e.metaKey

      for (const el of this.state.entityLayers) {
        if (!el.visible) continue
        for (const ent of el.entities) {
          const def = this.entityDefs.find(d => d.id === ent.defId)
          if (!def) continue
          const v = getDefVisual(def)
          // Check intersection
          if (ent.row + v.height > minR && ent.row <= maxR && ent.col + v.width > minC && ent.col <= maxC) {
            this.dispatch({ type: 'SELECT_ENTITY', entityId: ent.id, add: isCtrl || true })
          }
        }
      }
      return
    }
    this.isDraggingEntity = false
    this.dragEntityId = null
  }

  // ─── Collision Pointer (2-click) ───────────────────

  private collisionPointerDown(e: PointerEvent) {
    const s = this.state
    const grid = this.screenToCollisionGrid(e.clientX, e.clientY)
    const tileGrid = this.screenToGrid(e.clientX, e.clientY)

    // Click on entity → open collision editor
    if (!s.selectedZoneDefType) {
      let hitEntity = false
      for (const el of s.entityLayers) {
        if (!el.visible) continue
        for (let i = el.entities.length - 1; i >= 0; i--) {
          const ent = el.entities[i]
          const def = this.entityDefs.find(d => d.id === ent.defId)
          if (!def) continue
          if (tileGrid.row >= ent.row && tileGrid.row < ent.row + getDefVisual(def).height &&
              tileGrid.col >= ent.col && tileGrid.col < ent.col + getDefVisual(def).width) {
            hitEntity = true; break
          }
        }
        if (hitEntity) break
      }
      if (hitEntity) return
    }

    // Click on existing zone
    const clicked = [...s.zones].reverse().find(z =>
      grid.row >= z.row && grid.row < z.row + z.height &&
      grid.col >= z.col && grid.col < z.col + z.width
    )

    if (clicked && !s.selectedZoneDefType) {
      this.dispatch({ type: 'SELECT_ZONE', zoneId: clicked.id })
      this.isDraggingZone = true
      this.dragZoneId = clicked.id
      this.dragZoneOffset = { dRow: grid.row - clicked.row, dCol: grid.col - clicked.col }
      this.zoneHistoryPushed = false
      return
    }

    if (s.selectedZoneDefType) {
      if (!this.collisionClickStart) {
        // First click
        this.collisionClickStart = grid
        this.collisionPreview = { sR: grid.row, sC: grid.col, eR: grid.row, eC: grid.col }
      } else {
        // Second click → finalize
        const start = this.collisionClickStart
        const minR = Math.min(start.row, grid.row)
        const maxR = Math.max(start.row, grid.row)
        const minC = Math.min(start.col, grid.col)
        const maxC = Math.max(start.col, grid.col)
        this.dispatch({ type: 'PUSH_HISTORY' })
        this.dispatch({ type: 'PLACE_ZONE', row: minR, col: minC, width: maxC - minC + 1, height: maxR - minR + 1 })
        this.collisionClickStart = null
        this.collisionPreview = null
      }
      return
    }

    this.dispatch({ type: 'SELECT_ZONE', zoneId: null })
  }

  private collisionPointerMove(e: PointerEvent) {
    const s = this.state
    const grid = this.screenToCollisionGrid(e.clientX, e.clientY)

    if (this.collisionClickStart && s.selectedZoneDefType) {
      const maxRow = (s.gridRows * s.tileSize / COLLISION_CELL) - 1
      const maxCol = (s.gridCols * s.tileSize / COLLISION_CELL) - 1
      this.collisionPreview = {
        sR: this.collisionClickStart.row,
        sC: this.collisionClickStart.col,
        eR: Math.max(0, Math.min(maxRow, grid.row)),
        eC: Math.max(0, Math.min(maxCol, grid.col)),
      }
      return
    }

    if (this.isDraggingZone && this.dragZoneId) {
      if (!this.zoneHistoryPushed) {
        this.dispatch({ type: 'PUSH_HISTORY' })
        this.zoneHistoryPushed = true
      }
      this.dispatch({ type: 'MOVE_ZONE', zoneId: this.dragZoneId, row: grid.row - this.dragZoneOffset.dRow, col: grid.col - this.dragZoneOffset.dCol })
    }
  }

  private collisionPointerUp() {
    this.isDraggingZone = false
    this.dragZoneId = null
  }

  // ─── Resize Pointer ────────────────────────────────

  private getHandleAt(clientX: number, clientY: number): HandleId | null {
    const pt = this.screenToMap(clientX, clientY)
    const s = this.state
    const w = s.gridCols * s.tileSize
    const h = s.gridRows * s.tileSize
    const handles: [HandleId, number, number][] = [
      ['nw', 0, 0], ['n', w / 2, 0], ['ne', w, 0],
      ['w', 0, h / 2], ['e', w, h / 2],
      ['sw', 0, h], ['s', w / 2, h], ['se', w, h],
    ]
    const hit = HANDLE_HIT / this.zoom
    for (const [id, hx, hy] of handles) {
      if (Math.abs(pt.x - hx) < hit && Math.abs(pt.y - hy) < hit) return id
    }
    return null
  }

  private resizePointerMove(e: PointerEvent) {
    if (!this.activeHandle) return
    const s = this.state
    const dx = (e.clientX - this.resizeDragOrigin.x) / this.zoom
    const dy = (e.clientY - this.resizeDragOrigin.y) / this.zoom
    const cellDx = Math.round(dx / s.tileSize)
    const cellDy = Math.round(dy / s.tileSize)

    let top = 0, right = 0, bottom = 0, left = 0
    if (this.activeHandle.includes('n')) top = -cellDy
    if (this.activeHandle.includes('s')) bottom = cellDy
    if (this.activeHandle.includes('w')) left = -cellDx
    if (this.activeHandle.includes('e')) right = cellDx

    const a = this.accumulated
    if (top !== a.top || right !== a.right || bottom !== a.bottom || left !== a.left) {
      const dt = top - a.top, dr = right - a.right, db = bottom - a.bottom, dl = left - a.left
      this.accumulated = { top, right, bottom, left }
      if (dt !== 0 || dr !== 0 || db !== 0 || dl !== 0) {
        this.dispatch({ type: 'RESIZE_MAP', top: dt, right: dr, bottom: db, left: dl })
        if (dt !== 0 || dl !== 0) {
          this.panX -= dl * s.tileSize * this.zoom
          this.panY -= dt * s.tileSize * this.zoom
          this.dispatch({ type: 'SET_PAN', x: this.panX, y: this.panY })
        }
      }
    }
  }

  // ─── Render Loop ───────────────────────────────────

  private loop() {
    if (!this.running) return
    this.render()
    this.rafId = requestAnimationFrame(() => this.loop())
  }

  private render() {
    const ctx = this.ctx
    const s = this.state
    if (!s || this.w === 0) return

    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, this.w, this.h)

    ctx.save()
    ctx.translate(this.panX, this.panY)
    ctx.scale(this.zoom, this.zoom)
    ctx.imageSmoothingEnabled = false

    this.updateAnimFrames(s.tileSize)
    this.drawBackground(ctx, s)
    // Render layers in interleaved order
    const showEntities = s.editorMode === 'entity' || s.editorMode === 'collision' || (s.editorMode === 'tile' && s.showEntityOverlay)
    for (const entry of s.renderOrder) {
      if (entry.type === 'tile') {
        const layer = s.layers.find(l => l.id === entry.id)
        if (layer && layer.visible) this.drawTileLayer(ctx, s, layer)
      } else {
        if (!showEntities) continue
        const elayer = s.entityLayers.find(l => l.id === entry.id)
        if (!elayer || !elayer.visible) continue
        if (s.editorMode === 'tile') ctx.globalAlpha = 0.35
        this.drawEntityLayer(ctx, s, elayer)
        if (s.editorMode === 'tile') ctx.globalAlpha = 1
      }
    }
    this.drawGrid(ctx, s)
    this.drawTilePreview(ctx, s)
    this.drawTileSelection(ctx, s)
    if (s.editorMode === 'entity' || s.editorMode === 'collision') {
      this.drawEntityOverlays(ctx, s)
    }
    if (s.editorMode === 'collision') {
      this.drawCollision(ctx, s)
    }
    if (s.resizeMode) {
      this.drawResize(ctx, s)
    }

    ctx.restore()
  }

  // ─── Draw: split methods for interleaved rendering ──

  private drawBackground(ctx: CanvasRenderingContext2D, s: EditorState) {
    const { gridCols, gridRows, tileSize } = s
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, gridCols * tileSize, gridRows * tileSize)
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#1e1e32' : '#16162a'
        ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize)
      }
    }
  }

  private drawTileLayer(ctx: CanvasRenderingContext2D, s: EditorState, layer: import('../../types/editor').Layer) {
    const { tileSize } = s
    for (const [key, tile] of Object.entries(layer.tiles)) {
      const [r, c] = key.split(',').map(Number)
      const img = this.tilesetImages.get(tile.tilesetId)
      if (!img) continue
      const cols = Math.floor(img.naturalWidth / tileSize)
      if (cols <= 0) continue
      const srcX = (tile.tileIndex % cols) * tileSize
      const srcY = Math.floor(tile.tileIndex / cols) * tileSize
      ctx.drawImage(img, srcX, srcY, tileSize, tileSize, c * tileSize, r * tileSize, tileSize, tileSize)
    }
  }

  private drawEntityLayer(ctx: CanvasRenderingContext2D, s: EditorState, elayer: import('../../types/entity').EntityLayer) {
    const { tileSize } = s
    const selSet = new Set(s.selectedEntityIds)
    for (const entity of elayer.entities) {
      const def = this.entityDefs.find(d => d.id === entity.defId)
      if (!def) continue
      const v = getDefVisual(def)
      if (entity.flipX || entity.flipY) {
        ctx.save()
        const cx = (entity.col + v.width / 2) * tileSize
        const cy = (entity.row + v.height / 2) * tileSize
        ctx.translate(cx, cy)
        ctx.scale(entity.flipX ? -1 : 1, entity.flipY ? -1 : 1)
        ctx.translate(-cx, -cy)
        this.drawEntitySprite(ctx, entity.row, entity.col, def, tileSize)
        ctx.restore()
      } else {
        this.drawEntitySprite(ctx, entity.row, entity.col, def, tileSize)
      }
      const sel = selSet.has(entity.id)
      ctx.strokeStyle = sel ? '#f59e0b' : 'rgba(255,255,255,0.3)'
      ctx.lineWidth = sel ? 2 : 1
      ctx.setLineDash(sel ? [] : [3, 3])
      ctx.strokeRect(entity.col * tileSize, entity.row * tileSize, v.width * tileSize, v.height * tileSize)
      ctx.setLineDash([])
      if (sel) {
        ctx.fillStyle = 'rgba(245,158,11,0.1)'
        ctx.fillRect(entity.col * tileSize, entity.row * tileSize, v.width * tileSize, v.height * tileSize)
      }
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D, s: EditorState) {
    if (!s.showGrid) return
    const { gridCols, gridRows, tileSize } = s
    const mapW = gridCols * tileSize, mapH = gridRows * tileSize
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1 / this.zoom
    for (let r = 0; r <= gridRows; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * tileSize); ctx.lineTo(mapW, r * tileSize); ctx.stroke()
    }
    for (let c = 0; c <= gridCols; c++) {
      ctx.beginPath(); ctx.moveTo(c * tileSize, 0); ctx.lineTo(c * tileSize, mapH); ctx.stroke()
    }
  }

  private drawTilePreview(ctx: CanvasRenderingContext2D, s: EditorState) {
    const { gridCols, gridRows, tileSize } = s
    const h = this.hoverCell
    if (!h || s.editorMode !== 'tile' || (s.activeTool !== 'pencil' && s.activeTool !== 'fill')) return
    if (s.selectedBrush) {
      const brush = s.selectedBrush
      const img = this.tilesetImages.get(brush.tilesetId)
      for (let br = 0; br < brush.height; br++) {
        for (let bc = 0; bc < brush.width; bc++) {
          const ti = brush.tiles[br][bc]
          if (ti === null) continue
          const r = h.row + br, c = h.col + bc
          if (r < 0 || r >= gridRows || c < 0 || c >= gridCols) continue
          if (img) {
            const cols = Math.floor(img.naturalWidth / tileSize)
            if (cols > 0) {
              ctx.globalAlpha = 0.5
              ctx.drawImage(img, (ti % cols) * tileSize, Math.floor(ti / cols) * tileSize, tileSize, tileSize, c * tileSize, r * tileSize, tileSize, tileSize)
              ctx.globalAlpha = 1
            }
          }
          ctx.fillStyle = 'rgba(56,189,248,0.15)'
          ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize)
        }
      }
      const minR = Math.max(0, h.row), minC = Math.max(0, h.col)
      const maxR = Math.min(gridRows - 1, h.row + brush.height - 1)
      const maxC = Math.min(gridCols - 1, h.col + brush.width - 1)
      if (maxR >= minR && maxC >= minC) {
        ctx.strokeStyle = 'rgba(56,189,248,0.5)'
        ctx.lineWidth = 2 / this.zoom
        ctx.strokeRect(minC * tileSize, minR * tileSize, (maxC - minC + 1) * tileSize, (maxR - minR + 1) * tileSize)
      }
    } else if (s.selectedTile && h.row >= 0 && h.row < gridRows && h.col >= 0 && h.col < gridCols) {
      const tile = s.selectedTile
      const img = this.tilesetImages.get(tile.tilesetId)
      if (img) {
        const cols = Math.floor(img.naturalWidth / tileSize)
        if (cols > 0) {
          ctx.globalAlpha = 0.5
          ctx.drawImage(img, (tile.tileIndex % cols) * tileSize, Math.floor(tile.tileIndex / cols) * tileSize, tileSize, tileSize, h.col * tileSize, h.row * tileSize, tileSize, tileSize)
          ctx.globalAlpha = 1
        }
      }
      ctx.fillStyle = 'rgba(56,189,248,0.15)'
      ctx.fillRect(h.col * tileSize, h.row * tileSize, tileSize, tileSize)
      ctx.strokeStyle = 'rgba(56,189,248,0.5)'
      ctx.lineWidth = 2 / this.zoom
      ctx.strokeRect(h.col * tileSize, h.row * tileSize, tileSize, tileSize)
    }
  }

  private drawTileSelection(ctx: CanvasRenderingContext2D, s: EditorState) {
    if (!s.selection) return
    const { tileSize } = s
    const { startRow: sr, startCol: sc, endRow: er, endCol: ec } = s.selection
    const minR = Math.min(sr, er), maxR = Math.max(sr, er)
    const minC = Math.min(sc, ec), maxC = Math.max(sc, ec)
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 2 / this.zoom
    ctx.setLineDash([4 / this.zoom, 4 / this.zoom])
    ctx.strokeRect(minC * tileSize, minR * tileSize, (maxC - minC + 1) * tileSize, (maxR - minR + 1) * tileSize)
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(56,189,248,0.1)'
    ctx.fillRect(minC * tileSize, minR * tileSize, (maxC - minC + 1) * tileSize, (maxR - minR + 1) * tileSize)
  }

  private drawEntityOverlays(ctx: CanvasRenderingContext2D, s: EditorState) {
    const { tileSize } = s
    const entityDefs = this.entityDefs

    // Box select preview
    if (this.isBoxSelecting) {
      const minR = Math.min(this.boxSelectStart.row, this.boxSelectEnd.row)
      const maxR = Math.max(this.boxSelectStart.row, this.boxSelectEnd.row)
      const minC = Math.min(this.boxSelectStart.col, this.boxSelectEnd.col)
      const maxC = Math.max(this.boxSelectStart.col, this.boxSelectEnd.col)
      ctx.fillStyle = 'rgba(56,189,248,0.1)'
      ctx.fillRect(minC * tileSize, minR * tileSize, (maxC - minC + 1) * tileSize, (maxR - minR + 1) * tileSize)
      ctx.strokeStyle = 'rgba(56,189,248,0.5)'
      ctx.lineWidth = 1 / this.zoom
      ctx.setLineDash([4 / this.zoom, 4 / this.zoom])
      ctx.strokeRect(minC * tileSize, minR * tileSize, (maxC - minC + 1) * tileSize, (maxR - minR + 1) * tileSize)
      ctx.setLineDash([])
    }

    // Ghost preview (entity mode only)
    if (s.editorMode === 'entity' && this.hoverCell && s.selectedEntityDefId) {
      const def = entityDefs.find(d => d.id === s.selectedEntityDefId)
      if (def) {
        const { row, col } = this.hoverCell
        const v = getDefVisual(def)
        if (row >= 0 && col >= 0 && row + v.height <= s.gridRows && col + v.width <= s.gridCols) {
          ctx.globalAlpha = 0.5
          this.drawEntitySprite(ctx, row, col, def, tileSize)
          ctx.globalAlpha = 1
          ctx.fillStyle = 'rgba(56,189,248,0.15)'
          ctx.fillRect(col * tileSize, row * tileSize, v.width * tileSize, v.height * tileSize)
          ctx.strokeStyle = 'rgba(56,189,248,0.5)'
          ctx.lineWidth = 2 / this.zoom
          ctx.strokeRect(col * tileSize, row * tileSize, getDefVisual(def).width * tileSize, getDefVisual(def).height * tileSize)
        }
      }
    }
  }

  private updateAnimFrames(tileSize: number) {
    const now = performance.now()

    for (const def of this.entityDefs) {
      const visual = getDefVisual(def)
      if (visual.mode !== 'animated' || !visual.frameCount || visual.frameCount <= 1) continue

      const duration = visual.frameDuration ?? 100
      const lastTime = this.animTimeMap.get(def.id) ?? 0
      if (!lastTime) { this.animTimeMap.set(def.id, now); continue }
      if (now - lastTime < duration) continue

      const img = this.entityImages.get(visual.assetId) ?? this.tilesetImages.get(visual.assetId)
      if (!img) continue
      const sheetCols = Math.floor(img.naturalWidth / tileSize)
      const sheetRows = Math.floor(img.naturalHeight / tileSize)
      const frames = computeAnimFrames(visual, sheetCols, sheetRows)
      if (frames.length <= 1) continue

      const current = this.animFrameMap.get(def.id) ?? 0
      this.animFrameMap.set(def.id, (current + 1) % frames.length)
      this.animTimeMap.set(def.id, now)
    }
  }

  private drawEntitySprite(ctx: CanvasRenderingContext2D, row: number, col: number, def: EntityDef, tileSize: number) {
    const visual = getDefVisual(def)
    const img = this.entityImages.get(visual.assetId) ?? this.tilesetImages.get(visual.assetId)
    if (!img) return
    const tsCols = Math.floor(img.naturalWidth / tileSize)
    if (tsCols <= 0) return

    // Composite static: per-cell tile indices
    if (visual.tiles) {
      for (let dr = 0; dr < visual.height; dr++) {
        for (let dc = 0; dc < visual.width; dc++) {
          const ti = visual.tiles[dr]?.[dc]
          if (ti == null) continue
          const sc = ti % tsCols, sr = Math.floor(ti / tsCols)
          ctx.drawImage(img, sc * tileSize, sr * tileSize, tileSize, tileSize, (col + dc) * tileSize, (row + dr) * tileSize, tileSize, tileSize)
        }
      }
      return
    }

    // Get tile index — use animation frame if animated
    let tileIndex = visual.tileIndex ?? 0
    if (visual.mode === 'animated' && (visual.frameCount ?? 0) > 1) {
      const tsRows = Math.floor(img.naturalHeight / tileSize)
      const frames = computeAnimFrames(visual, tsCols, tsRows)
      if (frames.length > 1) {
        const fi = this.animFrameMap.get(def.id) ?? 0
        tileIndex = frames[fi % frames.length]
      }
    }

    const baseCol = tileIndex % tsCols
    const baseRow = Math.floor(tileIndex / tsCols)
    for (let dr = 0; dr < visual.height; dr++) {
      for (let dc = 0; dc < visual.width; dc++) {
        ctx.drawImage(img, (baseCol + dc) * tileSize, (baseRow + dr) * tileSize, tileSize, tileSize, (col + dc) * tileSize, (row + dr) * tileSize, tileSize, tileSize)
      }
    }
  }

  // ─── Draw Collision ────────────────────────────────

  private drawCollision(ctx: CanvasRenderingContext2D, s: EditorState) {
    const { tileSize, zones, zoneDefs, selectedZoneId } = s
    const entityDefs = this.entityDefs
    const C = COLLISION_CELL

    // Entity footprints + collision zones
    for (const elayer of s.entityLayers) {
      if (!elayer.visible) continue
      for (const entity of elayer.entities) {
        const def = entityDefs.find(d => d.id === entity.defId)
        if (!def) continue
        const ex = entity.col * tileSize
        const ey = entity.row * tileSize

        // Footprint border
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.lineWidth = 1 / this.zoom
        ctx.setLineDash([3 / this.zoom, 3 / this.zoom])
        ctx.strokeRect(ex, ey, getDefVisual(def).width * tileSize, getDefVisual(def).height * tileSize)
        ctx.setLineDash([])

        // Entity collision zones (amber)
        if (def.collision?.zones) {
          for (const z of def.collision.zones) {
            const zDef = zoneDefs.find(d => d.type === z.type)
            const color = zDef?.color ?? '#ffc107'
            ctx.fillStyle = colorWithAlpha(color, 0.25)
            ctx.fillRect(ex + z.col * C, ey + z.row * C, z.width * C, z.height * C)
            ctx.strokeStyle = colorWithAlpha(color, 0.7)
            ctx.lineWidth = 1.5 / this.zoom
            ctx.strokeRect(ex + z.col * C, ey + z.row * C, z.width * C, z.height * C)
          }
        }
      }
    }

    // Placed zones
    for (const zone of zones) {
      const def = zoneDefs.find(d => d.type === zone.type)
      if (!def) continue
      const sel = zone.id === selectedZoneId
      const x = zone.col * C, y = zone.row * C
      const w = zone.width * C, h = zone.height * C
      ctx.fillStyle = colorWithAlpha(def.color, 0.35)
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = colorWithAlpha(def.color, sel ? 0.9 : 0.7)
      ctx.lineWidth = (sel ? 3 : 1.5) / this.zoom
      if (sel) ctx.setLineDash([6 / this.zoom, 4 / this.zoom])
      ctx.strokeRect(x, y, w, h)
      ctx.setLineDash([])
    }

    // Ghost preview (2-click)
    const p = this.collisionPreview
    if (p && s.selectedZoneDefType) {
      const def = zoneDefs.find(d => d.type === s.selectedZoneDefType)
      if (def) {
        const minR = Math.min(p.sR, p.eR), maxR = Math.max(p.sR, p.eR)
        const minC = Math.min(p.sC, p.eC), maxC = Math.max(p.sC, p.eC)
        const w = (maxC - minC + 1) * C, h = (maxR - minR + 1) * C
        ctx.fillStyle = colorWithAlpha(def.color, 0.3)
        ctx.fillRect(minC * C, minR * C, w, h)
        ctx.strokeStyle = colorWithAlpha(def.color, 0.7)
        ctx.lineWidth = 2 / this.zoom
        ctx.setLineDash([4 / this.zoom, 4 / this.zoom])
        ctx.strokeRect(minC * C, minR * C, w, h)
        ctx.setLineDash([])
      }
    }
  }

  // ─── Draw Resize ───────────────────────────────────

  private drawResize(ctx: CanvasRenderingContext2D, s: EditorState) {
    const { gridCols, gridRows, tileSize } = s
    const mapW = gridCols * tileSize
    const mapH = gridRows * tileSize

    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(0, 0, mapW, mapH)
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 2 / this.zoom
    ctx.setLineDash([6 / this.zoom, 4 / this.zoom])
    ctx.strokeRect(0, 0, mapW, mapH)
    ctx.setLineDash([])

    const hs = 10 / this.zoom
    const positions: [string, number, number][] = [
      ['nw', 0, 0], ['n', mapW / 2, 0], ['ne', mapW, 0],
      ['w', 0, mapH / 2], ['e', mapW, mapH / 2],
      ['sw', 0, mapH], ['s', mapW / 2, mapH], ['se', mapW, mapH],
    ]
    for (const [id, hx, hy] of positions) {
      ctx.fillStyle = this.hoveredHandle === id ? '#38bdf8' : '#ffffff'
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs)
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 1.5 / this.zoom
      ctx.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs)
    }

    const aL = 16 / this.zoom, aW = 5 / this.zoom, gap = 4 / this.zoom
    ctx.fillStyle = 'rgba(56,189,248,0.6)'
    ctx.beginPath(); ctx.moveTo(mapW / 2, -aL - gap); ctx.lineTo(mapW / 2 - aW, -gap); ctx.lineTo(mapW / 2 + aW, -gap); ctx.fill()
    ctx.beginPath(); ctx.moveTo(mapW / 2, mapH + aL + gap); ctx.lineTo(mapW / 2 - aW, mapH + gap); ctx.lineTo(mapW / 2 + aW, mapH + gap); ctx.fill()
    ctx.beginPath(); ctx.moveTo(-aL - gap, mapH / 2); ctx.lineTo(-gap, mapH / 2 - aW); ctx.lineTo(-gap, mapH / 2 + aW); ctx.fill()
    ctx.beginPath(); ctx.moveTo(mapW + aL + gap, mapH / 2); ctx.lineTo(mapW + gap, mapH / 2 - aW); ctx.lineTo(mapW + gap, mapH / 2 + aW); ctx.fill()

    const fs = Math.max(12, 14 / this.zoom)
    ctx.fillStyle = 'rgba(56,189,248,0.9)'
    ctx.font = `${fs}px 'Courier New', monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${gridCols} x ${gridRows}`, mapW / 2, mapH / 2)
  }
}

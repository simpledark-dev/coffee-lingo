import { getDefVisual } from '../../types/entity'
import type { EntityDef } from '../../types/entity'
import type { ZoneDef } from '../../types/collision'

const COLLISION_CELL = 4
const PADDING_CELLS = 10

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

interface EntityZone {
  type: string
  row: number  // collision cells relative to entity origin
  col: number
  width: number
  height: number
}

export class CollisionEditorOverlay {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private rafId = 0
  private running = false
  private w = 0
  private h = 0

  private entityDef: EntityDef | null = null
  private tilesetImages: Map<string, HTMLImageElement> = new Map()
  private tileSize = 32

  // Zone defs (synced from React state)
  private zoneDefs: ZoneDef[] = []
  private selectedZoneDefType: string | null = null

  // Zones on this entity
  private zones: EntityZone[] = []
  private selectedZoneIdx = -1

  // Viewport
  private scale = 1
  private offsetX = 0
  private offsetY = 0

  // Pan/zoom
  private isPanning = false
  private lastPan = { x: 0, y: 0 }

  // 2-click drawing
  private clickStart: { r: number; c: number } | null = null
  private preview: { sR: number; sC: number; eR: number; eC: number } | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
  }

  open(entityDef: EntityDef, tileSize: number, images: Map<string, HTMLImageElement>) {
    this.entityDef = entityDef
    this.tileSize = tileSize
    this.tilesetImages = images
    this.zones = entityDef.collision?.zones ? entityDef.collision.zones.map(z => ({ ...z })) : []
    this.selectedZoneIdx = -1
    this.clickStart = null
    this.preview = null
    this.computeViewport()
    this.running = true
    this.loop()
  }

  close() {
    this.running = false
    cancelAnimationFrame(this.rafId)
    this.entityDef = null
    this.clickStart = null
    this.preview = null
  }

  syncState(zoneDefs: ZoneDef[], selectedZoneDefType: string | null) {
    this.zoneDefs = zoneDefs
    this.selectedZoneDefType = selectedZoneDefType
  }

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = w * dpr
    this.canvas.height = h * dpr
    this.computeViewport()
    this.render()
  }

  getZones(): EntityZone[] {
    return this.zones.map(z => ({ ...z }))
  }

  clearZones() {
    this.zones = []
    this.selectedZoneIdx = -1
  }

  deleteSelected() {
    if (this.selectedZoneIdx >= 0) {
      this.zones.splice(this.selectedZoneIdx, 1)
      this.selectedZoneIdx = -1
    }
  }

  // ─── Viewport ─────────────────────────────────────

  private computeViewport() {
    if (!this.entityDef || this.w === 0 || this.h === 0) return
    const ts = this.tileSize
    const totalW = getDefVisual(this.entityDef).width * ts + PADDING_CELLS * COLLISION_CELL * 2
    const totalH = getDefVisual(this.entityDef).height * ts + PADDING_CELLS * COLLISION_CELL * 2
    const margin = 80
    this.scale = Math.min((this.w - margin) / totalW, (this.h - margin) / totalH, 8)
    this.offsetX = (this.w - totalW * this.scale) / 2 + PADDING_CELLS * COLLISION_CELL * this.scale
    this.offsetY = (this.h - totalH * this.scale) / 2 + PADDING_CELLS * COLLISION_CELL * this.scale
  }

  // ─── Pointer events ───────────────────────────────

  private screenToCell(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect()
    const px = (clientX - rect.left - this.offsetX) / this.scale
    const py = (clientY - rect.top - this.offsetY) / this.scale
    return { r: Math.floor(py / COLLISION_CELL), c: Math.floor(px / COLLISION_CELL) }
  }

  onWheel(e: WheelEvent) {
    e.preventDefault()
    const rect = this.canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const newScale = Math.max(0.5, Math.min(20, this.scale * factor))
    const ratio = newScale / this.scale
    this.offsetX = mx - (mx - this.offsetX) * ratio
    this.offsetY = my - (my - this.offsetY) * ratio
    this.scale = newScale
  }

  onPointerDown(e: PointerEvent) {
    // Middle mouse → pan
    if (e.button === 1) {
      e.preventDefault()
      this.isPanning = true
      this.lastPan = { x: e.clientX, y: e.clientY }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    if (e.button !== 0) return
    const cell = this.screenToCell(e.clientX, e.clientY)

    // If zone def selected → 2-click draw
    if (this.selectedZoneDefType) {
      if (!this.clickStart) {
        this.clickStart = cell
        this.preview = { sR: cell.r, sC: cell.c, eR: cell.r, eC: cell.c }
      } else {
        // Finalize
        const minR = Math.min(this.clickStart.r, cell.r)
        const maxR = Math.max(this.clickStart.r, cell.r)
        const minC = Math.min(this.clickStart.c, cell.c)
        const maxC = Math.max(this.clickStart.c, cell.c)
        this.zones.push({
          type: this.selectedZoneDefType,
          row: minR, col: minC,
          width: maxC - minC + 1,
          height: maxR - minR + 1,
        })
        this.clickStart = null
        this.preview = null
      }
      return
    }

    // No zone def selected → try select existing zone
    const idx = this.findZoneAt(cell.r, cell.c)
    this.selectedZoneIdx = idx
  }

  onPointerMove(e: PointerEvent) {
    // Pan
    if (this.isPanning) {
      const dx = e.clientX - this.lastPan.x
      const dy = e.clientY - this.lastPan.y
      this.lastPan = { x: e.clientX, y: e.clientY }
      this.offsetX += dx
      this.offsetY += dy
      return
    }

    if (!this.clickStart || !this.selectedZoneDefType) return
    const cell = this.screenToCell(e.clientX, e.clientY)
    this.preview = { sR: this.clickStart.r, sC: this.clickStart.c, eR: cell.r, eC: cell.c }
  }

  onPointerUp(e?: PointerEvent) {
    if (e?.button === 1) { this.isPanning = false; return }
    this.isPanning = false
  }

  private findZoneAt(r: number, c: number): number {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i]
      if (r >= z.row && r < z.row + z.height && c >= z.col && c < z.col + z.width) return i
    }
    return -1
  }

  // ─── Render ───────────────────────────────────────

  private loop() {
    if (!this.running) return
    this.render()
    this.rafId = requestAnimationFrame(() => this.loop())
  }

  private render() {
    const ctx = this.ctx
    if (!this.entityDef || this.w === 0) return

    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, this.w, this.h)

    ctx.save()
    ctx.translate(this.offsetX, this.offsetY)
    ctx.scale(this.scale, this.scale)
    ctx.imageSmoothingEnabled = false

    const def = this.entityDef
    const ts = this.tileSize
    const ew = getDefVisual(def).width * ts
    const eh = getDefVisual(def).height * ts
    const pad = PADDING_CELLS * COLLISION_CELL

    // Background
    ctx.fillStyle = '#111118'
    ctx.fillRect(-pad, -pad, ew + pad * 2, eh + pad * 2)

    // Entity footprint
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, ew, eh)

    // Sprite
    const img = this.tilesetImages.get(getDefVisual(def).assetId)
    if (img) {
      const tsCols = Math.floor(img.naturalWidth / ts)
      if (tsCols > 0) {
        const tileIndex = getDefVisual(def).tileIndex ?? 0
        const baseCol = tileIndex % tsCols
        const baseRow = Math.floor(tileIndex / tsCols)
        for (let dr = 0; dr < getDefVisual(def).height; dr++) {
          for (let dc = 0; dc < getDefVisual(def).width; dc++) {
            ctx.drawImage(img, (baseCol + dc) * ts, (baseRow + dr) * ts, ts, ts, dc * ts, dr * ts, ts, ts)
          }
        }
      }
    }

    // Grid
    const C = COLLISION_CELL
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 0.5 / this.scale
    const totalCellsW = Math.ceil(ew / C) + PADDING_CELLS * 2
    const totalCellsH = Math.ceil(eh / C) + PADDING_CELLS * 2
    for (let i = 0; i <= totalCellsH; i++) {
      const y = (i - PADDING_CELLS) * C
      ctx.beginPath(); ctx.moveTo(-pad, y); ctx.lineTo(ew + pad, y); ctx.stroke()
    }
    for (let i = 0; i <= totalCellsW; i++) {
      const x = (i - PADDING_CELLS) * C
      ctx.beginPath(); ctx.moveTo(x, -pad); ctx.lineTo(x, eh + pad); ctx.stroke()
    }

    // Entity footprint border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1 / this.scale
    ctx.setLineDash([3 / this.scale, 3 / this.scale])
    ctx.strokeRect(0, 0, ew, eh)
    ctx.setLineDash([])

    // Placed zones
    for (let i = 0; i < this.zones.length; i++) {
      const z = this.zones[i]
      const zDef = this.zoneDefs.find(d => d.type === z.type)
      const color = zDef?.color ?? '#888'
      const sel = i === this.selectedZoneIdx
      const x = z.col * C, y = z.row * C, w = z.width * C, h = z.height * C
      ctx.fillStyle = colorWithAlpha(color, 0.35)
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = colorWithAlpha(color, sel ? 0.9 : 0.7)
      ctx.lineWidth = (sel ? 3 : 1.5) / this.scale
      if (sel) ctx.setLineDash([6 / this.scale, 4 / this.scale])
      ctx.strokeRect(x, y, w, h)
      ctx.setLineDash([])
    }

    // Preview
    if (this.preview && this.selectedZoneDefType) {
      const zDef = this.zoneDefs.find(d => d.type === this.selectedZoneDefType)
      if (zDef) {
        const p = this.preview
        const minR = Math.min(p.sR, p.eR), maxR = Math.max(p.sR, p.eR)
        const minC = Math.min(p.sC, p.eC), maxC = Math.max(p.sC, p.eC)
        const w = (maxC - minC + 1) * C, h = (maxR - minR + 1) * C
        ctx.fillStyle = colorWithAlpha(zDef.color, 0.3)
        ctx.fillRect(minC * C, minR * C, w, h)
        ctx.strokeStyle = colorWithAlpha(zDef.color, 0.7)
        ctx.lineWidth = 2 / this.scale
        ctx.setLineDash([4 / this.scale, 4 / this.scale])
        ctx.strokeRect(minC * C, minR * C, w, h)
        ctx.setLineDash([])
      }
    }

    ctx.restore()
  }

  destroy() { this.close() }
}

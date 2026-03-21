import { useState, useCallback, useEffect, useRef } from 'react'
import { Plus, Trash2, Search, Pencil, Check } from 'lucide-react'
import { useDialog } from '../components/Dialog'
import { useEntityContext } from '../state/EntityContext'
import { useEntityImages } from '../state/useEntityImages'
import { useProject } from '../state/ProjectContext'
import { useTilesetConfigs, useTilesetNames, useTilesetImages } from '../state/TilesetContext'
import { EntityTilePicker } from '../components/entity/EntityTilePicker'
import { AnimationCanvas } from '../components/entity/AnimationCanvas'
import { computeAnimFrames } from '../types/entity'
import { getAssetBlobUrl } from '../storage/blobUrlCache'
import type { EntityDef, EntityVisual } from '../types/entity'

export function EntityManagerPage() {
  const { entityDefs, addEntityDef, updateEntityDef, deleteEntityDef } = useEntityContext()
  const { currentProject } = useProject()
  const { confirm } = useDialog()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const selected = entityDefs.find(d => d.id === selectedId) ?? null

  const filtered = entityDefs.filter(d => {
    if (!search) return true
    return d.name.toLowerCase().includes(search.toLowerCase())
  })

  const handleCreate = useCallback(async () => {
    const def = await addEntityDef({
      name: 'New Entity',
      type: '', tags: [], description: '',
      visual: { mode: 'static', assetId: '', width: 1, height: 1 },
      properties: {},
    })
    setSelectedId(def.id)
  }, [addEntityDef])

  const handleDelete = useCallback(async (id: string) => {
    if (!await confirm('Delete Entity', 'Delete this entity definition?')) return
    await deleteEntityDef(id)
    if (selectedId === id) setSelectedId(null)
  }, [deleteEntityDef, selectedId])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: entity list */}
      <div className="min-w-56 shrink-0 flex flex-col border-r border-neutral-700">
        <div className="p-2 border-b border-neutral-700 flex gap-2">
          <div className="flex-1 flex items-center gap-1 px-2 bg-neutral-800 border border-neutral-700">
            <Search size={12} className="text-neutral-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..." className="flex-1 py-1 bg-transparent text-xs text-neutral-200 focus:outline-none" />
          </div>
          <button onClick={handleCreate} className="flex items-center gap-1 px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs">
            <Plus size={12} /> New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-neutral-500 text-xs text-center">
              {entityDefs.length === 0 ? 'No entities yet.' : 'No matches.'}
            </div>
          ) : filtered.map(d => (
            <button key={d.id} onClick={() => setSelectedId(d.id)}
              className={`w-full text-left px-3 py-2 border-b border-neutral-800 flex items-center gap-2 group hover:bg-neutral-800 ${selectedId === d.id ? 'bg-neutral-800 border-l-2 border-l-sky-500' : ''}`}>
              <EntityThumb def={d} tileSize={currentProject?.tileSize ?? 32} size={28} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-neutral-200 truncate">{d.name}</div>
                <div className="text-[10px] text-neutral-500">
                  {d.visual.mode === 'static' ? `${d.visual.width}x${d.visual.height}` : `anim · ${d.visual.frameCount ?? 1}f`}
                </div>
              </div>
              <div onClick={e => { e.stopPropagation(); handleDelete(d.id) }}
                className="p-1 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 cursor-pointer">
                <Trash2 size={11} />
              </div>
            </button>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-neutral-700 text-xs text-neutral-500">
          {entityDefs.length} entit{entityDefs.length !== 1 ? 'ies' : 'y'}
        </div>
      </div>

      {/* Right */}
      <div className="flex-1 flex flex-col overflow-hidden bg-neutral-900">
        {selected ? (
          <EntityDetailEditor key={selected.id} def={selected} onUpdate={updateEntityDef} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-600 text-sm">
            Select an entity to edit
          </div>
        )}
      </div>
    </div>
  )
}

// ── Detail Editor with Edit/View modes ───────────────────

function EntityDetailEditor({ def, onUpdate }: { def: EntityDef; onUpdate: (d: EntityDef) => Promise<void> }) {
  const { assets, currentProject } = useProject()
  const tilesetConfigs = useTilesetConfigs()
  const tilesetNames = useTilesetNames()
  const tilesetImages = useTilesetImages()
  const tileSize = currentProject?.tileSize ?? 32

  const [name, setName] = useState(def.name)
  const [visual, setVisual] = useState<EntityVisual>({ ...def.visual })
  const [editing, setEditing] = useState(!def.visual.assetId) // start in edit mode if no asset

  // Sprite sheet image for animated mode
  const [sheetImage, setSheetImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    setName(def.name)
    setVisual({ ...def.visual })
    setEditing(!def.visual.assetId)
  }, [def.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load sprite sheet image
  useEffect(() => {
    if (!visual.assetId) { setSheetImage(null); return }
    // Try tileset images first
    const existing = tilesetImages.get(visual.assetId)
    if (existing) { setSheetImage(existing); return }
    // Fallback: load from blob URL
    let cancelled = false
    getAssetBlobUrl(visual.assetId).then(url => {
      if (cancelled) return
      const img = new Image()
      img.onload = () => { if (!cancelled) setSheetImage(img) }
      img.src = url
    }).catch(() => {})
    return () => { cancelled = true }
  }, [visual.assetId, tilesetImages])

  const saveDef = useCallback(async (v: EntityVisual, n?: string) => {
    await onUpdate({ ...def, name: (n ?? name).trim() || def.name, visual: v })
  }, [def, name, onUpdate])

  const handleDone = useCallback(() => {
    saveDef(visual, name)
    setEditing(false)
  }, [saveDef, visual, name])

  const spriteSheetAssets = assets.filter(a => a.category === 'sprite-sheet')
  const isConfigured = visual.assetId && visual.tileIndex != null

  if (editing) {
    return <EditMode
      name={name} setName={setName}
      visual={visual} setVisual={setVisual}
      tileSize={tileSize}
      tilesetConfigs={tilesetConfigs} tilesetNames={tilesetNames}
      spriteSheetAssets={spriteSheetAssets}
      isConfigured={!!isConfigured}
      onDone={handleDone}
      onCancel={() => { setName(def.name); setVisual({ ...def.visual }); setEditing(false) }}
    />
  }

  return <ViewMode
    visual={visual} name={name}
    tileSize={tileSize} image={sheetImage}
    onEdit={() => setEditing(true)}
  />
}

// ── Edit Mode: tile picker + config ──────────────────────

function EditMode({ name, setName, visual, setVisual, tileSize, tilesetConfigs, tilesetNames, spriteSheetAssets, isConfigured, onDone, onCancel }: {
  name: string; setName: (n: string) => void
  visual: EntityVisual; setVisual: (fn: (v: EntityVisual) => EntityVisual) => void
  tileSize: number
  tilesetConfigs: { id: string; src: string }[]
  tilesetNames: Map<string, string>
  spriteSheetAssets: { id: string; name: string }[]
  isConfigured: boolean
  onDone: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-neutral-700 bg-neutral-800 flex-wrap">
        <input value={name} onChange={e => setName(e.target.value)}
          className="px-2 py-1 bg-neutral-900 border border-neutral-700 text-sm text-neutral-100 w-44 focus:outline-none focus:border-sky-500"
          placeholder="Entity name" />

        <div className="flex gap-0.5">
          <button onClick={() => setVisual(v => ({ ...v, mode: 'static' }))}
            className={`px-2.5 py-1 text-xs border ${visual.mode === 'static' ? 'bg-sky-700 border-sky-600 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'}`}>
            Static</button>
          <button onClick={() => setVisual(v => ({ ...v, mode: 'animated', frameCount: v.frameCount ?? 1 }))}
            className={`px-2.5 py-1 text-xs border ${visual.mode === 'animated' ? 'bg-sky-700 border-sky-600 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'}`}>
            Animated</button>
        </div>

        <div className="w-px h-5 bg-neutral-700" />

        {visual.mode === 'static' ? (
          <select value={visual.assetId}
            onChange={e => setVisual(v => ({ ...v, assetId: e.target.value, tileIndex: 0 }))}
            className="px-2 py-1 bg-neutral-900 border border-neutral-700 text-xs text-neutral-200">
            <option value="">-- Tileset --</option>
            {tilesetConfigs.map(t => (
              <option key={t.id} value={t.id}>{tilesetNames.get(t.id) ?? t.id}</option>
            ))}
          </select>
        ) : (
          <select value={visual.assetId}
            onChange={e => setVisual(v => ({ ...v, assetId: e.target.value, tileIndex: 0, frameCount: 1 }))}
            className="px-2 py-1 bg-neutral-900 border border-neutral-700 text-xs text-neutral-200">
            <option value="">-- Sprite Sheet --</option>
            {spriteSheetAssets.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}

        {visual.mode === 'animated' && (
          <>
            <div className="flex items-center gap-1 text-xs text-neutral-400">
              <span>Frames</span>
              <input type="number" min={1} value={visual.frameCount ?? 1}
                onChange={e => setVisual(v => ({ ...v, frameCount: Math.max(1, +e.target.value || 1) }))}
                className="w-12 px-1 py-0.5 bg-neutral-900 border border-neutral-700 text-xs text-neutral-200 text-center" />
            </div>
            <div className="flex items-center gap-1 text-xs text-neutral-400">
              <span>ms</span>
              <input type="number" min={16} value={visual.frameDuration ?? 100}
                onChange={e => setVisual(v => ({ ...v, frameDuration: +e.target.value || 100 }))}
                className="w-14 px-1 py-0.5 bg-neutral-900 border border-neutral-700 text-xs text-neutral-200 text-center" />
            </div>
            <select value={visual.loop ?? 'loop'}
              onChange={e => setVisual(v => ({ ...v, loop: e.target.value as EntityVisual['loop'] }))}
              className="px-2 py-1 bg-neutral-900 border border-neutral-700 text-xs text-neutral-200">
              <option value="loop">Loop</option>
              <option value="pingpong">Pingpong</option>
              <option value="once">Once</option>
            </select>
          </>
        )}

        {visual.tileIndex != null && (
          <span className="text-xs text-neutral-500">
            {visual.width}x{visual.height} tiles
            {visual.mode === 'animated' && ` · ${visual.frameCount ?? 1} frames`}
          </span>
        )}

        <div className="flex-1" />

        <button onClick={onCancel}
          className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 text-xs border border-neutral-600">
          Cancel
        </button>
        <button onClick={onDone} disabled={!isConfigured}
          className="flex items-center gap-1.5 px-3 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs">
          <Check size={12} /> Done
        </button>
      </div>

      {/* Tile picker */}
      <PickerArea
        visual={visual}
        tileSize={tileSize}
        onSelect={sel => setVisual(v => ({ ...v, tileIndex: sel.tileIndex, width: sel.w, height: sel.h }))}
      />
    </div>
  )
}

// ── View Mode: animation preview + frame strip ───────────

function ViewMode({ visual, name, tileSize, image, onEdit }: {
  visual: EntityVisual; name: string
  tileSize: number; image: HTMLImageElement | null
  onEdit: () => void
}) {
  const sheetCols = image ? Math.floor(image.naturalWidth / tileSize) : 0
  const frames = visual.mode === 'animated' ? computeAnimFrames(visual, sheetCols) : [visual.tileIndex ?? 0]
  const [currentFrame, setCurrentFrame] = useState(0)
  const [forcedFrame, setForcedFrame] = useState<number | null>(null)

  const handleFrameClick = (i: number) => {
    // Click same frame again → resume playing
    if (forcedFrame === i) {
      setForcedFrame(null)
    } else {
      setForcedFrame(i)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-neutral-700 bg-neutral-800">
        <span className="text-sm text-neutral-100 font-bold">{name}</span>
        <span className="text-xs text-neutral-500">
          {visual.mode === 'static' ? `Static · ${visual.width}x${visual.height}` : `Animated · ${frames.length} frames · ${visual.frameDuration ?? 100}ms`}
        </span>
        <div className="flex-1" />
        <button onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-xs border border-neutral-600">
          <Pencil size={12} /> Edit
        </button>
      </div>

      {/* Center: large animation canvas */}
      <div className="flex-1 min-h-0">
        {image ? (
          <AnimationCanvas
            visual={visual} image={image} tileSize={tileSize}
            onFrameChange={setCurrentFrame}
            forcedFrame={forcedFrame}
            onClearForced={() => setForcedFrame(null)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-950 text-neutral-600 text-xs">No image</div>
        )}
      </div>

      {/* Bottom: frame strip */}
      {visual.mode === 'animated' && frames.length > 1 && image && (
        <div className="shrink-0 border-t border-neutral-700 bg-neutral-800 px-2 py-2">
          <div className="flex gap-1 overflow-x-auto">
            {frames.map((tileIdx, i) => (
              <FrameThumb
                key={i}
                index={i}
                tileIndex={tileIdx}
                frameW={visual.width}
                frameH={visual.height}
                tileSize={tileSize}
                image={image}
                active={forcedFrame != null ? forcedFrame === i : currentFrame === i}
                onClick={() => handleFrameClick(i)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Frame thumbnail for the strip ────────────────────────

function FrameThumb({ index, tileIndex, frameW, frameH, tileSize, image, active, onClick }: {
  index: number; tileIndex: number; frameW: number; frameH: number
  tileSize: number; image: HTMLImageElement; active: boolean; onClick: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const thumbSize = 48

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = thumbSize * dpr
    canvas.height = thumbSize * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, thumbSize, thumbSize)
    ctx.imageSmoothingEnabled = false

    const cols = Math.floor(image.naturalWidth / tileSize)
    if (cols <= 0) return
    const baseCol = tileIndex % cols
    const baseRow = Math.floor(tileIndex / cols)
    const w = frameW * tileSize, h = frameH * tileSize
    const scale = Math.min(thumbSize / w, thumbSize / h)
    const dw = w * scale, dh = h * scale
    const ox = (thumbSize - dw) / 2, oy = (thumbSize - dh) / 2

    for (let dr = 0; dr < frameH; dr++) {
      for (let dc = 0; dc < frameW; dc++) {
        ctx.drawImage(image,
          (baseCol + dc) * tileSize, (baseRow + dr) * tileSize, tileSize, tileSize,
          ox + dc * (dw / frameW), oy + dr * (dh / frameH), dw / frameW, dh / frameH)
      }
    }
  }, [tileIndex, frameW, frameH, tileSize, image])

  return (
    <div onClick={onClick}
      className={`shrink-0 flex flex-col items-center gap-0.5 cursor-pointer p-1 border ${active ? 'border-sky-500 bg-sky-900/30' : 'border-neutral-700 hover:border-neutral-500'}`}>
      <canvas ref={canvasRef} style={{ width: thumbSize, height: thumbSize, imageRendering: 'pixelated' }} />
      <span className="text-[9px] text-neutral-500">{index}</span>
    </div>
  )
}

// ── Picker area with explicit sizing ─────────────────────

function PickerArea({ visual, tileSize, onSelect }: {
  visual: EntityVisual; tileSize: number
  onSelect: (sel: { tileIndex: number; w: number; h: number }) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ w: Math.round(width), h: Math.round(height) })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="flex-1 min-h-0">
      {size.w > 0 && size.h > 0 && (
        <div className="bg-neutral-950" style={{ width: size.w, height: size.h }}>
          {visual.assetId ? (
            <EntityTilePicker
              assetId={visual.assetId}
              tileSize={tileSize}
              selection={visual.tileIndex != null ? { tileIndex: visual.tileIndex, w: visual.width, h: visual.height } : null}
              onSelect={onSelect}
              frameCount={visual.mode === 'animated' ? visual.frameCount : undefined}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">
              Select an asset above
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Animated thumbnail for entity list ───────────────────

function EntityThumb({ def, tileSize, size = 28 }: { def: EntityDef; tileSize: number; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const entityImages = useEntityImages()
  const [frameIdx, setFrameIdx] = useState(0)
  const rafId = useRef(0)
  const lastTime = useRef(0)

  const img = entityImages.get(def.visual.assetId)
  const sheetCols = img ? Math.floor(img.naturalWidth / tileSize) : 0
  const frames = def.visual.mode === 'animated' ? computeAnimFrames(def.visual, sheetCols) : []
  const isAnimated = frames.length > 1

  const tick = useCallback((time: number) => {
    if (!lastTime.current) lastTime.current = time
    if (time - lastTime.current >= (def.visual.frameDuration ?? 100)) {
      lastTime.current = time
      setFrameIdx(prev => (prev + 1) % frames.length)
    }
    rafId.current = requestAnimationFrame(tick)
  }, [frames.length, def.visual.frameDuration])

  useEffect(() => {
    if (isAnimated) { rafId.current = requestAnimationFrame(tick) }
    return () => cancelAnimationFrame(rafId.current)
  }, [isAnimated, tick])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !img || sheetCols <= 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, size, size)
    ctx.imageSmoothingEnabled = false

    const tileIndex = isAnimated ? frames[frameIdx % frames.length] : (def.visual.tileIndex ?? 0)
    const baseCol = tileIndex % sheetCols
    const baseRow = Math.floor(tileIndex / sheetCols)
    const pw = size * def.visual.width, ph = size * def.visual.height
    const scale = Math.min(size / pw, size / ph)
    const dw = pw * scale, dh = ph * scale
    const ox = (size - dw) / 2, oy = (size - dh) / 2
    const cellW = dw / def.visual.width, cellH = dh / def.visual.height

    for (let dr = 0; dr < def.visual.height; dr++) {
      for (let dc = 0; dc < def.visual.width; dc++) {
        ctx.drawImage(img, (baseCol + dc) * tileSize, (baseRow + dr) * tileSize, tileSize, tileSize,
          ox + dc * cellW, oy + dr * cellH, cellW, cellH)
      }
    }
  }, [def, tileSize, img, sheetCols, frameIdx, frames, isAnimated, size])

  return <canvas ref={canvasRef} style={{ width: size, height: size, imageRendering: 'pixelated' }} className="shrink-0 bg-neutral-700" />
}

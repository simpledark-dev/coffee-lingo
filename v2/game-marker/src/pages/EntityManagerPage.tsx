import { useState, useCallback, useEffect, useRef } from 'react'
import { Plus, Trash2, Search, Pencil, Check } from 'lucide-react'
import { useDialog } from '../components/Dialog'
import { useEntityContext } from '../state/EntityContext'
import { useEntityImages } from '../state/useEntityImages'
import { useProject } from '../state/ProjectContext'
import { useTilesetConfigs, useTilesetNames, useTilesetImages } from '../state/TilesetContext'
import { EntityTilePicker } from '../components/entity/EntityTilePicker'
import { CompositeTileEditor } from '../components/entity/CompositeTileEditor'
import { AssetPicker } from '../components/AssetPicker'
import { AnimationCanvas } from '../components/entity/AnimationCanvas'
import { computeAnimFrames, getDefVisual, createTilesGrid, resizeTilesGrid } from '../types/entity'
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
      states: { default: { mode: 'static', assetId: '', width: 1, height: 1 } },
      defaultState: 'default',
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
                  {Object.keys(d.states).length} state{Object.keys(d.states).length !== 1 ? 's' : ''}
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
  const [selectedState, setSelectedState] = useState(def.defaultState)
  const [visual, setVisual] = useState<EntityVisual>({ ...getDefVisual(def) })
  const [editing, setEditing] = useState(!getDefVisual(def).assetId)

  const stateNames = Object.keys(def.states)

  // Sprite sheet image
  const [sheetImage, setSheetImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    setName(def.name)
    setSelectedState(def.defaultState)
    setVisual({ ...getDefVisual(def) })
    setEditing(!getDefVisual(def).assetId)
  }, [def.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // When switching states, load that state's visual
  useEffect(() => {
    const v = def.states[selectedState]
    if (v) setVisual({ ...v })
  }, [selectedState]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load sprite sheet image
  useEffect(() => {
    if (!visual.assetId) { setSheetImage(null); return }
    const existing = tilesetImages.get(visual.assetId)
    if (existing) { setSheetImage(existing); return }
    let cancelled = false
    getAssetBlobUrl(visual.assetId).then(url => {
      if (cancelled) return
      const img = new Image()
      img.onload = () => { if (!cancelled) setSheetImage(img) }
      img.src = url
    }).catch(() => {})
    return () => { cancelled = true }
  }, [visual.assetId, tilesetImages])

  const saveState = useCallback(async (v: EntityVisual) => {
    const newStates = { ...def.states, [selectedState]: v }
    await onUpdate({ ...def, name: name.trim() || def.name, states: newStates })
  }, [def, name, selectedState, onUpdate])

  const handleDone = useCallback(() => {
    saveState(visual)
    setEditing(false)
  }, [saveState, visual])

  const handleAddState = useCallback(async (stateName: string) => {
    const key = stateName.trim()
    if (!key || def.states[key]) return
    const newStates = { ...def.states, [key]: { mode: 'static' as const, assetId: '', width: 1, height: 1 } }
    await onUpdate({ ...def, states: newStates })
    setSelectedState(key)
    setEditing(true)
  }, [def, onUpdate])

  const handleDeleteState = useCallback(async () => {
    if (stateNames.length <= 1) return
    if (selectedState === def.defaultState) return
    const newStates = { ...def.states }
    delete newStates[selectedState]
    await onUpdate({ ...def, states: newStates })
    setSelectedState(def.defaultState)
  }, [def, selectedState, stateNames, onUpdate])

  const handleSetDefault = useCallback(async () => {
    await onUpdate({ ...def, defaultState: selectedState })
  }, [def, selectedState, onUpdate])

  const handleRenameState = useCallback(async (oldName: string, newName: string) => {
    const key = newName.trim()
    if (!key || key === oldName || def.states[key]) return
    const newStates: Record<string, EntityVisual> = {}
    for (const [k, v] of Object.entries(def.states)) {
      newStates[k === oldName ? key : k] = v
    }
    const newDefault = def.defaultState === oldName ? key : def.defaultState
    await onUpdate({ ...def, states: newStates, defaultState: newDefault })
    if (selectedState === oldName) setSelectedState(key)
  }, [def, selectedState, onUpdate])

  const spriteSheetAssets = assets.filter(a => a.category === 'sprite-sheet')
  const isConfigured = visual.assetId && (visual.tileIndex != null || visual.tiles != null)

  if (editing) {
    return <EditMode
      name={name} setName={setName}
      visual={visual} setVisual={setVisual}
      tileSize={tileSize}
      tilesetConfigs={tilesetConfigs} tilesetNames={tilesetNames}
      spriteSheetAssets={spriteSheetAssets}
      isConfigured={!!isConfigured}
      stateName={selectedState}
      onDone={handleDone}
      onCancel={() => { setVisual({ ...def.states[selectedState] ?? getDefVisual(def) }); setEditing(false) }}
    />
  }

  return <ViewMode
    visual={visual} name={name}
    tileSize={tileSize} image={sheetImage}
    stateNames={stateNames}
    selectedState={selectedState}
    defaultState={def.defaultState}
    isDefault={selectedState === def.defaultState}
    onSelectState={setSelectedState}
    onAddState={handleAddState}
    onDeleteState={handleDeleteState}
    onSetDefault={handleSetDefault}
    onRenameState={handleRenameState}
    onEdit={() => setEditing(true)}
  />
}

// ── Edit Mode: tile picker + config ──────────────────────

function EditMode({ name, setName, visual, setVisual, tileSize, tilesetConfigs, tilesetNames, spriteSheetAssets, isConfigured, stateName, onDone, onCancel }: {
  name: string; setName: (n: string) => void
  visual: EntityVisual; setVisual: (fn: (v: EntityVisual) => EntityVisual) => void
  tileSize: number
  tilesetConfigs: { id: string; src: string }[]
  tilesetNames: Map<string, string>
  spriteSheetAssets: { id: string; name: string }[]
  isConfigured: boolean
  stateName: string
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

        <span className="px-2 py-0.5 bg-amber-900/50 border border-amber-700/50 text-amber-300 text-[12px]">
          {stateName}
        </span>

        <div className="flex gap-0.5">
          <button onClick={() => setVisual(v => ({ ...v, mode: 'static', tiles: undefined }))}
            className={`px-2.5 py-1 text-xs border ${visual.mode === 'static' && !visual.tiles ? 'bg-sky-700 border-sky-600 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'}`}>
            Static</button>
          <button onClick={() => setVisual(v => ({ ...v, mode: 'static', tiles: v.tiles ?? createTilesGrid(v.width, v.height) }))}
            className={`px-2.5 py-1 text-xs border ${visual.mode === 'static' && visual.tiles ? 'bg-purple-700 border-purple-600 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'}`}>
            Composite</button>
          <button onClick={() => setVisual(v => ({ ...v, mode: 'animated', tiles: undefined, frameCount: v.frameCount ?? 1 }))}
            className={`px-2.5 py-1 text-xs border ${visual.mode === 'animated' ? 'bg-sky-700 border-sky-600 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'}`}>
            Animated</button>
        </div>

        <div className="w-px h-5 bg-neutral-700" />

        <AssetPicker
          value={visual.assetId}
          onChange={id => setVisual(v => ({ ...v, assetId: id, tileIndex: 0, ...(v.mode === 'animated' ? { frameCount: 1 } : {}) }))}
          categories={['tileset', 'sprite-sheet']}
        />

        {visual.mode === 'animated' && (
          <>
            <div className="flex items-center gap-1 text-xs text-neutral-400">
              <span>Frames</span>
              <input type="number" min={1} value={visual.frameCount ?? 1}
                onChange={e => setVisual(v => ({ ...v, frameCount: Math.max(1, +e.target.value || 1) }))}
                className="w-12 px-1 py-0.5 bg-neutral-900 border border-neutral-700 text-xs text-neutral-200 text-center" />
            </div>
            <div className="flex items-center gap-1 text-xs text-neutral-400">
              <span>Gap</span>
              <input type="number" min={0} value={visual.frameGap ?? 0}
                onChange={e => setVisual(v => ({ ...v, frameGap: Math.max(0, +e.target.value || 0) }))}
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

        {visual.tiles && (
          <>
            <div className="flex items-center gap-1 text-xs text-neutral-400">
              <span>W</span>
              <input type="number" min={1} max={32} value={visual.width}
                onChange={e => { const w = Math.max(1, +e.target.value || 1); setVisual(v => ({ ...v, width: w, tiles: resizeTilesGrid(v.tiles!, w, v.height) })) }}
                className="w-12 px-1 py-0.5 bg-neutral-900 border border-neutral-700 text-xs text-neutral-200 text-center" />
            </div>
            <div className="flex items-center gap-1 text-xs text-neutral-400">
              <span>H</span>
              <input type="number" min={1} max={32} value={visual.height}
                onChange={e => { const h = Math.max(1, +e.target.value || 1); setVisual(v => ({ ...v, height: h, tiles: resizeTilesGrid(v.tiles!, v.width, h) })) }}
                className="w-12 px-1 py-0.5 bg-neutral-900 border border-neutral-700 text-xs text-neutral-200 text-center" />
            </div>
          </>
        )}

        {!visual.tiles && visual.tileIndex != null && (
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
        onTilesChange={tiles => setVisual(v => ({ ...v, tiles }))}
      />
    </div>
  )
}

// ── View Mode: animation preview + frame strip ───────────

function ViewMode({ visual, name, tileSize, image, stateNames, selectedState, defaultState, isDefault, onSelectState, onAddState, onDeleteState, onSetDefault, onRenameState, onEdit }: {
  visual: EntityVisual; name: string
  tileSize: number; image: HTMLImageElement | null
  stateNames: string[]; selectedState: string; defaultState: string; isDefault: boolean
  onSelectState: (s: string) => void
  onAddState: (name: string) => void; onDeleteState: () => void; onSetDefault: () => void
  onRenameState: (oldName: string, newName: string) => void; onEdit: () => void
}) {
  const sheetCols = image ? Math.floor(image.naturalWidth / tileSize) : 0
  const sheetRows = image ? Math.floor(image.naturalHeight / tileSize) : 0
  const frames = visual.mode === 'animated' ? computeAnimFrames(visual, sheetCols, sheetRows) : [visual.tileIndex ?? 0]
  const [currentFrame, setCurrentFrame] = useState(0)
  const [forcedFrame, setForcedFrame] = useState<number | null>(null)

  // Reset when visual changes (state switch)
  useEffect(() => { setForcedFrame(null); setCurrentFrame(0) }, [visual])

  const [addingState, setAddingState] = useState(false)
  const [newStateName, setNewStateName] = useState('')
  const [renamingState, setRenamingState] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const { confirm } = useDialog()

  const handleFrameClick = (i: number) => {
    if (forcedFrame === i) setForcedFrame(null)
    else setForcedFrame(i)
  }

  const handleDeleteState = async () => {
    if (await confirm('Delete State', `Delete state "${selectedState}"?`)) {
      onDeleteState()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-neutral-700 bg-neutral-800">
        <span className="text-sm text-neutral-100 font-bold">{name}</span>
        <span className="text-xs text-neutral-500">
          {visual.mode === 'static' ? `Static · ${visual.width}x${visual.height}` : `Animated · ${frames.length}f · ${visual.frameDuration ?? 100}ms`}
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

      {/* Bottom: states + frames strip */}
      <div className="shrink-0 border-t border-neutral-700 bg-neutral-800">
        {/* State tabs */}
        <div className="flex items-center gap-1 px-2 pt-2 pb-1">
          {stateNames.map(s => (
            renamingState === s ? (
              <div key={s} className="flex items-center gap-0.5">
                <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && renameValue.trim()) { onRenameState(s, renameValue.trim()); setRenamingState(null) }
                    if (e.key === 'Escape') setRenamingState(null)
                  }}
                  className="w-24 px-2 py-1 bg-neutral-900 border border-amber-600 text-xs text-neutral-200 focus:outline-none"
                  autoFocus />
                <button onClick={() => { if (renameValue.trim()) { onRenameState(s, renameValue.trim()); setRenamingState(null) } }}
                  className="px-1 py-1 text-green-400 hover:text-green-300"><Check size={14} /></button>
              </div>
            ) : (
              <button key={s}
                onClick={() => { onSelectState(s); setForcedFrame(null) }}
                onDoubleClick={() => { setRenamingState(s); setRenameValue(s) }}
                className={`px-3 py-1.5 text-xs border flex items-center gap-1.5 ${selectedState === s
                  ? 'bg-amber-800/60 border-amber-600 text-amber-200'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'}`}>
                {s}
                {s === defaultState && <span className="text-amber-500 ml-0.5">*</span>}
              </button>
            )
          ))}

          {addingState ? (
            <div className="flex items-center gap-1">
              <input value={newStateName} onChange={e => setNewStateName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newStateName.trim()) { onAddState(newStateName.trim()); setAddingState(false); setNewStateName('') }
                  if (e.key === 'Escape') { setAddingState(false); setNewStateName('') }
                }}
                placeholder="state name"
                className="w-28 px-2 py-1 bg-neutral-900 border border-neutral-600 text-xs text-neutral-200 focus:outline-none focus:border-sky-500"
                autoFocus />
              <button onClick={() => { if (newStateName.trim()) { onAddState(newStateName.trim()); setAddingState(false); setNewStateName('') } }}
                className="px-1.5 py-1 text-green-400 hover:text-green-300"><Check size={14} /></button>
              <button onClick={() => { setAddingState(false); setNewStateName('') }}
                className="px-1.5 py-1 text-xs text-neutral-500 hover:text-neutral-300">x</button>
            </div>
          ) : (
            <button onClick={() => setAddingState(true)}
              className="px-3 py-1.5 text-xs bg-neutral-800 border border-dashed border-neutral-600 text-neutral-500 hover:text-neutral-200 hover:border-neutral-400">
              + State
            </button>
          )}

          <div className="flex-1" />

          {!isDefault && (
            <button onClick={onSetDefault}
              className="text-xs px-2 py-1 text-neutral-500 hover:text-amber-300">
              Set Default
            </button>
          )}
          {!isDefault && stateNames.length > 1 && (
            <button onClick={handleDeleteState}
              className="text-xs px-2 py-1 text-neutral-500 hover:text-red-400">
              Delete
            </button>
          )}
        </div>

        {/* Frame strip (animated only) */}
        {visual.mode === 'animated' && frames.length > 1 && image && (
          <div className="px-2 pb-2 border-t border-neutral-700 pt-2">
            <div className="flex gap-1.5 overflow-x-auto">
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
    </div>
  )
}

// ── Frame thumbnail for the strip ────────────────────────

function FrameThumb({ index, tileIndex, frameW, frameH, tileSize, image, active, onClick }: {
  index: number; tileIndex: number; frameW: number; frameH: number
  tileSize: number; image: HTMLImageElement; active: boolean; onClick: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const thumbSize = 72

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

function PickerArea({ visual, tileSize, onSelect, onTilesChange }: {
  visual: EntityVisual; tileSize: number
  onSelect: (sel: { tileIndex: number; w: number; h: number }) => void
  onTilesChange?: (tiles: (number | null)[][]) => void
}) {
  const entityImages = useEntityImages()
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
        <div className="bg-neutral-950 relative" style={{ width: size.w, height: size.h }}>
          {!visual.assetId ? (
            <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">
              Select an asset above
            </div>
          ) : visual.tiles && onTilesChange ? (
            <CompositeTileEditor visual={visual} tileSize={tileSize} onChange={onTilesChange} />
          ) : (
            <>
              <EntityTilePicker
                assetId={visual.assetId}
                tileSize={tileSize}
                selection={visual.tileIndex != null ? { tileIndex: visual.tileIndex, w: visual.width, h: visual.height } : null}
                onSelect={onSelect}
                frameCount={visual.mode === 'animated' ? visual.frameCount : undefined}
                frameGap={visual.mode === 'animated' ? visual.frameGap : undefined}
              />
              {visual.tileIndex != null && (
                <div className="absolute bottom-4 right-4 z-10">
                  <EditPreviewMini visual={visual} tileSize={tileSize} images={entityImages} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Mini preview for edit mode (like minimap) ────────────

function EditPreviewMini({ visual, tileSize, images }: {
  visual: EntityVisual; tileSize: number; images: Map<string, HTMLImageElement>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frameIdx, setFrameIdx] = useState(0)
  const rafId = useRef(0)
  const lastTime = useRef(0)
  const previewSize = 128
  const [fallbackImg, setFallbackImg] = useState<HTMLImageElement | null>(null)

  // Load image from blob URL if not in images map
  useEffect(() => {
    if (!visual.assetId || images.has(visual.assetId)) { setFallbackImg(null); return }
    let cancelled = false
    getAssetBlobUrl(visual.assetId).then(url => {
      if (cancelled) return
      const i = new Image()
      i.onload = () => { if (!cancelled) setFallbackImg(i) }
      i.src = url
    }).catch(() => {})
    return () => { cancelled = true }
  }, [visual.assetId, images])

  const img = images.get(visual.assetId) ?? fallbackImg
  const sheetCols = img ? Math.floor(img.naturalWidth / tileSize) : 0
  const sheetRows = img ? Math.floor(img.naturalHeight / tileSize) : 0
  const frames = visual.mode === 'animated' ? computeAnimFrames(visual, sheetCols, sheetRows) : []
  const isAnimated = frames.length > 1
  const animLoop = visual.loop ?? 'loop'
  const [miniPlaying, setMiniPlaying] = useState(true)

  const tick = useCallback((time: number) => {
    if (!lastTime.current) lastTime.current = time
    if (time - lastTime.current >= (visual.frameDuration ?? 100)) {
      lastTime.current = time
      setFrameIdx(prev => {
        const next = prev + 1
        if (next >= frames.length) {
          if (animLoop === 'once') { setMiniPlaying(false); return prev }
          if (animLoop === 'pingpong') return Math.max(0, frames.length - 2)
          return 0
        }
        return next
      })
    }
    if (miniPlaying) rafId.current = requestAnimationFrame(tick)
  }, [frames.length, visual.frameDuration, animLoop, miniPlaying])

  useEffect(() => {
    if (isAnimated && miniPlaying) { lastTime.current = 0; rafId.current = requestAnimationFrame(tick) }
    return () => cancelAnimationFrame(rafId.current)
  }, [isAnimated, miniPlaying, tick])

  useEffect(() => { setFrameIdx(0); setMiniPlaying(true) }, [visual.tileIndex, visual.frameCount, visual.assetId, visual.loop, visual.frameDuration])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !img || sheetCols <= 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = previewSize * dpr
    canvas.height = previewSize * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, previewSize, previewSize)
    ctx.imageSmoothingEnabled = false

    const tileIndex = isAnimated ? frames[frameIdx % frames.length] : (visual.tileIndex ?? 0)
    const baseCol = tileIndex % sheetCols
    const baseRow = Math.floor(tileIndex / sheetCols)
    const pw = previewSize * visual.width, ph = previewSize * visual.height
    const scale = Math.min(previewSize / pw, previewSize / ph)
    const dw = pw * scale, dh = ph * scale
    const ox = (previewSize - dw) / 2, oy = (previewSize - dh) / 2
    const cellW = dw / visual.width, cellH = dh / visual.height

    for (let dr = 0; dr < visual.height; dr++) {
      for (let dc = 0; dc < visual.width; dc++) {
        let srcCol: number, srcRow: number
        if (visual.tiles) {
          const ti = visual.tiles[dr]?.[dc]
          if (ti == null) continue
          srcCol = ti % sheetCols; srcRow = Math.floor(ti / sheetCols)
        } else {
          srcCol = baseCol + dc; srcRow = baseRow + dr
        }
        ctx.drawImage(img, srcCol * tileSize, srcRow * tileSize, tileSize, tileSize,
          ox + dc * cellW, oy + dr * cellH, cellW, cellH)
      }
    }
  }, [visual, tileSize, img, sheetCols, frameIdx, frames, isAnimated])

  if (!img) return null

  return (
    <div className="bg-neutral-900/90 border border-neutral-700 shadow-lg flex flex-col items-center p-1.5 gap-1">
      <canvas ref={canvasRef}
        style={{ width: previewSize, height: previewSize, imageRendering: 'pixelated' }} />
      <div className="text-[10px] text-neutral-400 text-center">
        {isAnimated ? (
          <>{(frameIdx % frames.length) + 1}/{frames.length} · {visual.frameDuration ?? 100}ms · {visual.loop ?? 'loop'}</>
        ) : (
          <>{visual.width}x{visual.height}</>
        )}
      </div>
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

  const visual = getDefVisual(def)
  const img = entityImages.get(visual.assetId)
  const sheetCols = img ? Math.floor(img.naturalWidth / tileSize) : 0
  const sheetRows = img ? Math.floor(img.naturalHeight / tileSize) : 0
  const frames = visual.mode === 'animated' ? computeAnimFrames(visual, sheetCols, sheetRows) : []
  const isAnimated = frames.length > 1

  const tick = useCallback((time: number) => {
    if (!lastTime.current) lastTime.current = time
    if (time - lastTime.current >= (visual.frameDuration ?? 100)) {
      lastTime.current = time
      setFrameIdx(prev => (prev + 1) % frames.length)
    }
    rafId.current = requestAnimationFrame(tick)
  }, [frames.length, visual.frameDuration])

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

    const tileIndex = isAnimated ? frames[frameIdx % frames.length] : (visual.tileIndex ?? 0)
    const baseCol = tileIndex % sheetCols
    const baseRow = Math.floor(tileIndex / sheetCols)
    const pw = size * visual.width, ph = size * visual.height
    const scale = Math.min(size / pw, size / ph)
    const dw = pw * scale, dh = ph * scale
    const ox = (size - dw) / 2, oy = (size - dh) / 2
    const cellW = dw / visual.width, cellH = dh / visual.height

    for (let dr = 0; dr < visual.height; dr++) {
      for (let dc = 0; dc < visual.width; dc++) {
        let srcCol: number, srcRow: number
        if (visual.tiles) {
          const ti = visual.tiles[dr]?.[dc]
          if (ti == null) continue
          srcCol = ti % sheetCols; srcRow = Math.floor(ti / sheetCols)
        } else {
          srcCol = baseCol + dc; srcRow = baseRow + dr
        }
        ctx.drawImage(img, srcCol * tileSize, srcRow * tileSize, tileSize, tileSize,
          ox + dc * cellW, oy + dr * cellH, cellW, cellH)
      }
    }
  }, [def, tileSize, img, sheetCols, frameIdx, frames, isAnimated, size, visual])

  return <canvas ref={canvasRef} style={{ width: size, height: size, imageRendering: 'pixelated' }} className="shrink-0 bg-neutral-700" />
}

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
import { computeAnimFrames, getDefVisual, isDirectional, DIRECTIONS, createTilesGrid, resizeTilesGrid } from '../types/entity'
import { getAssetBlobUrl } from '../storage/blobUrlCache'
import type { EntityDef, EntityVisual, StateVisual, Direction } from '../types/entity'

export function EntityManagerPage() {
  const { entityDefs, addEntityDef, updateEntityDef, deleteEntityDef } = useEntityContext()
  const { currentProject } = useProject()
  const { confirm } = useDialog()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [quickPaletteWidth, setQuickPaletteWidth] = useState(480)

  const selected = entityDefs.find(d => d.id === selectedId) ?? null

  const filtered = entityDefs.filter(d => {
    if (!search) return true
    return d.name.toLowerCase().includes(search.toLowerCase())
  })

  // Track last picked asset for quick entity creation
  const [lastPickedAssetId, setLastPickedAssetId] = useState('')

  const handleCreate = useCallback(async () => {
    const id = Math.random().toString(36).slice(2, 6).toUpperCase()
    const base: EntityVisual = lastPickedAssetId
      ? { mode: 'static', assetId: lastPickedAssetId, width: 1, height: 1 }
      : { mode: 'static', assetId: '', width: 1, height: 1 }
    const def = await addEntityDef({
      name: `Entity ${id}`,
      type: '', tags: [], description: '',
      states: { default: base },
      defaultState: 'default',
      properties: {},
    })
    setSelectedId(def.id)
  }, [addEntityDef, lastPickedAssetId])

  const handleDelete = useCallback(async (id: string) => {
    if (!await confirm('Delete Entity', 'Delete this entity definition?')) return
    await deleteEntityDef(id)
    if (selectedId === id) setSelectedId(null)
  }, [deleteEntityDef, selectedId])

  const tileSize = currentProject?.tileSize ?? 32

  // Quick create from tile palette
  const handleQuickCreate = useCallback(async (info: { tilesetId: string; tileIndex: number; width: number; height: number }) => {
    const id = Math.random().toString(36).slice(2, 6).toUpperCase()
    const visual: EntityVisual = { mode: 'static', assetId: info.tilesetId, tileIndex: info.tileIndex, width: info.width, height: info.height }
    const def = await addEntityDef({
      name: `Entity ${id}`,
      type: '', tags: [], description: '',
      states: { default: visual },
      defaultState: 'default',
      properties: {},
    })
    setSelectedId(def.id)
    setLastPickedAssetId(info.tilesetId)
  }, [addEntityDef, setLastPickedAssetId])

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
              <EntityThumb def={d} tileSize={tileSize} size={28} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-neutral-200 truncate flex items-center gap-1">
                  <VisualBadge def={d} />
                  {d.name}
                </div>
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

      {/* Center: editor */}
      <div className="flex-1 flex flex-col overflow-hidden bg-neutral-900">
        {selected ? (
          <EntityDetailEditor key={selected.id} def={selected} onUpdate={updateEntityDef} onAssetPicked={setLastPickedAssetId} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-600 text-sm">
            Select an entity to edit
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="w-1.5 cursor-col-resize bg-neutral-700 hover:bg-sky-600 shrink-0"
        onPointerDown={e => {
          e.preventDefault()
          const el = e.target as HTMLElement
          el.setPointerCapture(e.pointerId)
          let lastX = e.clientX
          const move = (ev: PointerEvent) => {
            const dx = ev.clientX - lastX; lastX = ev.clientX
            setQuickPaletteWidth(prev => Math.max(150, Math.min(800, prev - dx)))
          }
          const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up) }
          el.addEventListener('pointermove', move)
          el.addEventListener('pointerup', up)
        }}
      />

      {/* Right: quick tile palette */}
      <div style={{ width: quickPaletteWidth }} className="shrink-0">
        <QuickTilePalette tileSize={tileSize} onCreateEntity={handleQuickCreate} />
      </div>
    </div>
  )
}

// ── Detail Editor with Edit/View modes ───────────────────

/** Get the EntityVisual for a state+direction from def */
function getVisualFromDef(def: EntityDef, state: string, direction: Direction | null): EntityVisual {
  const sv = def.states[state]
  if (!sv) return getDefVisual(def)
  if (isDirectional(sv)) return sv[direction ?? 'down'] ?? { mode: 'static', assetId: '', width: 1, height: 1 }
  return sv
}

function EntityDetailEditor({ def, onUpdate, onAssetPicked }: { def: EntityDef; onUpdate: (d: EntityDef) => Promise<void>; onAssetPicked?: (assetId: string) => void }) {
  const { assets, currentProject } = useProject()
  const tilesetConfigs = useTilesetConfigs()
  const tilesetNames = useTilesetNames()
  const tilesetImages = useTilesetImages()
  const tileSize = currentProject?.tileSize ?? 32

  const [name, setName] = useState(def.name)
  const [selectedState, setSelectedState] = useState(def.defaultState)
  const [selectedDirection, setSelectedDirection] = useState<Direction | null>(null) // null = non-directional state
  const [visual, setVisual] = useState<EntityVisual>({ ...getDefVisual(def) })
  const [editing, setEditing] = useState(() => {
    const v = getDefVisual(def)
    return !v.assetId || (v.tileIndex == null && !v.tiles)
  })

  const stateNames = Object.keys(def.states)
  const currentSV = def.states[selectedState]
  const isCurrentDirectional = currentSV ? isDirectional(currentSV) : false

  // Sprite sheet image
  const [sheetImage, setSheetImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    setName(def.name)
    setSelectedState(def.defaultState)
    const sv = def.states[def.defaultState]
    const dir = sv && isDirectional(sv) ? (DIRECTIONS.find(d => (sv as Partial<Record<Direction, EntityVisual>>)[d]) ?? null) : null
    setSelectedDirection(dir)
    setVisual({ ...getVisualFromDef(def, def.defaultState, dir) })
    const dv = getDefVisual(def)
    setEditing(!dv.assetId || (dv.tileIndex == null && !dv.tiles))
  }, [def.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // When switching states or direction, load visual
  useEffect(() => {
    const sv = def.states[selectedState]
    if (!sv) return
    if (isDirectional(sv)) {
      const dir = selectedDirection ?? DIRECTIONS.find(d => sv[d]) ?? 'down'
      if (selectedDirection === null) setSelectedDirection(dir)
      const v = sv[dir]
      if (v) setVisual({ ...v })
      else setVisual({ mode: 'static', assetId: '', width: 1, height: 1 })
    } else {
      setSelectedDirection(null)
      setVisual({ ...sv })
    }
  }, [selectedState, selectedDirection]) // eslint-disable-line react-hooks/exhaustive-deps

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
    let newStateVisual: StateVisual
    if (isCurrentDirectional && selectedDirection) {
      // Save into directional record
      const existing = def.states[selectedState] as Partial<Record<Direction, EntityVisual>>
      newStateVisual = { ...existing, [selectedDirection]: v }
    } else {
      newStateVisual = v
    }
    const newStates = { ...def.states, [selectedState]: newStateVisual }
    await onUpdate({ ...def, name: name.trim() || def.name, states: newStates })
  }, [def, name, selectedState, selectedDirection, isCurrentDirectional, onUpdate])

  const handleDone = useCallback(() => {
    saveState(visual)
    setEditing(false)
  }, [saveState, visual])

  const handleAddState = useCallback(async (stateName: string) => {
    const key = stateName.trim()
    if (!key || def.states[key]) return
    // Copy assetId + dimensions from current visual so user doesn't have to re-pick
    const base: EntityVisual = { mode: visual.mode, assetId: visual.assetId, width: visual.width, height: visual.height }
    const newStates = { ...def.states, [key]: base as StateVisual }
    await onUpdate({ ...def, states: newStates })
    setSelectedState(key)
    setSelectedDirection(null)
    setEditing(true)
  }, [def, visual, onUpdate])

  const handleDeleteState = useCallback(async () => {
    if (stateNames.length <= 1) return
    const newStates = { ...def.states }
    delete newStates[selectedState]
    const remaining = Object.keys(newStates)
    // If deleting default, switch default to first remaining
    const newDefault = selectedState === def.defaultState ? remaining[0] : def.defaultState
    await onUpdate({ ...def, states: newStates, defaultState: newDefault })
    setSelectedState(remaining[0])
  }, [def, selectedState, stateNames, onUpdate])

  const handleSetDefault = useCallback(async () => {
    await onUpdate({ ...def, defaultState: selectedState })
  }, [def, selectedState, onUpdate])

  const handleRenameState = useCallback(async (oldName: string, newName: string) => {
    const key = newName.trim()
    if (!key || key === oldName || def.states[key]) return
    const newStates: Record<string, StateVisual> = {}
    for (const [k, v] of Object.entries(def.states)) {
      newStates[k === oldName ? key : k] = v
    }
    const newDefault = def.defaultState === oldName ? key : def.defaultState
    await onUpdate({ ...def, states: newStates, defaultState: newDefault })
    if (selectedState === oldName) setSelectedState(key)
  }, [def, selectedState, onUpdate])

  // Toggle directional mode for current state
  // Get which directions are currently enabled (across all states)
  const enabledDirections: Direction[] = (() => {
    const dirs = new Set<Direction>()
    for (const sv of Object.values(def.states)) {
      if (isDirectional(sv)) {
        for (const d of DIRECTIONS) { if (sv[d]) dirs.add(d) }
      }
    }
    return DIRECTIONS.filter(d => dirs.has(d))
  })()

  // Toggle a direction on/off across ALL states
  const handleToggleDirection = useCallback(async (dir: Direction) => {
    const hasDir = enabledDirections.includes(dir)
    const newStates: Record<string, StateVisual> = {}
    // Use current visual's asset as base for new directions
    const defaultVisual: EntityVisual = { mode: visual.mode, assetId: visual.assetId, width: visual.width, height: visual.height }

    for (const [stateName, sv] of Object.entries(def.states)) {
      if (hasDir) {
        // Remove this direction
        if (isDirectional(sv)) {
          const copy = { ...sv }
          delete copy[dir]
          // If no directions left, convert back to single visual
          const remaining = DIRECTIONS.filter(d => copy[d])
          if (remaining.length === 0) {
            newStates[stateName] = sv[dir] ?? defaultVisual
          } else {
            newStates[stateName] = copy
          }
        } else {
          newStates[stateName] = sv
        }
      } else {
        // Add this direction
        if (isDirectional(sv)) {
          newStates[stateName] = { ...sv, [dir]: sv[DIRECTIONS.find(d => sv[d])!] ?? defaultVisual }
        } else {
          // Convert single → directional with existing + new dir
          const dirRecord: Partial<Record<Direction, EntityVisual>> = { [dir]: { ...sv } }
          // Keep existing enabled directions too
          for (const d of enabledDirections) { dirRecord[d] = { ...sv } }
          dirRecord[dir] = { ...sv }
          newStates[stateName] = dirRecord
        }
      }
    }

    await onUpdate({ ...def, states: newStates })
    if (!hasDir) {
      // Just enabled this dir, select it
      setSelectedDirection(dir)
    } else if (selectedDirection === dir) {
      // Disabled current direction, switch to another
      const remaining = enabledDirections.filter(d => d !== dir)
      setSelectedDirection(remaining[0] ?? null)
    }
  }, [def, enabledDirections, selectedDirection, onUpdate])

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
      directionName={selectedDirection}
      onDone={handleDone}
      onCancel={() => { setVisual({ ...getVisualFromDef(def, selectedState, selectedDirection) }); setEditing(false) }}
      onAssetPicked={onAssetPicked}
    />
  }

  return <ViewMode
    visual={visual} name={name}
    tileSize={tileSize} image={sheetImage}
    stateNames={stateNames}
    selectedState={selectedState}
    defaultState={def.defaultState}
    onSelectState={setSelectedState}
    onAddState={handleAddState}
    onDeleteState={handleDeleteState}
    onSetDefault={handleSetDefault}
    onRenameState={handleRenameState}
    onEdit={() => setEditing(true)}
    selectedDirection={selectedDirection}
    onSelectDirection={setSelectedDirection}
    onToggleDirection={handleToggleDirection}
    enabledDirections={enabledDirections}
  />
}

// ── Edit Mode: tile picker + config ──────────────────────

function EditMode({ name, setName, visual, setVisual, tileSize, tilesetConfigs, tilesetNames, spriteSheetAssets, isConfigured, stateName, directionName, onDone, onCancel, onAssetPicked }: {
  name: string; setName: (n: string) => void
  visual: EntityVisual; setVisual: (fn: (v: EntityVisual) => EntityVisual) => void
  tileSize: number
  tilesetConfigs: { id: string; src: string }[]
  tilesetNames: Map<string, string>
  spriteSheetAssets: { id: string; name: string }[]
  isConfigured: boolean
  stateName: string
  directionName: Direction | null
  onDone: () => void
  onCancel: () => void
  onAssetPicked?: (assetId: string) => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-neutral-700 bg-neutral-800 flex-wrap">
        <input value={name} onChange={e => setName(e.target.value)}
          className="px-2 py-1 bg-neutral-900 border border-neutral-700 text-sm text-neutral-100 w-44 focus:outline-none focus:border-sky-500"
          placeholder="Entity name" />

        <span className="px-2 py-0.5 bg-amber-900/50 border border-amber-700/50 text-amber-300 text-[12px]">
          {stateName}{directionName ? ` : ${directionName}` : ''}
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
          onChange={id => { setVisual(v => ({ ...v, assetId: id, tileIndex: 0, ...(v.mode === 'animated' ? { frameCount: 1 } : {}) })); onAssetPicked?.(id) }}
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

function ViewMode({ visual, name, tileSize, image, stateNames, selectedState, defaultState, onSelectState, onAddState, onDeleteState, onSetDefault, onRenameState, onEdit, selectedDirection, enabledDirections, onSelectDirection, onToggleDirection }: {
  visual: EntityVisual; name: string
  tileSize: number; image: HTMLImageElement | null
  stateNames: string[]; selectedState: string; defaultState: string
  onSelectState: (s: string) => void
  onAddState: (name: string) => void; onDeleteState: () => void; onSetDefault: () => void
  onRenameState: (oldName: string, newName: string) => void; onEdit: () => void
  selectedDirection: Direction | null; enabledDirections: Direction[]
  onSelectDirection: (d: Direction) => void; onToggleDirection: (d: Direction) => void
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
                className={`px-3 py-1.5 text-xs border flex items-center gap-1 ${selectedState === s
                  ? 'bg-amber-800/60 border-amber-600 text-amber-200'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'}`}>
                {s}
                {s === defaultState && <span className="text-amber-500">*</span>}
                {stateNames.length > 1 && (
                  <span onClick={async e => { e.stopPropagation(); if (await confirm('Delete State', `Delete "${s}"?`)) onDeleteState() }}
                    className="text-neutral-600 hover:text-red-400 text-[9px]">✕</span>
                )}
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
                className="px-1.5 py-1 text-xs text-neutral-500 hover:text-neutral-300">✕</button>
            </div>
          ) : (
            <button onClick={() => setAddingState(true)}
              className="px-3 py-1.5 text-xs bg-neutral-800 border border-dashed border-neutral-600 text-neutral-500 hover:text-neutral-200 hover:border-neutral-400">
              + State
            </button>
          )}

          <div className="flex-1" />

          {selectedState !== defaultState && (
            <button onClick={onSetDefault}
              className="text-xs px-2 py-1 text-neutral-500 hover:text-amber-300">
              Set Default
            </button>
          )}
        </div>

        {/* Direction tabs */}
        <DirectionTabs
          enabledDirections={enabledDirections}
          selectedDirection={selectedDirection}
          onSelectDirection={onSelectDirection}
          onAddDirection={onToggleDirection}
          onDeleteDirection={onToggleDirection}
        />

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

// ── Direction tabs (add/select/delete like states) ───────

function DirectionTabs({ enabledDirections, selectedDirection, onSelectDirection, onAddDirection, onDeleteDirection }: {
  enabledDirections: Direction[]
  selectedDirection: Direction | null
  onSelectDirection: (d: Direction) => void
  onAddDirection: (d: Direction) => void
  onDeleteDirection: (d: Direction) => void
}) {
  const [adding, setAdding] = useState(false)
  const available = DIRECTIONS.filter(d => !enabledDirections.includes(d))
  const { confirm } = useDialog()

  return (
    <div className="flex items-center gap-1 px-2 pb-1">
      <span className="text-[10px] text-neutral-500 shrink-0">Dir:</span>
      {enabledDirections.length === 0 && (
        <span className="text-[10px] text-neutral-600 italic">none</span>
      )}
      {enabledDirections.map(d => (
        <button key={d}
          onClick={() => onSelectDirection(d)}
          className={`px-2.5 py-1 text-[11px] border flex items-center gap-1 ${selectedDirection === d
            ? 'bg-purple-700/60 border-purple-500 text-purple-100'
            : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'}`}>
          {d}
          <span
            onClick={async e => { e.stopPropagation(); if (await confirm('Delete Direction', `Remove "${d}" from all states?`)) onDeleteDirection(d) }}
            className="text-neutral-600 hover:text-red-400 text-[9px] ml-0.5">✕</span>
        </button>
      ))}
      {available.length > 0 && (
        adding ? (
          <div className="flex items-center gap-0.5">
            <select
              onChange={e => { onAddDirection(e.target.value as Direction); setAdding(false) }}
              defaultValue=""
              className="px-1.5 py-1 bg-neutral-900 border border-neutral-600 text-[11px] text-neutral-200"
              autoFocus
            >
              <option value="" disabled>select...</option>
              {available.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button onClick={() => setAdding(false)} className="text-[10px] text-neutral-500 hover:text-neutral-300">✕</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
            className="px-2 py-1 text-[11px] bg-neutral-800 border border-dashed border-neutral-600 text-neutral-500 hover:text-neutral-200 hover:border-neutral-400">
            + Dir
          </button>
        )
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

// ── Visual mode badge ────────────────────────────────────

export function VisualBadge({ def }: { def: EntityDef }) {
  const v = getDefVisual(def)
  const label = v.mode === 'animated' ? 'A' : v.tiles ? 'C' : 'S'
  const color = v.mode === 'animated' ? 'text-amber-400 bg-amber-900/40' : v.tiles ? 'text-purple-400 bg-purple-900/40' : 'text-sky-400 bg-sky-900/40'
  return <span className={`text-[9px] px-1 py-px leading-none ${color}`}>{label}</span>
}

// ── Quick Tile Palette (right panel for fast entity creation) ──

function QuickTilePalette({ tileSize, onCreateEntity }: {
  tileSize: number
  onCreateEntity: (info: { tilesetId: string; tileIndex: number; width: number; height: number }) => void
}) {
  const tilesetConfigs = useTilesetConfigs()
  const tilesetImages = useTilesetImages()
  const [activeTileset, setActiveTileset] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })
  const dragging = useRef(false)
  const dragStart = useRef({ r: 0, c: 0 })
  const [selRect, setSelRect] = useState<{ r1: number; c1: number; r2: number; c2: number } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; info: { tilesetId: string; tileIndex: number; width: number; height: number } } | null>(null)

  useEffect(() => {
    if (tilesetConfigs.length > 0 && !activeTileset) setActiveTileset(tilesetConfigs[0].id)
  }, [tilesetConfigs, activeTileset])

  const image = tilesetImages.get(activeTileset)
  const cols = image ? Math.floor(image.naturalWidth / tileSize) : 0
  const rows = image ? Math.floor(image.naturalHeight / tileSize) : 0

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const { width: w, height: h } = entries[0].contentRect
      setCanvasSize({ w: Math.round(w), h: Math.round(h) })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); setSelRect(null) }, [activeTileset])

  const screenToCell = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left - pan.x) / zoom
    const y = (clientY - rect.top - pan.y) / zoom
    const c = Math.floor(x / tileSize), r = Math.floor(y / tileSize)
    if (c < 0 || c >= cols || r < 0 || r >= rows) return null
    return { r, c }
  }, [pan, zoom, tileSize, cols, rows])

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !image || canvasSize.w === 0 || cols <= 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.w * dpr
    canvas.height = canvasSize.h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h)
    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(image, 0, 0)
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 1 / zoom
    for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * tileSize); ctx.lineTo(cols * tileSize, r * tileSize); ctx.stroke() }
    for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(c * tileSize, 0); ctx.lineTo(c * tileSize, rows * tileSize); ctx.stroke() }
    // Selection
    if (selRect) {
      const minR = Math.min(selRect.r1, selRect.r2), maxR = Math.max(selRect.r1, selRect.r2)
      const minC = Math.min(selRect.c1, selRect.c2), maxC = Math.max(selRect.c1, selRect.c2)
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2 / zoom
      ctx.strokeRect(minC * tileSize + 1, minR * tileSize + 1, (maxC - minC + 1) * tileSize - 2, (maxR - minR + 1) * tileSize - 2)
      ctx.fillStyle = 'rgba(56,189,248,0.15)'
      ctx.fillRect(minC * tileSize, minR * tileSize, (maxC - minC + 1) * tileSize, (maxR - minR + 1) * tileSize)
    }
    ctx.restore()
  }, [image, cols, rows, tileSize, zoom, pan, canvasSize, selRect])

  useEffect(() => { draw() }, [draw])

  // Close context menu
  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [contextMenu])

  return (
    <div className="h-full flex flex-col bg-neutral-800">
      <div className="flex items-center px-2 pt-1 pb-1 shrink-0 gap-2 border-b border-neutral-700">
        <AssetPicker
          value={activeTileset}
          onChange={id => { if (id) setActiveTileset(id) }}
          categories={['tileset', 'sprite-sheet']}
          placeholder="-- Asset --"
        />
      </div>
      <div className="px-2 py-1 text-[10px] text-neutral-500 border-b border-neutral-700 shrink-0">
        Right-click selection to create entity
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden cursor-crosshair relative">
        <canvas ref={canvasRef} style={{ width: canvasSize.w, height: canvasSize.h }}
          onWheel={e => {
            e.preventDefault()
            const rect = canvasRef.current?.getBoundingClientRect()
            if (!rect) return
            const mx = e.clientX - rect.left, my = e.clientY - rect.top
            const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
            const nz = Math.max(0.25, Math.min(6, zoom * factor))
            const scale = nz / zoom
            setPan({ x: mx - (mx - pan.x) * scale, y: my - (my - pan.y) * scale })
            setZoom(nz)
          }}
          onPointerDown={e => {
            if (e.button === 1) {
              isPanning.current = true
              lastPan.current = { x: e.clientX, y: e.clientY }
              ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
              return
            }
            if (e.button === 0) {
              const cell = screenToCell(e.clientX, e.clientY)
              if (!cell) return
              dragging.current = true
              dragStart.current = cell
              setSelRect({ r1: cell.r, c1: cell.c, r2: cell.r, c2: cell.c })
              ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
            }
          }}
          onPointerMove={e => {
            if (isPanning.current) {
              const dx = e.clientX - lastPan.current.x, dy = e.clientY - lastPan.current.y
              lastPan.current = { x: e.clientX, y: e.clientY }
              setPan(p => ({ x: p.x + dx, y: p.y + dy }))
              return
            }
            if (dragging.current) {
              const cell = screenToCell(e.clientX, e.clientY)
              if (cell) setSelRect({ r1: dragStart.current.r, c1: dragStart.current.c, r2: cell.r, c2: cell.c })
            }
          }}
          onPointerUp={e => {
            if (e.button === 1) { isPanning.current = false; return }
            dragging.current = false
          }}
          onContextMenu={e => {
            e.preventDefault()
            if (!selRect) return
            const minR = Math.min(selRect.r1, selRect.r2), minC = Math.min(selRect.c1, selRect.c2)
            const w = Math.abs(selRect.c2 - selRect.c1) + 1, h = Math.abs(selRect.r2 - selRect.r1) + 1
            const rect = containerRef.current?.getBoundingClientRect()
            setContextMenu({ x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0), info: { tilesetId: activeTileset, tileIndex: minR * cols + minC, width: w, height: h } })
          }}
        />
        {contextMenu && (
          <div className="absolute z-50 bg-neutral-800 border border-neutral-600 shadow-lg py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onPointerDown={e => e.stopPropagation()}>
            <button onClick={() => { onCreateEntity(contextMenu.info); setContextMenu(null) }}
              className="w-full text-left px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-700">
              Create Entity ({contextMenu.info.width}x{contextMenu.info.height})
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

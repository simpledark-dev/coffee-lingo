import { useEffect, useState, useCallback, useRef } from 'react'
import { EditorProvider, useEditorDispatch, useEditorState } from '../state/EditorContext'
import { useTilesetConfigs, useTilesetLoading } from '../state/TilesetContext'
import { useProject } from '../state/ProjectContext'
import { useToast } from '../components/Toast'
import { Toolbar } from '../components/Toolbar'
import { LayerPanel, RenderOrderPanel } from '../components/LayerPanel'
import { EntityList } from '../components/EntityList'
import { EditorCanvas } from '../components/Canvas/EditorCanvas'
import { TilePalette } from '../components/TilePalette'
import { EntityPalette } from '../components/EntityPalette'
import { ZonePalette } from '../components/ZonePalette'
import { ZoneList } from '../components/ZoneList'
import { EntityInspectorPanel } from '../components/EntityInspectorPanel'
import { EntityCollisionList } from '../components/EntityCollisionList'
import { EntityCollisionModal } from '../components/EntityCollisionModal'
import { listMaps, updateProject } from '../storage/db'
import { MapTabBar } from '../components/MapTabBar'

/** Syncs editor prefs (grid, overlay, snap) to/from project */
function PrefsSync() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const { currentProject } = useProject()
  const initialized = useRef(false)
  const skipFirstSave = useRef(true)

  // Load prefs on mount
  useEffect(() => {
    if (initialized.current || !currentProject) return
    initialized.current = true
    if (currentProject.editorPrefs) {
      dispatch({ type: 'SET_EDITOR_PREFS', prefs: currentProject.editorPrefs })
    }
  }, [currentProject, dispatch])

  // Save prefs on change (debounced), skip initial render
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    if (!initialized.current || !currentProject) return
    if (skipFirstSave.current) { skipFirstSave.current = false; return }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      updateProject({
        ...currentProject,
        editorPrefs: {
          showGrid: state.showGrid,
          showEntityOverlay: state.showEntityOverlay,
          entityGridSnap: state.entityGridSnap,
        },
      })
    }, 500)
    return () => clearTimeout(timer.current)
  }, [state.showGrid, state.showEntityOverlay, state.entityGridSnap, currentProject])

  return null
}

function AutoLoad() {
  const dispatch = useEditorDispatch()
  const { currentProject } = useProject()
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current || !currentProject) return
    loaded.current = true
    listMaps(currentProject.id).then(maps => {
      if (maps.length > 0) {
        const latest = maps.sort((a, b) => b.updatedAt - a.updatedAt)[0]
        dispatch({ type: 'IMPORT_MAP', data: latest.data, mapId: latest.id })
      }
    })
  }, [dispatch, currentProject])
  return null
}

function KeyboardShortcuts() {
  const dispatch = useEditorDispatch()
  const state = useEditorState()
  const { currentProject } = useProject()
  const toast = useToast()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); dispatch({ type: 'UNDO' }) }
        if (e.key === 'y') { e.preventDefault(); dispatch({ type: 'REDO' }) }
        if (e.key === 's') {
          e.preventDefault()
          if (currentProject) {
            import('../utils/exportJson').then(({ exportJson }) =>
              import('../storage/db').then(({ saveMap }) => {
                saveMap(currentProject.id, state.mapName || 'Untitled', exportJson(state), state.currentMapId ?? undefined)
                  .then(saved => {
                    if (!state.currentMapId) dispatch({ type: 'SET_MAP_ID', mapId: saved.id })
                    toast('Map saved', 'success')
                  })
                  .catch(() => toast('Failed to save', 'error'))
              })
            )
          }
        }
        if (e.key === 'c' && state.selection) { e.preventDefault(); dispatch({ type: 'COPY_SELECTION' }) }
        if (e.key === 'v' && state.clipboard) { e.preventDefault(); dispatch({ type: 'PASTE_SELECTION', row: 0, col: 0 }) }
        return
      }

      switch (e.key.toLowerCase()) {
        case 'b': dispatch({ type: 'SET_TOOL', tool: 'pencil' }); break
        case 'e': dispatch({ type: 'SET_TOOL', tool: 'eraser' }); break
        case 'g': dispatch({ type: 'SET_TOOL', tool: 'fill' }); break
        case 's': dispatch({ type: 'SET_TOOL', tool: 'select' }); break
        case 'i': dispatch({ type: 'SET_TOOL', tool: 'eyedropper' }); break
        case 'r': dispatch({ type: 'TOGGLE_RESIZE_MODE' }); break
        case 'm': {
          const modes: ('tile' | 'entity' | 'collision')[] = ['tile', 'entity', 'collision']
          const idx = modes.indexOf(state.editorMode)
          dispatch({ type: 'SET_EDITOR_MODE', mode: modes[(idx + 1) % modes.length] })
          break
        }
        case 'c': dispatch({ type: 'SET_EDITOR_MODE', mode: 'collision' }); break
        case 'delete':
        case 'backspace': {
          e.preventDefault()
          if (state.editorMode === 'entity' && state.selectedEntityIds.length > 0) {
            dispatch({ type: 'DELETE_ENTITIES' })
          } else if (state.editorMode === 'collision' && state.selectedZoneId) {
            dispatch({ type: 'DELETE_ZONE', zoneId: state.selectedZoneId })
          } else if (state.selection) {
            dispatch({ type: 'DELETE_SELECTION' })
          }
          break
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dispatch, state])

  return null
}

/** Vertical resize handle (drag left/right) */
function ResizeHandleX({ onResize }: { onResize: (delta: number) => void }) {
  const dragging = useRef(false)
  const lastX = useRef(0)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    dragging.current = true
    lastX.current = e.clientX
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastX.current
    lastX.current = e.clientX
    onResize(dx)
  }, [onResize])

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="w-1.5 cursor-col-resize bg-neutral-700 hover:bg-sky-600 active:bg-sky-500 shrink-0 relative group"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-neutral-500 group-hover:bg-sky-400" />
    </div>
  )
}

/** Horizontal resize handle (drag up/down) */
function ResizeHandleY({ onResize }: { onResize: (delta: number) => void }) {
  const dragging = useRef(false)
  const lastY = useRef(0)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    dragging.current = true
    lastY.current = e.clientY
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const dy = e.clientY - lastY.current
    lastY.current = e.clientY
    onResize(dy)
  }, [onResize])

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="h-1.5 cursor-row-resize bg-neutral-700 hover:bg-sky-600 active:bg-sky-500 shrink-0 relative group"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1 w-8 bg-neutral-500 group-hover:bg-sky-400" />
    </div>
  )
}

function EditorLayout() {
  const state = useEditorState()
  const [layerWidth, setLayerWidth] = useState(250)
  const [paletteWidth, setPaletteWidth] = useState(420)
  const [bottomHeight, setBottomHeight] = useState(160)
  const [renderOrderHeight, setRenderOrderHeight] = useState(220)

  const handleLayerResize = useCallback((dx: number) => {
    setLayerWidth(prev => Math.max(140, Math.min(500, prev + dx)))
  }, [])

  const handlePaletteResize = useCallback((dx: number) => {
    setPaletteWidth(prev => Math.max(160, Math.min(800, prev - dx)))
  }, [])

  const handleBottomResize = useCallback((dy: number) => {
    setBottomHeight(prev => Math.max(80, Math.min(400, prev - dy)))
  }, [])

  const handleRenderOrderResize = useCallback((dy: number) => {
    setRenderOrderHeight(prev => Math.max(60, Math.min(300, prev - dy)))
  }, [])

  const mode = state.editorMode

  return (
    <div className="flex flex-col h-full bg-neutral-900 text-neutral-100 select-none overflow-hidden">
      <Toolbar />
      <div className="flex flex-1 min-h-0">
        <div style={{ width: layerWidth }} className="shrink-0 flex flex-col">
          <div className="flex-1 min-h-0">
            {mode === 'tile' ? <LayerPanel /> : mode === 'entity' ? <EntityList /> : <ZoneList />}
          </div>
          {(mode === 'tile' || mode === 'entity') && (
            <>
              <ResizeHandleY onResize={handleRenderOrderResize} />
              <div className="shrink-0" style={{ height: renderOrderHeight }}>
                <RenderOrderPanel />
              </div>
            </>
          )}
        </div>

        <ResizeHandleX onResize={handleLayerResize} />

        <div className="flex-1 min-w-0 flex flex-col">
          <MapTabBar />
          <div className="flex-1 min-h-0">
            <EditorCanvas />
          </div>
          {mode === 'collision' && (
            <>
              <ResizeHandleY onResize={handleBottomResize} />
              <div className="shrink-0" style={{ height: bottomHeight }}>
                <EntityCollisionList />
              </div>
            </>
          )}
          {mode === 'entity' && (
            <>
              <ResizeHandleY onResize={handleBottomResize} />
              <div className="shrink-0" style={{ height: bottomHeight }}>
                <EntityPalette />
              </div>
            </>
          )}
        </div>

        <ResizeHandleX onResize={handlePaletteResize} />

        <div style={{ width: paletteWidth }} className="shrink-0">
          {mode === 'tile' ? <TilePalette /> : mode === 'entity' ? <EntityInspectorPanel /> : <ZonePalette />}
        </div>
      </div>
    </div>
  )
}

/** Syncs tileset configs from TilesetContext into EditorState */
function TilesetSync() {
  const dispatch = useEditorDispatch()
  const configs = useTilesetConfigs()
  const loading = useTilesetLoading()
  const synced = useRef(false)

  useEffect(() => {
    if (loading || synced.current) return
    synced.current = true
    for (const cfg of configs) {
      dispatch({ type: 'ADD_TILESET', tileset: cfg })
    }
  }, [loading, configs, dispatch])

  return null
}

export function EditorPage() {
  return (
    <EditorProvider>
      <TilesetSync />
      <AutoLoad />
      <PrefsSync />
      <KeyboardShortcuts />
      <EditorLayout />
      <EntityCollisionModal />
    </EditorProvider>
  )
}

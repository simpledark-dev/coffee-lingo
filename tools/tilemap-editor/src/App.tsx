import { useEffect, useState, useCallback, useRef } from 'react'
import { EditorProvider, useEditorDispatch, useEditorState } from './state/EditorContext'
import { Toolbar } from './components/Toolbar'
import { LayerPanel } from './components/LayerPanel'
import { EntityList } from './components/EntityList'
import { EditorCanvas } from './components/Canvas/EditorCanvas'
import { TilePalette } from './components/TilePalette'
import { EntityPalette } from './components/EntityPalette'
import { ZonePalette } from './components/ZonePalette'
import { ZoneList } from './components/ZoneList'
import { ExportDialog } from './components/ExportDialog'
import { ImportDialog } from './components/ImportDialog'
import { CreateEntityDefDialog } from './components/CreateEntityDefDialog'
import { saveToLocalStorage, loadFromLocalStorage } from './utils/localStorage'

function AutoLoad() {
  const dispatch = useEditorDispatch()
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    const data = loadFromLocalStorage()
    if (data) dispatch({ type: 'IMPORT_MAP', data })
  }, [dispatch])
  return null
}

function KeyboardShortcuts() {
  const dispatch = useEditorDispatch()
  const state = useEditorState()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); dispatch({ type: 'UNDO' }) }
        if (e.key === 'y') { e.preventDefault(); dispatch({ type: 'REDO' }) }
        if (e.key === 's') { e.preventDefault(); saveToLocalStorage(state) }
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
        case 'backspace':
          if (state.editorMode === 'entity' && state.selectedEntityId) {
            dispatch({ type: 'DELETE_ENTITY', entityId: state.selectedEntityId })
          } else if (state.editorMode === 'collision' && state.selectedZoneId) {
            dispatch({ type: 'DELETE_ZONE', zoneId: state.selectedZoneId })
          } else if (state.selection) {
            dispatch({ type: 'DELETE_SELECTION' })
          }
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dispatch, state.selection, state.clipboard])

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
      {/* Knob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-neutral-500 group-hover:bg-sky-400" />
    </div>
  )
}

function EditorLayout() {
  const state = useEditorState()
  const [layerWidth, setLayerWidth] = useState(200)
  const [paletteWidth, setPaletteWidth] = useState(420)

  const handleLayerResize = useCallback((dx: number) => {
    setLayerWidth(prev => Math.max(140, Math.min(400, prev + dx)))
  }, [])

  const handlePaletteResize = useCallback((dx: number) => {
    setPaletteWidth(prev => Math.max(160, Math.min(600, prev - dx)))
  }, [])

  const mode = state.editorMode

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-neutral-100 select-none overflow-hidden">
      <Toolbar />
      <div className="flex flex-1 min-h-0">
        {/* Left panel */}
        <div style={{ width: layerWidth }} className="shrink-0 flex flex-col">
          {mode === 'tile' ? <LayerPanel /> : mode === 'entity' ? <EntityList /> : <ZoneList />}
        </div>

        <ResizeHandleX onResize={handleLayerResize} />

        {/* Center: Canvas */}
        <div className="flex-1 min-w-0">
          <EditorCanvas />
        </div>

        <ResizeHandleX onResize={handlePaletteResize} />

        {/* Right panel */}
        <div style={{ width: paletteWidth }} className="shrink-0">
          {mode === 'tile' ? <TilePalette /> : mode === 'entity' ? <EntityPalette /> : <ZonePalette />}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <EditorProvider>
      <AutoLoad />
      <KeyboardShortcuts />
      <EditorLayout />
      <ExportDialog />
      <ImportDialog />
      <CreateEntityDefDialog />
    </EditorProvider>
  )
}

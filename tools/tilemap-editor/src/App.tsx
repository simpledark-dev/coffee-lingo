import { useEffect, useState, useCallback, useRef } from 'react'
import { EditorProvider, useEditorDispatch, useEditorState } from './state/EditorContext'
import { Toolbar } from './components/Toolbar'
import { LayerPanel } from './components/LayerPanel'
import { EditorCanvas } from './components/Canvas/EditorCanvas'
import { TilePalette } from './components/TilePalette'
import { ExportDialog } from './components/ExportDialog'
import { ImportDialog } from './components/ImportDialog'
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
        case 'delete':
        case 'backspace':
          if (state.selection) dispatch({ type: 'DELETE_SELECTION' })
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
      {/* Knob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1 w-8 bg-neutral-500 group-hover:bg-sky-400" />
    </div>
  )
}

export default function App() {
  const [layerWidth, setLayerWidth] = useState(220)
  const [paletteHeight, setPaletteHeight] = useState(180)

  const handleLayerResize = useCallback((dx: number) => {
    setLayerWidth(prev => Math.max(140, Math.min(500, prev + dx)))
  }, [])

  const handlePaletteResize = useCallback((dy: number) => {
    setPaletteHeight(prev => Math.max(80, Math.min(600, prev - dy)))
  }, [])

  return (
    <EditorProvider>
      <AutoLoad />
      <KeyboardShortcuts />
      <div className="flex h-screen bg-neutral-900 text-neutral-100 select-none overflow-hidden">
        {/* Left col: Layers (full height) */}
        <div style={{ width: layerWidth }} className="shrink-0 flex flex-col">
          <LayerPanel />
        </div>

        <ResizeHandleX onResize={handleLayerResize} />

        {/* Right col: Toolbar + Canvas + Tileset */}
        <div className="flex-1 flex flex-col min-w-0">
          <Toolbar />
          <div className="flex-1 min-h-0">
            <EditorCanvas />
          </div>
          <ResizeHandleY onResize={handlePaletteResize} />
          <div style={{ height: paletteHeight }} className="shrink-0">
            <TilePalette />
          </div>
        </div>
      </div>
      <ExportDialog />
      <ImportDialog />
    </EditorProvider>
  )
}

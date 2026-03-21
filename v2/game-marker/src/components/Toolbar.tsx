import {
  Pencil, Eraser, PaintBucket, Square, Pipette,
  Grid3x3, ZoomIn, ZoomOut, Undo2, Redo2,
  Move, Save, Layers, Box, Shield,
} from 'lucide-react'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { useProject } from '../state/ProjectContext'
import { Tooltip } from './Tooltip'
import { useToast } from './Toast'
import { exportJson } from '../utils/exportJson'
import { saveMap } from '../storage/db'
import type { ToolType } from '../types/editor'

const TOOLS: { type: ToolType; icon: typeof Pencil; label: string; shortcut: string }[] = [
  { type: 'pencil', icon: Pencil, label: 'Pencil', shortcut: 'B' },
  { type: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
  { type: 'fill', icon: PaintBucket, label: 'Fill', shortcut: 'G' },
  { type: 'select', icon: Square, label: 'Select', shortcut: 'S' },
  { type: 'eyedropper', icon: Pipette, label: 'Eyedropper', shortcut: 'I' },
]

function ToolBtn({ active, onClick, children }: {
  active?: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 border border-neutral-700 ${active ? 'bg-sky-700 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
    >
      {children}
    </button>
  )
}

export function Toolbar() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const { currentProject } = useProject()
  const toast = useToast()

  const handleSave = async () => {
    if (!currentProject) return
    try {
      const data = exportJson(state)
      await saveMap(currentProject.id, state.mapName || 'Untitled', data)
      toast('Map saved', 'success')
    } catch (e) {
      toast('Failed to save map', 'error')
      console.error(e)
    }
  }

  return (
    <div className="flex items-center gap-1 px-2 h-10 bg-neutral-800 border-b border-neutral-700 shrink-0">
      {/* Mode toggle */}
      <div className="flex gap-0.5">
        <Tooltip text="Tile Mode" shortcut="M">
          <ToolBtn active={state.editorMode === 'tile'} onClick={() => dispatch({ type: 'SET_EDITOR_MODE', mode: 'tile' })}>
            <Layers size={16} />
          </ToolBtn>
        </Tooltip>
        <Tooltip text="Entity Mode" shortcut="M">
          <ToolBtn active={state.editorMode === 'entity'} onClick={() => dispatch({ type: 'SET_EDITOR_MODE', mode: 'entity' })}>
            <Box size={16} />
          </ToolBtn>
        </Tooltip>
        <Tooltip text="Collision Mode" shortcut="C">
          <ToolBtn active={state.editorMode === 'collision'} onClick={() => dispatch({ type: 'SET_EDITOR_MODE', mode: 'collision' })}>
            <Shield size={16} />
          </ToolBtn>
        </Tooltip>
      </div>

      <div className="w-px h-6 bg-neutral-600 mx-1" />

      {/* Tool buttons - only show in tile mode */}
      {state.editorMode === 'tile' && (
        <>
          <div className="flex gap-0.5">
            {TOOLS.map(t => (
              <Tooltip key={t.type} text={t.label} shortcut={t.shortcut}>
                <ToolBtn
                  active={state.activeTool === t.type}
                  onClick={() => dispatch({ type: 'SET_TOOL', tool: t.type })}
                >
                  <t.icon size={16} />
                </ToolBtn>
              </Tooltip>
            ))}
          </div>

          <div className="w-px h-6 bg-neutral-600 mx-1" />
        </>
      )}

      {/* Grid toggle - only in tile mode */}
      {state.editorMode === 'tile' && (
        <>
          <Tooltip text="Toggle Grid">
            <ToolBtn
              active={state.showGrid}
              onClick={() => dispatch({ type: 'TOGGLE_GRID' })}
            >
              <Grid3x3 size={16} />
            </ToolBtn>
          </Tooltip>

          {/* Resize mode */}
          <Tooltip text="Resize Map" shortcut="R">
            <ToolBtn
              active={state.resizeMode}
              onClick={() => dispatch({ type: 'TOGGLE_RESIZE_MODE' })}
            >
              <Move size={16} />
            </ToolBtn>
          </Tooltip>

          <div className="w-px h-6 bg-neutral-600 mx-1" />
        </>
      )}

      {/* Zoom */}
      <Tooltip text="Zoom In">
        <ToolBtn onClick={() => dispatch({ type: 'SET_ZOOM', zoom: state.zoom * 1.25 })}>
          <ZoomIn size={16} />
        </ToolBtn>
      </Tooltip>
      <span className="text-xs text-neutral-400 w-12 text-center tabular-nums">
        {Math.round(state.zoom * 100)}%
      </span>
      <Tooltip text="Zoom Out">
        <ToolBtn onClick={() => dispatch({ type: 'SET_ZOOM', zoom: state.zoom / 1.25 })}>
          <ZoomOut size={16} />
        </ToolBtn>
      </Tooltip>

      <div className="w-px h-6 bg-neutral-600 mx-1" />

      {/* Undo / Redo */}
      <Tooltip text="Undo" shortcut="Ctrl+Z">
        <ToolBtn onClick={() => dispatch({ type: 'UNDO' })}>
          <Undo2 size={16} />
        </ToolBtn>
      </Tooltip>
      <Tooltip text="Redo" shortcut="Ctrl+Y">
        <ToolBtn onClick={() => dispatch({ type: 'REDO' })}>
          <Redo2 size={16} />
        </ToolBtn>
      </Tooltip>

      <div className="flex-1" />

          {/* Save */}
      <Tooltip text="Save Map" shortcut="Ctrl+S">
        <ToolBtn onClick={handleSave}>
          <Save size={16} />
        </ToolBtn>
      </Tooltip>

      <div className="w-px h-6 bg-neutral-600 mx-1" />

      {/* Map size (read-only) */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-neutral-500">Map</span>
        <span className="text-xs text-neutral-400 tabular-nums">{state.gridCols}x{state.gridRows}</span>
      </div>

      <div className="flex items-center gap-1 ml-1">
        <span className="text-xs text-neutral-500">Tile</span>
        <span className="text-xs text-neutral-400 tabular-nums">{state.tileSize}px</span>
      </div>
    </div>
  )
}

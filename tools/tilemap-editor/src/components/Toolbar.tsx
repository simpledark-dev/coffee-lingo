import { useState } from 'react'
import {
  Pencil, Eraser, PaintBucket, Square, Pipette,
  Grid3x3, ZoomIn, ZoomOut, Undo2, Redo2,
  Download, Upload, Move, Save, Layers, Box,
} from 'lucide-react'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { Tooltip } from './Tooltip'
import { saveToLocalStorage } from '../utils/localStorage'
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
  const [saved, setSaved] = useState(false)

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

      {/* Save / Export / Import */}
      <Tooltip text="Save" shortcut="Ctrl+S">
        <ToolBtn onClick={() => { saveToLocalStorage(state); setSaved(true); setTimeout(() => setSaved(false), 1500) }}>
          <Save size={16} />
        </ToolBtn>
      </Tooltip>
      {saved && <span className="text-xs text-green-400">Saved!</span>}
      <Tooltip text="Export">
        <ToolBtn onClick={() => dispatch({ type: 'SET_EXPORT_DIALOG', open: true })}>
          <Download size={16} />
        </ToolBtn>
      </Tooltip>
      <Tooltip text="Import JSON">
        <ToolBtn onClick={() => dispatch({ type: 'SET_IMPORT_DIALOG', open: true })}>
          <Upload size={16} />
        </ToolBtn>
      </Tooltip>

      <div className="w-px h-6 bg-neutral-600 mx-1" />

      {/* Map size controls */}
      <div className="flex items-center gap-1">
        <label className="text-xs text-neutral-500">Map</label>
        <Tooltip text="Columns" side="top">
          <input
            type="number"
            value={state.gridCols}
            onChange={e => dispatch({ type: 'SET_GRID_SIZE', cols: Math.max(1, +e.target.value || 1), rows: state.gridRows })}
            className="w-10 bg-neutral-900 border border-neutral-700 text-xs text-neutral-100 px-1 py-0.5 text-center"
            min={1}
          />
        </Tooltip>
        <span className="text-xs text-neutral-500">x</span>
        <Tooltip text="Rows" side="top">
          <input
            type="number"
            value={state.gridRows}
            onChange={e => dispatch({ type: 'SET_GRID_SIZE', cols: state.gridCols, rows: Math.max(1, +e.target.value || 1) })}
            className="w-10 bg-neutral-900 border border-neutral-700 text-xs text-neutral-100 px-1 py-0.5 text-center"
            min={1}
          />
        </Tooltip>
      </div>

      <div className="flex items-center gap-1 ml-1">
        <label className="text-xs text-neutral-500">Tile</label>
        <Tooltip text="Tile size (px)" side="top">
          <input
            type="number"
            value={state.tileSize}
            onChange={e => dispatch({ type: 'SET_TILE_SIZE', size: +e.target.value || 32 })}
            className="w-10 bg-neutral-900 border border-neutral-700 text-xs text-neutral-100 px-1 py-0.5 text-center"
            min={8}
            max={128}
            step={8}
          />
        </Tooltip>
        <span className="text-xs text-neutral-500">px</span>
      </div>
    </div>
  )
}

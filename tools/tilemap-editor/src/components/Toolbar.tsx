import {
  Pencil, Eraser, PaintBucket, Square, Pipette,
  Grid3x3, ZoomIn, ZoomOut, Undo2, Redo2,
  Download, Upload, Move,
} from 'lucide-react'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import type { ToolType } from '../types/editor'

const TOOLS: { type: ToolType; icon: typeof Pencil; label: string; shortcut: string }[] = [
  { type: 'pencil', icon: Pencil, label: 'Pencil', shortcut: 'B' },
  { type: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
  { type: 'fill', icon: PaintBucket, label: 'Fill', shortcut: 'G' },
  { type: 'select', icon: Square, label: 'Select', shortcut: 'S' },
  { type: 'eyedropper', icon: Pipette, label: 'Eyedropper', shortcut: 'I' },
]

function ToolBtn({ active, onClick, title, children }: {
  active?: boolean; onClick: () => void; title: string; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 border border-neutral-700 ${active ? 'bg-sky-700 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
    >
      {children}
    </button>
  )
}

export function Toolbar() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()

  return (
    <div className="flex items-center gap-1 px-2 h-10 bg-neutral-800 border-b border-neutral-700 shrink-0">
      {/* Tool buttons */}
      <div className="flex gap-0.5">
        {TOOLS.map(t => (
          <ToolBtn
            key={t.type}
            active={state.activeTool === t.type}
            onClick={() => dispatch({ type: 'SET_TOOL', tool: t.type })}
            title={`${t.label} (${t.shortcut})`}
          >
            <t.icon size={16} />
          </ToolBtn>
        ))}
      </div>

      <div className="w-px h-6 bg-neutral-600 mx-1" />

      {/* Grid toggle */}
      <ToolBtn
        active={state.showGrid}
        onClick={() => dispatch({ type: 'TOGGLE_GRID' })}
        title="Toggle Grid"
      >
        <Grid3x3 size={16} />
      </ToolBtn>

      {/* Resize mode */}
      <ToolBtn
        active={state.resizeMode}
        onClick={() => dispatch({ type: 'TOGGLE_RESIZE_MODE' })}
        title="Resize Map (R)"
      >
        <Move size={16} />
      </ToolBtn>

      <div className="w-px h-6 bg-neutral-600 mx-1" />

      {/* Zoom */}
      <ToolBtn onClick={() => dispatch({ type: 'SET_ZOOM', zoom: state.zoom * 1.25 })} title="Zoom In">
        <ZoomIn size={16} />
      </ToolBtn>
      <span className="text-xs text-neutral-400 w-12 text-center tabular-nums">
        {Math.round(state.zoom * 100)}%
      </span>
      <ToolBtn onClick={() => dispatch({ type: 'SET_ZOOM', zoom: state.zoom / 1.25 })} title="Zoom Out">
        <ZoomOut size={16} />
      </ToolBtn>

      <div className="w-px h-6 bg-neutral-600 mx-1" />

      {/* Undo / Redo */}
      <ToolBtn onClick={() => dispatch({ type: 'UNDO' })} title="Undo (Ctrl+Z)">
        <Undo2 size={16} />
      </ToolBtn>
      <ToolBtn onClick={() => dispatch({ type: 'REDO' })} title="Redo (Ctrl+Y)">
        <Redo2 size={16} />
      </ToolBtn>

      <div className="flex-1" />

      {/* Export / Import */}
      <ToolBtn onClick={() => dispatch({ type: 'SET_EXPORT_DIALOG', open: true })} title="Export">
        <Download size={16} />
      </ToolBtn>
      <ToolBtn onClick={() => dispatch({ type: 'SET_IMPORT_DIALOG', open: true })} title="Import JSON">
        <Upload size={16} />
      </ToolBtn>

      <div className="w-px h-6 bg-neutral-600 mx-1" />

      {/* Map size controls */}
      <div className="flex items-center gap-1">
        <label className="text-xs text-neutral-500">Map</label>
        <input
          type="number"
          value={state.gridCols}
          onChange={e => dispatch({ type: 'SET_GRID_SIZE', cols: Math.max(1, +e.target.value || 1), rows: state.gridRows })}
          className="w-10 bg-neutral-900 border border-neutral-700 text-xs text-neutral-100 px-1 py-0.5 text-center"
          title="Columns"
          min={1}
        />
        <span className="text-xs text-neutral-500">x</span>
        <input
          type="number"
          value={state.gridRows}
          onChange={e => dispatch({ type: 'SET_GRID_SIZE', cols: state.gridCols, rows: Math.max(1, +e.target.value || 1) })}
          className="w-10 bg-neutral-900 border border-neutral-700 text-xs text-neutral-100 px-1 py-0.5 text-center"
          title="Rows"
          min={1}
        />
      </div>

      <div className="flex items-center gap-1 ml-1">
        <label className="text-xs text-neutral-500">Tile</label>
        <input
          type="number"
          value={state.tileSize}
          onChange={e => dispatch({ type: 'SET_TILE_SIZE', size: +e.target.value || 32 })}
          className="w-10 bg-neutral-900 border border-neutral-700 text-xs text-neutral-100 px-1 py-0.5 text-center"
          title="Tile size (px)"
          min={8}
          max={128}
          step={8}
        />
        <span className="text-xs text-neutral-500">px</span>
      </div>
    </div>
  )
}

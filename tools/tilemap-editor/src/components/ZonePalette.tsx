import { useState } from 'react'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { Tooltip } from './Tooltip'

function randomColor(): string {
  const hue = Math.floor(Math.random() * 360)
  return `hsl(${hue}, 70%, 55%)`
}

export function ZonePalette() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const [creating, setCreating] = useState(false)
  const [newType, setNewType] = useState('')
  const [newColor, setNewColor] = useState(randomColor)

  const handleCreate = () => {
    const type = newType.trim()
    if (!type) return
    if (state.zoneDefs.some(d => d.type === type)) return
    dispatch({ type: 'ADD_ZONE_DEF', def: { type, color: newColor, properties: {} } })
    setNewType('')
    setNewColor(randomColor())
    setCreating(false)
  }

  return (
    <div className="h-full bg-neutral-800 flex flex-col">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-neutral-700 shrink-0">
        <span className="text-xs text-neutral-400 uppercase tracking-wider">Zone Defs</span>
        <Tooltip text="New Zone Type" side="left">
          <button
            onClick={() => { setCreating(!creating); setNewColor(randomColor()) }}
            className="p-0.5 text-neutral-400 hover:text-neutral-100 bg-neutral-700 hover:bg-neutral-600"
          >
            <Plus size={14} />
          </button>
        </Tooltip>
      </div>

      {creating && (
        <div className="px-2 py-2 border-b border-neutral-700 flex flex-col gap-1.5">
          <input
            autoFocus
            value={newType}
            onChange={e => setNewType(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
            placeholder="Zone type name..."
            className="bg-neutral-900 border border-neutral-700 text-xs text-neutral-100 px-2 py-1 w-full"
          />
          <div className="flex items-center gap-1.5">
            <div
              className="w-6 h-6 border border-neutral-600 shrink-0 cursor-pointer"
              style={{ backgroundColor: newColor }}
              onClick={() => setNewColor(randomColor())}
              title="Click to randomize color"
            />
            <button
              onClick={() => setNewColor(randomColor())}
              className="p-0.5 text-neutral-500 hover:text-neutral-300"
            >
              <RefreshCw size={12} />
            </button>
            <div className="flex-1" />
            <button
              onClick={handleCreate}
              disabled={!newType.trim()}
              className="text-xs px-2 py-0.5 bg-sky-700 text-white hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Create
            </button>
            <button
              onClick={() => setCreating(false)}
              className="text-xs px-2 py-0.5 bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {state.zoneDefs.map(def => (
          <div
            key={def.type}
            onClick={() => dispatch({ type: 'SELECT_ZONE_DEF', zoneType: state.selectedZoneDefType === def.type ? null : def.type })}
            className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer border-b border-neutral-700/50 ${
              state.selectedZoneDefType === def.type ? 'bg-sky-900/40 border-l-2 border-l-sky-500' : 'hover:bg-neutral-700/50'
            }`}
          >
            <div
              className="w-4 h-4 shrink-0 border border-neutral-600"
              style={{ backgroundColor: def.color }}
            />
            <span className="text-xs text-neutral-100 flex-1 truncate">{def.type}</span>
            <Tooltip text="Delete" side="left" delay={600}>
              <button
                onClick={e => { e.stopPropagation(); dispatch({ type: 'REMOVE_ZONE_DEF', zoneType: def.type }) }}
                className="p-0.5 text-neutral-500 hover:text-red-400"
              >
                <Trash2 size={12} />
              </button>
            </Tooltip>
          </div>
        ))}
      </div>
    </div>
  )
}

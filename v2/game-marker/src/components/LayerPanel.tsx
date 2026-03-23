import { useState } from 'react'
import {
  Eye, EyeOff, Lock, Unlock, Trash2, Plus,
  ChevronUp, ChevronDown, Layers,
} from 'lucide-react'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { Tooltip } from './Tooltip'

export function LayerPanel() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const startRename = (id: string, name: string) => {
    setEditingId(id)
    setEditName(name)
  }

  const finishRename = () => {
    if (editingId && editName.trim()) {
      dispatch({ type: 'RENAME_LAYER', layerId: editingId, name: editName.trim() })
    }
    setEditingId(null)
  }

  // Display top layer first
  const reversedLayers = [...state.layers].reverse()

  return (
    <div className="flex-1 bg-neutral-800 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-neutral-700">
        <div className="flex items-center gap-1 text-xs text-neutral-400 uppercase tracking-wider">
          <Layers size={12} />
          <span>Layers</span>
        </div>
        <Tooltip text="Add Layer" side="right">
          <button
            onClick={() => {
              dispatch({ type: 'PUSH_HISTORY' })
              dispatch({ type: 'ADD_LAYER' })
            }}
            className="p-0.5 text-neutral-400 hover:text-neutral-100 bg-neutral-700 hover:bg-neutral-600"
          >
            <Plus size={14} />
          </button>
        </Tooltip>
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto">
        {reversedLayers.map(layer => {
          const isActive = layer.id === state.activeLayerId
          return (
            <div
              key={layer.id}
              onClick={() => dispatch({ type: 'SET_ACTIVE_LAYER', layerId: layer.id })}
              className={`flex items-center gap-1 px-2 py-1 cursor-pointer border-b border-neutral-700/50 ${
                isActive ? 'bg-neutral-700' : 'hover:bg-neutral-750 hover:bg-neutral-700/50'
              }`}
            >
              {/* Visibility */}
              <Tooltip text={layer.visible ? 'Hide (Alt: Solo)' : 'Show (Alt: Solo)'} side="right" delay={600}>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    if (e.altKey) {
                      dispatch({ type: 'SOLO_LAYER', layerId: layer.id })
                    } else {
                      dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', layerId: layer.id })
                    }
                  }}
                  className="p-0.5 text-neutral-400 hover:text-neutral-100"
                >
                  {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
              </Tooltip>

              {/* Lock */}
              <Tooltip text={layer.locked ? 'Unlock Layer' : 'Lock Layer'} side="right" delay={600}>
                <button
                  onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_LAYER_LOCK', layerId: layer.id }) }}
                  className="p-0.5 text-neutral-400 hover:text-neutral-100"
                >
                  {layer.locked ? <Lock size={12} className='text-amber-500'/> : <Unlock size={12} />}
                </button>
              </Tooltip>

              {/* Name */}
              {editingId === layer.id ? (
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={finishRename}
                  onKeyDown={e => { if (e.key === 'Enter') finishRename(); if (e.key === 'Escape') setEditingId(null) }}
                  className="flex-1 bg-neutral-900 text-xs text-neutral-100 px-1 py-0.5 outline-none border border-neutral-600"
                  autoFocus
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span
                  className="flex-1 text-xs truncate"
                  onDoubleClick={() => startRename(layer.id, layer.name)}
                >
                  {layer.name}
                </span>
              )}

              {/* Reorder */}
              <Tooltip text="Move Up" side="right" delay={600}>
                <button
                  onClick={e => { e.stopPropagation(); dispatch({ type: 'REORDER_LAYER', layerId: layer.id, direction: 'up' }) }}
                  className="p-0.5 text-neutral-500 hover:text-neutral-100"
                >
                  <ChevronUp size={12} />
                </button>
              </Tooltip>
              <Tooltip text="Move Down" side="right" delay={600}>
                <button
                  onClick={e => { e.stopPropagation(); dispatch({ type: 'REORDER_LAYER', layerId: layer.id, direction: 'down' }) }}
                  className="p-0.5 text-neutral-500 hover:text-neutral-100"
                >
                  <ChevronDown size={12} />
                </button>
              </Tooltip>

              {/* Delete */}
              <Tooltip text="Delete Layer" side="right" delay={600}>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    dispatch({ type: 'PUSH_HISTORY' })
                    dispatch({ type: 'REMOVE_LAYER', layerId: layer.id })
                  }}
                  className="p-0.5 text-neutral-500 hover:text-red-400"
                >
                  <Trash2 size={12} />
                </button>
              </Tooltip>
            </div>
          )
        })}
      </div>
    </div>
  )
}

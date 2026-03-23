import { useState } from 'react'
import { Trash2, Box, ChevronDown, ChevronRight, ChevronUp, Eye, EyeOff, Lock, Unlock, Plus } from 'lucide-react'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { useEntityContext } from '../state/EntityContext'
import { Tooltip } from './Tooltip'
import type { EntityLayer } from '../types/entity'

export function EntityList() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const { getDefById, entityDefs } = useEntityContext()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [inspectorOpen, setInspectorOpen] = useState<string | null>(null)

  const toggleCollapse = (layerId: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(layerId) ? next.delete(layerId) : next.add(layerId)
      return next
    })
  }

  const totalEntities = state.entityLayers.reduce((sum, l) => sum + l.entities.length, 0)

  return (
    <div className="flex-1 bg-neutral-800 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-neutral-700 shrink-0">
        <div className="flex items-center gap-1 text-xs text-neutral-400 uppercase tracking-wider">
          <Box size={12} />
          <span>Entities ({totalEntities})</span>
        </div>
        <Tooltip text="Add Entity Layer" side="left">
          <button
            onClick={() => dispatch({ type: 'ADD_ENTITY_LAYER' })}
            className="p-0.5 text-neutral-400 hover:text-neutral-100 bg-neutral-700 hover:bg-neutral-600"
          >
            <Plus size={14} />
          </button>
        </Tooltip>
      </div>

      <div className="flex-1 overflow-y-auto">
        {state.entityLayers.length === 0 ? (
          <div className="p-3 text-xs text-neutral-500 text-center">
            No entity layers.
          </div>
        ) : (
          [...state.entityLayers].reverse().map(layer => (
            <EntityLayerItem
              key={layer.id}
              layer={layer}
              isActive={state.activeEntityLayerId === layer.id}
              selectedEntityId={state.selectedEntityId}
              collapsed={collapsed.has(layer.id)}
              onToggleCollapse={() => toggleCollapse(layer.id)}
              inspectorOpen={inspectorOpen}
              setInspectorOpen={setInspectorOpen}
              getDefName={(defId) => getDefById(defId)?.name ?? defId}
              entityDefs={entityDefs}
            />
          ))
        )}
      </div>
    </div>
  )
}

function EntityLayerItem({ layer, isActive, selectedEntityId, collapsed, onToggleCollapse, inspectorOpen, setInspectorOpen, getDefName, entityDefs }: {
  layer: EntityLayer
  isActive: boolean
  selectedEntityId: string | null
  collapsed: boolean
  onToggleCollapse: () => void
  inspectorOpen: string | null
  setInspectorOpen: (id: string | null) => void
  getDefName: (defId: string) => string
  entityDefs: import('../types/entity').EntityDef[]
}) {
  const dispatch = useEditorDispatch()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(layer.name)

  return (
    <div>
      {/* Layer header */}
      <div
        onClick={() => dispatch({ type: 'SET_ACTIVE_ENTITY_LAYER', layerId: layer.id })}
        className={`flex items-center gap-1 px-1 py-1 cursor-pointer border-b border-neutral-700/50 text-xs ${
          isActive ? 'bg-neutral-700' : 'hover:bg-neutral-750'
        }`}
      >
        <button onClick={e => { e.stopPropagation(); onToggleCollapse() }} className="p-0.5 text-neutral-500">
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        </button>

        <button onClick={e => {
            e.stopPropagation()
            if (e.altKey) {
              dispatch({ type: 'SOLO_ENTITY_LAYER', layerId: layer.id })
            } else {
              dispatch({ type: 'TOGGLE_ENTITY_LAYER_VISIBILITY', layerId: layer.id })
            }
          }}
          className={`p-0.5 ${layer.visible ? 'text-neutral-400' : 'text-neutral-600'}`}>
          {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>

        <button onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_ENTITY_LAYER_LOCK', layerId: layer.id }) }}
          className={`p-0.5 ${layer.locked ? 'text-amber-500' : 'text-neutral-600'}`}>
          {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>

        {editing ? (
          <input value={editName} onChange={e => setEditName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { dispatch({ type: 'RENAME_ENTITY_LAYER', layerId: layer.id, name: editName.trim() || layer.name }); setEditing(false) }
              if (e.key === 'Escape') { setEditName(layer.name); setEditing(false) }
            }}
            onBlur={() => { dispatch({ type: 'RENAME_ENTITY_LAYER', layerId: layer.id, name: editName.trim() || layer.name }); setEditing(false) }}
            onClick={e => e.stopPropagation()}
            className="flex-1 px-1 bg-neutral-900 border border-neutral-600 text-xs text-neutral-100 focus:outline-none"
            autoFocus />
        ) : (
          <span className="flex-1 truncate text-neutral-200" onDoubleClick={e => { e.stopPropagation(); setEditing(true); setEditName(layer.name) }}>
            {layer.name}
          </span>
        )}

        <span className="text-[10px] text-neutral-500 mr-1">{layer.entities.length}</span>

        <button onClick={e => { e.stopPropagation(); dispatch({ type: 'REORDER_ENTITY_LAYER', layerId: layer.id, direction: 'up' }) }}
          className="p-0.5 text-neutral-600 hover:text-neutral-300 text-[10px]">▲</button>
        <button onClick={e => { e.stopPropagation(); dispatch({ type: 'REORDER_ENTITY_LAYER', layerId: layer.id, direction: 'down' }) }}
          className="p-0.5 text-neutral-600 hover:text-neutral-300 text-[10px]">▼</button>

        <button onClick={e => { e.stopPropagation(); dispatch({ type: 'REMOVE_ENTITY_LAYER', layerId: layer.id }) }}
          className="p-0.5 text-neutral-600 hover:text-red-400">
          <Trash2 size={11} />
        </button>
      </div>

      {/* Entities inside layer */}
      {!collapsed && [...layer.entities].reverse().map(entity => {
        const isSelected = selectedEntityId === entity.id
        const isInspecting = inspectorOpen === entity.id
        return (
          <div key={entity.id}>
            <div
              onClick={() => dispatch({ type: 'SELECT_ENTITY', entityId: entity.id })}
              className={`flex items-center gap-1 pl-6 pr-2 py-1 cursor-pointer border-b border-neutral-700/30 text-xs ${
                isSelected ? 'bg-sky-900/40' : 'hover:bg-neutral-700/50'
              }`}
            >
              <button onClick={e => { e.stopPropagation(); setInspectorOpen(isInspecting ? null : entity.id) }}
                className="p-0.5 text-neutral-500">
                {isInspecting ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              </button>
              <span className="flex-1 truncate text-neutral-300">{entity.name ?? getDefName(entity.defId)}</span>
              <span className="text-[10px] text-neutral-500">{entity.row},{entity.col}</span>
              <button onClick={e => { e.stopPropagation(); dispatch({ type: 'REORDER_ENTITY', entityId: entity.id, direction: 'up' }) }}
                className="p-0.5 text-neutral-600 hover:text-neutral-300">
                <ChevronUp size={10} />
              </button>
              <button onClick={e => { e.stopPropagation(); dispatch({ type: 'REORDER_ENTITY', entityId: entity.id, direction: 'down' }) }}
                className="p-0.5 text-neutral-600 hover:text-neutral-300">
                <ChevronDown size={10} />
              </button>
              <button onClick={e => { e.stopPropagation(); dispatch({ type: 'DELETE_ENTITY', entityId: entity.id }) }}
                className="p-0.5 text-neutral-600 hover:text-red-400">
                <Trash2 size={10} />
              </button>
            </div>

            {isInspecting && <EntityInspector entityId={entity.id} entityDefs={entityDefs} />}
          </div>
        )
      })}
    </div>
  )
}

function EntityInspector({ entityId, entityDefs }: { entityId: string; entityDefs: import('../types/entity').EntityDef[] }) {
  const state = useEditorState()
  const dispatch = useEditorDispatch()

  // Find entity across layers
  let entity: import('../types/entity').Entity | undefined
  for (const l of state.entityLayers) {
    entity = l.entities.find(e => e.id === entityId)
    if (entity) break
  }
  if (!entity) return null

  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')

  const updateProp = (key: string, value: string) => {
    dispatch({ type: 'UPDATE_ENTITY_PROPS', entityId, properties: { [key]: value } })
  }

  const removeProp = (key: string) => {
    const props = { ...entity!.properties }
    delete props[key]
    dispatch({ type: 'UPDATE_ENTITY_PROPS', entityId, properties: props })
  }

  const addProp = () => {
    if (!newKey.trim()) return
    dispatch({ type: 'UPDATE_ENTITY_PROPS', entityId, properties: { [newKey.trim()]: newVal } })
    setNewKey('')
    setNewVal('')
  }

  return (
    <div className="bg-neutral-900 border-b border-neutral-700/50 px-3 py-2 ml-6">
      <div className="flex gap-2 mb-1">
        <label className="text-[10px] text-neutral-500 w-8">Row</label>
        <input type="number" value={entity.row}
          onChange={e => dispatch({ type: 'MOVE_ENTITY', entityId, row: +e.target.value || 0, col: entity!.col, entityDefs })}
          className="w-12 bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-100 px-1 text-center" />
        <label className="text-[10px] text-neutral-500 w-8">Col</label>
        <input type="number" value={entity.col}
          onChange={e => dispatch({ type: 'MOVE_ENTITY', entityId, row: entity!.row, col: +e.target.value || 0, entityDefs })}
          className="w-12 bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-100 px-1 text-center" />
      </div>

      {Object.entries(entity.properties).map(([key, val]) => (
        <div key={key} className="flex items-center gap-1 mb-0.5">
          <span className="text-[10px] text-neutral-400 w-16 truncate">{key}</span>
          <input value={String(val)} onChange={e => updateProp(key, e.target.value)}
            className="flex-1 bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-100 px-1" />
          <button onClick={() => removeProp(key)} className="text-neutral-500 hover:text-red-400 text-[10px]">x</button>
        </div>
      ))}

      <div className="flex items-center gap-1 mt-1">
        <input placeholder="key" value={newKey} onChange={e => setNewKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addProp()}
          className="w-16 bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-100 px-1 placeholder-neutral-600" />
        <input placeholder="value" value={newVal} onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addProp()}
          className="flex-1 bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-100 px-1 placeholder-neutral-600" />
        <button onClick={addProp} className="text-[10px] text-neutral-400 hover:text-neutral-100">+</button>
      </div>
    </div>
  )
}

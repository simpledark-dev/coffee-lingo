import { useState } from 'react'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { useEntityContext } from '../state/EntityContext'
import { getDefVisual, isDirectional, DIRECTIONS } from '../types/entity'
import { VisualBadge } from '../pages/EntityManagerPage'
import type { Entity, EntityDef, Direction } from '../types/entity'

export function EntityInspectorPanel() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const { entityDefs, getDefById } = useEntityContext()

  // Find selected entities
  const selected: { entity: Entity; def: EntityDef }[] = []
  for (const id of state.selectedEntityIds) {
    for (const l of state.entityLayers) {
      const e = l.entities.find(en => en.id === id)
      if (e) {
        const def = getDefById(e.defId)
        if (def) selected.push({ entity: e, def })
        break
      }
    }
  }

  if (selected.length === 0) {
    return (
      <div className="h-full bg-neutral-800 flex items-center justify-center text-neutral-500 text-xs">
        Select an entity to inspect
      </div>
    )
  }

  if (selected.length > 1) {
    return (
      <div className="h-full bg-neutral-800 flex flex-col">
        <div className="px-3 py-2 border-b border-neutral-700 text-xs text-neutral-400">
          {selected.length} entities selected
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {selected.map(({ entity, def }) => (
            <div key={entity.id} className="flex items-center gap-1.5 py-1 text-xs text-neutral-300">
              <VisualBadge def={def} />
              <span className="truncate">{entity.name ?? def.name}</span>
              <span className="text-[10px] text-neutral-500 ml-auto">{entity.row},{entity.col}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Single entity selected
  const { entity, def } = selected[0]
  return <SingleEntityInspector entity={entity} def={def} entityDefs={entityDefs} />
}

function SingleEntityInspector({ entity, def, entityDefs }: {
  entity: Entity; def: EntityDef; entityDefs: EntityDef[]
}) {
  const dispatch = useEditorDispatch()
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(entity.name ?? def.name)

  const visual = getDefVisual(def)

  const updateProp = (key: string, value: string) => {
    dispatch({ type: 'UPDATE_ENTITY_PROPS', entityId: entity.id, properties: { [key]: value } })
  }

  const removeProp = (key: string) => {
    const props = { ...entity.properties }
    delete props[key]
    // Replace all properties
    dispatch({ type: 'UPDATE_ENTITY_PROPS', entityId: entity.id, properties: {} })
    // Set remaining
    if (Object.keys(props).length > 0) {
      dispatch({ type: 'UPDATE_ENTITY_PROPS', entityId: entity.id, properties: props })
    }
  }

  const addProp = () => {
    if (!newKey.trim()) return
    dispatch({ type: 'UPDATE_ENTITY_PROPS', entityId: entity.id, properties: { [newKey.trim()]: newVal } })
    setNewKey('')
    setNewVal('')
  }

  return (
    <div className="h-full bg-neutral-800 flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-neutral-700 shrink-0">
        <div className="flex items-center gap-1.5">
          <VisualBadge def={def} />
          {editingName ? (
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  dispatch({ type: 'UPDATE_ENTITY_PROPS', entityId: entity.id, properties: { __name: nameInput.trim() || def.name } })
                  setEditingName(false)
                }
                if (e.key === 'Escape') setEditingName(false)
              }}
              onBlur={() => setEditingName(false)}
              className="flex-1 px-1 bg-neutral-900 border border-neutral-600 text-xs text-neutral-100 outline-none"
              autoFocus
            />
          ) : (
            <span className="text-sm text-neutral-100 font-medium truncate cursor-pointer" onDoubleClick={() => { setEditingName(true); setNameInput(entity.name ?? def.name) }}>
              {entity.name ?? def.name}
            </span>
          )}
        </div>
        <div className="text-[10px] text-neutral-500 mt-0.5">
          {def.name} · {visual.width}x{visual.height}
        </div>
      </div>

      {/* Position */}
      <div className="px-3 py-2 border-b border-neutral-700 shrink-0">
        <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Position</div>
        <div className="flex gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-neutral-500 w-6">Row</span>
            <input type="number" value={entity.row}
              onChange={e => dispatch({ type: 'MOVE_ENTITY', entityId: entity.id, row: +e.target.value || 0, col: entity.col, entityDefs })}
              className="w-14 bg-neutral-900 border border-neutral-700 text-xs text-neutral-100 px-1 py-0.5 text-center" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-neutral-500 w-6">Col</span>
            <input type="number" value={entity.col}
              onChange={e => dispatch({ type: 'MOVE_ENTITY', entityId: entity.id, row: entity.row, col: +e.target.value || 0, entityDefs })}
              className="w-14 bg-neutral-900 border border-neutral-700 text-xs text-neutral-100 px-1 py-0.5 text-center" />
          </div>
        </div>
      </div>

      {/* State & Direction */}
      <div className="px-3 py-2 border-b border-neutral-700 shrink-0">
        <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">State & Direction</div>
        <div className="flex gap-2">
          <div className="flex-1">
            <span className="text-[10px] text-neutral-500">State</span>
            <select
              value={entity.state ?? def.defaultState}
              onChange={e => dispatch({ type: 'SET_ENTITY_STATE', entityId: entity.id, state: e.target.value })}
              className="w-full px-1 py-0.5 bg-neutral-900 border border-neutral-700 text-xs text-neutral-200"
            >
              {Object.keys(def.states).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {(() => {
            const sv = def.states[entity.state ?? def.defaultState]
            if (!sv || !isDirectional(sv)) return null
            return (
              <div className="flex-1">
                <span className="text-[10px] text-neutral-500">Direction</span>
                <select
                  value={entity.direction ?? def.defaultDirection ?? 'down'}
                  onChange={e => dispatch({ type: 'SET_ENTITY_DIRECTION', entityId: entity.id, direction: e.target.value as Direction })}
                  className="w-full px-1 py-0.5 bg-neutral-900 border border-neutral-700 text-xs text-neutral-200"
                >
                  {DIRECTIONS.filter(d => sv[d]).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Flip */}
      <div className="px-3 py-2 border-b border-neutral-700 shrink-0">
        <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Flip</div>
        <div className="flex gap-2">
          <button
            onClick={() => dispatch({ type: 'FLIP_ENTITY', entityId: entity.id, axis: 'x' })}
            className={`px-2 py-0.5 text-xs border ${entity.flipX ? 'bg-sky-700 border-sky-600 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'}`}
          >Flip X</button>
          <button
            onClick={() => dispatch({ type: 'FLIP_ENTITY', entityId: entity.id, axis: 'y' })}
            className={`px-2 py-0.5 text-xs border ${entity.flipY ? 'bg-sky-700 border-sky-600 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'}`}
          >Flip Y</button>
        </div>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Properties</div>
        {Object.entries(entity.properties).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-neutral-400 w-20 truncate shrink-0">{key}</span>
            <input value={String(val)} onChange={e => updateProp(key, e.target.value)}
              className="flex-1 bg-neutral-900 border border-neutral-700 text-xs text-neutral-100 px-1 py-0.5" />
            <button onClick={() => removeProp(key)} className="text-neutral-600 hover:text-red-400 text-[10px] shrink-0">✕</button>
          </div>
        ))}
        <div className="flex items-center gap-1 mt-2">
          <input placeholder="key" value={newKey} onChange={e => setNewKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addProp()}
            className="w-20 bg-neutral-900 border border-neutral-700 text-[10px] text-neutral-100 px-1 py-0.5 placeholder-neutral-600 shrink-0" />
          <input placeholder="value" value={newVal} onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addProp()}
            className="flex-1 bg-neutral-900 border border-neutral-700 text-[10px] text-neutral-100 px-1 py-0.5 placeholder-neutral-600" />
          <button onClick={addProp} className="text-[10px] text-neutral-400 hover:text-neutral-100 shrink-0">+</button>
        </div>
      </div>
    </div>
  )
}

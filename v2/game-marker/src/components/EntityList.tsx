import { useState } from 'react'
import { Trash2, Box, ChevronDown, ChevronRight } from 'lucide-react'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { useEntityContext } from '../state/EntityContext'
import { Tooltip } from './Tooltip'

export function EntityList() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const { getDefById } = useEntityContext()
  const [inspectorOpen, setInspectorOpen] = useState<string | null>(null)

  return (
    <div className="flex-1 bg-neutral-800 flex flex-col min-h-0">
      <div className="flex items-center px-2 py-1.5 border-b border-neutral-700 shrink-0">
        <div className="flex items-center gap-1 text-xs text-neutral-400 uppercase tracking-wider">
          <Box size={12} />
          <span>Entities ({state.entities.length})</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {state.entities.length === 0 ? (
          <div className="p-3 text-xs text-neutral-500 text-center">
            No entities placed. Select an entity type from the palette and click on the canvas.
          </div>
        ) : (
          state.entities.map(entity => {
            const isSelected = state.selectedEntityId === entity.id
            const isInspecting = inspectorOpen === entity.id
            return (
              <div key={entity.id}>
                <div
                  onClick={() => dispatch({ type: 'SELECT_ENTITY', entityId: entity.id })}
                  className={`flex items-center gap-1 px-2 py-1 cursor-pointer border-b border-neutral-700/50 ${
                    isSelected ? 'bg-sky-900/40' : 'hover:bg-neutral-700/50'
                  }`}
                >
                  <button
                    onClick={e => { e.stopPropagation(); setInspectorOpen(isInspecting ? null : entity.id) }}
                    className="p-0.5 text-neutral-500"
                  >
                    {isInspecting ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  <span className="flex-1 text-xs truncate">{getDefById(entity.defId)?.name ?? entity.defId}</span>
                  <span className="text-[10px] text-neutral-500">{entity.row},{entity.col}</span>
                  <Tooltip text="Delete Entity" side="right" delay={600}>
                    <button
                      onClick={e => { e.stopPropagation(); dispatch({ type: 'DELETE_ENTITY', entityId: entity.id }) }}
                      className="p-0.5 text-neutral-500 hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </Tooltip>
                </div>

                {/* Inline Inspector */}
                {isInspecting && (
                  <EntityInspector entityId={entity.id} />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function EntityInspector({ entityId }: { entityId: string }) {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const { entityDefs } = useEntityContext()
  const entity = state.entities.find(e => e.id === entityId)
  if (!entity) return null

  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')

  const updateProp = (key: string, value: string) => {
    dispatch({ type: 'UPDATE_ENTITY_PROPS', entityId, properties: { [key]: value } })
  }

  const removeProp = (key: string) => {
    const props = { ...entity.properties }
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
    <div className="bg-neutral-900 border-b border-neutral-700/50 px-3 py-2">
      {/* Position */}
      <div className="flex gap-2 mb-1">
        <label className="text-[10px] text-neutral-500 w-8">Row</label>
        <input
          type="number"
          value={entity.row}
          onChange={e => dispatch({ type: 'MOVE_ENTITY', entityId, row: +e.target.value || 0, col: entity.col, entityDefs })}
          className="w-12 bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-100 px-1 text-center"
        />
        <label className="text-[10px] text-neutral-500 w-8">Col</label>
        <input
          type="number"
          value={entity.col}
          onChange={e => dispatch({ type: 'MOVE_ENTITY', entityId, row: entity.row, col: +e.target.value || 0, entityDefs })}
          className="w-12 bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-100 px-1 text-center"
        />
      </div>

      {/* Properties */}
      {Object.entries(entity.properties).map(([key, val]) => (
        <div key={key} className="flex items-center gap-1 mb-0.5">
          <span className="text-[10px] text-neutral-400 w-16 truncate">{key}</span>
          <input
            value={String(val)}
            onChange={e => updateProp(key, e.target.value)}
            className="flex-1 bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-100 px-1"
          />
          <button onClick={() => removeProp(key)} className="text-neutral-500 hover:text-red-400 text-[10px]">x</button>
        </div>
      ))}

      {/* Add property */}
      <div className="flex items-center gap-1 mt-1">
        <input
          placeholder="key"
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addProp()}
          className="w-16 bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-100 px-1 placeholder-neutral-600"
        />
        <input
          placeholder="value"
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addProp()}
          className="flex-1 bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-100 px-1 placeholder-neutral-600"
        />
        <button onClick={addProp} className="text-[10px] text-neutral-400 hover:text-neutral-100">+</button>
      </div>
    </div>
  )
}

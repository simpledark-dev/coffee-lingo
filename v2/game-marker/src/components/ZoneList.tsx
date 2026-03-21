import { Trash2 } from 'lucide-react'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { Tooltip } from './Tooltip'

export function ZoneList() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()

  return (
    <div className="h-full bg-neutral-800 flex flex-col">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-neutral-700 shrink-0">
        <span className="text-xs text-neutral-400 uppercase tracking-wider">Zones</span>
        <span className="text-[10px] text-neutral-500">{state.zones.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {state.zones.length === 0 ? (
          <div className="p-3 text-xs text-neutral-500 text-center">
            No zones placed yet. Select a zone type and drag on the canvas.
          </div>
        ) : (
          state.zones.map(zone => {
            const def = state.zoneDefs.find(d => d.type === zone.type)
            const color = def?.color ?? '#888'
            const active = state.selectedZoneId === zone.id

            return (
              <div
                key={zone.id}
                onClick={() => dispatch({ type: 'SELECT_ZONE', zoneId: active ? null : zone.id })}
                className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer border-b border-neutral-700/50 ${
                  active ? 'bg-sky-900/40 border-l-2 border-l-sky-500' : 'hover:bg-neutral-700/50'
                }`}
              >
                <div
                  className="w-3 h-3 shrink-0 border border-neutral-600"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-neutral-100 truncate">{zone.type}</div>
                  <div className="text-[10px] text-neutral-500">
                    ({zone.col},{zone.row}) {zone.width}x{zone.height}
                  </div>
                </div>
                <Tooltip text="Delete" side="right" delay={600}>
                  <button
                    onClick={e => { e.stopPropagation(); dispatch({ type: 'DELETE_ZONE', zoneId: zone.id }) }}
                    className="p-0.5 text-neutral-500 hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                </Tooltip>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

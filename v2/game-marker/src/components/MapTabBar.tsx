import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { useProject } from '../state/ProjectContext'
import { useDialog } from './Dialog'
import { useToast } from './Toast'
import { listMaps, saveMap, deleteMap } from '../storage/db'
import { exportJson } from '../utils/exportJson'
import type { TilemapJSON } from '../types/editor'
import type { ProjectMap } from '../types/project'

function blankMap(name: string, tileSize: number): TilemapJSON {
  return {
    version: 2,
    name,
    gridCols: 20,
    gridRows: 15,
    tileSize,
    tilesets: [],
    layers: [{ id: crypto.randomUUID(), name: 'Layer 1', visible: true, locked: true, tiles: [] }],
    entityLayers: [{ id: crypto.randomUUID(), name: 'Entities', visible: true, locked: false, entities: [] }],
  }
}

export function MapTabBar() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const { currentProject } = useProject()
  const { confirm } = useDialog()
  const toast = useToast()

  const [maps, setMaps] = useState<ProjectMap[]>([])
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameName, setRenameName] = useState('')
  const tabBarRef = useRef<HTMLDivElement>(null)

  const projectId = currentProject?.id

  // Load maps list
  const refreshMaps = useCallback(async () => {
    if (!projectId) return
    const all = await listMaps(projectId)
    setMaps(prev => {
      // Preserve existing order, append new maps at end
      const prevIds = prev.map(m => m.id)
      const kept = prevIds.map(id => all.find(m => m.id === id)).filter((m): m is ProjectMap => m != null)
      const added = all.filter(m => !prevIds.includes(m.id))
      return [...kept, ...added]
    })
  }, [projectId])

  useEffect(() => { refreshMaps() }, [refreshMaps])

  // Refresh when currentMapId changes
  useEffect(() => { refreshMaps() }, [state.currentMapId, refreshMaps])

  // Save current map to DB
  const saveCurrentMap = useCallback(async () => {
    if (!projectId || !state.currentMapId) return
    const data = exportJson(state)
    await saveMap(projectId, state.mapName || 'Untitled', data, state.currentMapId)
  }, [projectId, state])

  // Switch to a different map
  const handleSwitchMap = useCallback(async (map: ProjectMap) => {
    if (map.id === state.currentMapId) return
    await saveCurrentMap()
    dispatch({ type: 'IMPORT_MAP', data: map.data, mapId: map.id })
  }, [state.currentMapId, saveCurrentMap, dispatch])

  // Create new map
  const handleNewMap = useCallback(async () => {
    if (!projectId) return
    await saveCurrentMap()
    const count = maps.length + 1
    const data = blankMap(`Map ${count}`, state.tileSize)
    const saved = await saveMap(projectId, data.name, data)
    await refreshMaps()
    dispatch({ type: 'IMPORT_MAP', data: saved.data, mapId: saved.id })
  }, [projectId, saveCurrentMap, maps.length, state.tileSize, refreshMaps, dispatch])

  // Delete map
  const handleDeleteMap = useCallback(async (mapId: string) => {
    if (maps.length <= 1) return
    const map = maps.find(m => m.id === mapId)
    if (!map) return
    if (!await confirm('Delete Map', `Delete "${map.name}"? This cannot be undone.`)) return
    await deleteMap(mapId)
    const remaining = maps.filter(m => m.id !== mapId)
    setMaps(remaining)
    if (state.currentMapId === mapId && remaining.length > 0) {
      const next = remaining[remaining.length - 1]
      dispatch({ type: 'IMPORT_MAP', data: next.data, mapId: next.id })
    }
  }, [maps, state.currentMapId, confirm, dispatch])

  // Rename map
  const handleRename = useCallback(async (mapId: string, newName: string) => {
    if (!projectId || !newName.trim()) { setRenaming(null); return }
    const map = maps.find(m => m.id === mapId)
    if (!map) { setRenaming(null); return }
    const updatedData = { ...map.data, name: newName.trim() }
    await saveMap(projectId, newName.trim(), updatedData, mapId)
    if (state.currentMapId === mapId) {
      dispatch({ type: 'IMPORT_MAP', data: updatedData, mapId })
    }
    await refreshMaps()
    setRenaming(null)
  }, [projectId, maps, state.currentMapId, dispatch, refreshMaps])

  return (
    <div
      ref={tabBarRef}
      className="flex items-center shrink-0 bg-neutral-850 border-b border-neutral-700 overflow-x-auto scrollbar-none"
      onWheel={e => { if (tabBarRef.current) tabBarRef.current.scrollLeft += e.deltaY }}
    >
      {maps.map(map => {
        const isActive = map.id === state.currentMapId
        return (
          <button
            key={map.id}
            onClick={() => handleSwitchMap(map)}
            onDoubleClick={e => { e.stopPropagation(); setRenaming(map.id); setRenameName(map.name) }}
            className={`flex items-center gap-1 px-3 py-1 text-[11px] shrink-0 border-r border-neutral-700/50 ${
              isActive
                ? 'bg-neutral-800 text-neutral-100 border-b-2 border-b-sky-500'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
            }`}
          >
            {renaming === map.id ? (
              <input
                value={renameName}
                onChange={e => setRenameName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRename(map.id, renameName)
                  if (e.key === 'Escape') setRenaming(null)
                }}
                onBlur={() => handleRename(map.id, renameName)}
                onClick={e => e.stopPropagation()}
                className="w-20 px-1 bg-neutral-900 border border-neutral-600 text-[11px] text-neutral-200 outline-none"
                autoFocus
              />
            ) : (
              <span className="truncate max-w-28">{map.name}</span>
            )}
            {maps.length > 1 && (
              <span
                onClick={e => { e.stopPropagation(); handleDeleteMap(map.id) }}
                className="p-0.5 rounded hover:bg-neutral-600/50 text-neutral-600 hover:text-neutral-300"
              >
                <X size={9} />
              </span>
            )}
          </button>
        )
      })}

      <button
        onClick={handleNewMap}
        className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50 shrink-0"
        title="New Map"
      >
        <Plus size={12} />
      </button>
    </div>
  )
}

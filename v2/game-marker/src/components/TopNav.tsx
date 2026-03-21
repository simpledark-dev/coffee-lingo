import { useCallback, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useProject } from '../state/ProjectContext'
import { ArrowLeft, FolderOpen, Images, Box, Map, Settings, Download, PackageOpen } from 'lucide-react'
import { exportProjectZip, downloadZip } from '../storage/db'
import { exportGameZip } from '../utils/exportGame'
import { useToast } from './Toast'
import { listMaps } from '../storage/db'

export function TopNav() {
  const { currentProject } = useProject()
  const navigate = useNavigate()
  const toast = useToast()
  const [exporting, setExporting] = useState(false)
  const [gameExporting, setGameExporting] = useState(false)

  const handleExport = useCallback(async () => {
    if (!currentProject || exporting) return
    setExporting(true)
    try {
      const zip = await exportProjectZip(currentProject.id)
      downloadZip(zip, `${currentProject.name}.gmproj.zip`)
      toast('Project exported', 'success')
    } catch (e) {
      console.error('Export failed:', e)
      toast('Export failed', 'error')
    }
    setExporting(false)
  }, [currentProject, exporting, toast])

  const handleGameExport = useCallback(async () => {
    if (!currentProject || gameExporting) return
    setGameExporting(true)
    try {
      // Load latest map data for tilemap/entities
      const maps = await listMaps(currentProject.id)
      const latestMap = maps.sort((a, b) => b.updatedAt - a.updatedAt)[0]
      // We need EditorState but we only have the saved map JSON — reconstruct minimal state
      // For game export, pass null if no map saved
      const { hydrateLayers } = await import('../utils/importJson')
      let editorState = null
      if (latestMap) {
        const mapData = latestMap.data
        const layers = hydrateLayers(mapData)
        editorState = {
          mapName: mapData.name,
          gridCols: mapData.gridCols,
          gridRows: mapData.gridRows,
          tileSize: mapData.tileSize,
          tilesets: mapData.tilesets.map(id => ({ id, src: '' })),
          layers,
          activeLayerId: layers[0]?.id ?? '',
          activeTool: 'pencil' as const,
          selectedTile: null,
          selectedBrush: null,
          selection: null,
          clipboard: null,
          showGrid: true,
          zoom: 1, panX: 0, panY: 0,
          undoStack: [], redoStack: [],
          editorMode: 'tile' as const,
          resizeMode: false,
          entityLayers: mapData.entityLayers ?? [{ id: 'default', name: 'Entities', visible: true, locked: false, entities: (mapData.entities ?? []) as import('../types/entity').Entity[] }],
          activeEntityLayerId: mapData.entityLayers?.[0]?.id ?? 'default',
          selectedEntityDefId: null,
          selectedEntityId: null,
          zoneDefs: mapData.zoneDefs ?? [],
          zones: mapData.zones ?? [],
          selectedZoneDefType: null,
          selectedZoneId: null,
          selectedEntityDefForCollision: null,
          exportDialogOpen: false,
          importDialogOpen: false,
        }
      }
      const zip = await exportGameZip(currentProject.id, currentProject, editorState)
      downloadZip(zip, `${currentProject.name}.gamedata.zip`)
      toast('Game data exported', 'success')
    } catch (e) {
      console.error('Game export failed:', e)
      toast('Game export failed', 'error')
    }
    setGameExporting(false)
  }, [currentProject, gameExporting, toast])

  if (!currentProject) return null

  return (
    <nav className="flex items-center gap-0 bg-neutral-800 border-b border-neutral-700 h-9 shrink-0 text-xs">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 px-3 h-full hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200"
        title="Back to Projects"
      >
        <ArrowLeft size={14} />
        <FolderOpen size={14} />
      </button>

      <div className="w-px h-5 bg-neutral-700" />

      <span className="px-3 text-neutral-300 font-bold truncate max-w-48">
        {currentProject.name}
      </span>

      <div className="w-px h-5 bg-neutral-700" />

      <NavLink
        to={`/project/${currentProject.id}/assets`}
        className={({ isActive }) =>
          `flex items-center gap-1.5 px-3 h-full hover:bg-neutral-700 ${isActive ? 'text-sky-400 bg-neutral-750' : 'text-neutral-400 hover:text-neutral-200'}`
        }
      >
        <Images size={14} />
        Assets
      </NavLink>

      <NavLink
        to={`/project/${currentProject.id}/entities`}
        className={({ isActive }) =>
          `flex items-center gap-1.5 px-3 h-full hover:bg-neutral-700 ${isActive ? 'text-sky-400 bg-neutral-750' : 'text-neutral-400 hover:text-neutral-200'}`
        }
      >
        <Box size={14} />
        Entities
      </NavLink>

      <NavLink
        to={`/project/${currentProject.id}/editor`}
        className={({ isActive }) =>
          `flex items-center gap-1.5 px-3 h-full hover:bg-neutral-700 ${isActive ? 'text-sky-400 bg-neutral-750' : 'text-neutral-400 hover:text-neutral-200'}`
        }
      >
        <Map size={14} />
        Editor
      </NavLink>

      <NavLink
        to={`/project/${currentProject.id}/settings`}
        className={({ isActive }) =>
          `flex items-center gap-1.5 px-3 h-full hover:bg-neutral-700 ${isActive ? 'text-sky-400 bg-neutral-750' : 'text-neutral-400 hover:text-neutral-200'}`
        }
      >
        <Settings size={14} />
        Settings
      </NavLink>

      <div className="flex-1" />

      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-1.5 px-3 h-full hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 disabled:opacity-50"
        title="Export Project (.gmproj.zip)"
      >
        <Download size={14} />
        {exporting ? '...' : 'Project Export'}
      </button>

      <button
        onClick={handleGameExport}
        disabled={gameExporting}
        className="flex items-center gap-1.5 px-3 h-full hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 disabled:opacity-50"
        title="Game Export (structured data + TypeScript enums)"
      >
        <PackageOpen size={14} />
        {gameExporting ? '...' : 'Game Export'}
      </button>
    </nav>
  )
}

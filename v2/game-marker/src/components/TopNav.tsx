import { useCallback, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useProject } from '../state/ProjectContext'
import { ArrowLeft, FolderOpen, Images, Map, Download } from 'lucide-react'
import { exportProjectZip, downloadZip } from '../storage/db'

export function TopNav() {
  const { currentProject } = useProject()
  const navigate = useNavigate()
  const [exporting, setExporting] = useState(false)

  const handleExport = useCallback(async () => {
    if (!currentProject || exporting) return
    setExporting(true)
    try {
      const zip = await exportProjectZip(currentProject.id)
      downloadZip(zip, `${currentProject.name}.gmproj.zip`)
    } catch (e) {
      console.error('Export failed:', e)
    }
    setExporting(false)
  }, [currentProject, exporting])

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
        to={`/project/${currentProject.id}/editor`}
        className={({ isActive }) =>
          `flex items-center gap-1.5 px-3 h-full hover:bg-neutral-700 ${isActive ? 'text-sky-400 bg-neutral-750' : 'text-neutral-400 hover:text-neutral-200'}`
        }
      >
        <Map size={14} />
        Editor
      </NavLink>

      <div className="flex-1" />

      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-1.5 px-3 h-full hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 disabled:opacity-50"
        title="Export Project"
      >
        <Download size={14} />
        {exporting ? 'Exporting...' : 'Export'}
      </button>
    </nav>
  )
}

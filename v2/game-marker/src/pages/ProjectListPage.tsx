import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../state/ProjectContext'
import { FolderPlus, Trash2, FolderOpen, Upload, Download } from 'lucide-react'
import { exportProjectZip, downloadZip, importProjectZip, readZipFile } from '../storage/db'

export function ProjectListPage() {
  const { projects, loadingProjects, createProject, deleteProject } = useProject()
  const navigate = useNavigate()
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    const p = await createProject(name)
    setNewName('')
    setCreating(false)
    navigate(`/project/${p.id}/assets`)
  }

  const handleImport = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setImporting(true)
    try {
      const zipBytes = await readZipFile(files[0])
      const project = await importProjectZip(zipBytes)
      // Force reload projects list
      navigate(`/project/${project.id}/assets`)
    } catch (e) {
      console.error('Import failed:', e)
      alert('Failed to import project: ' + (e instanceof Error ? e.message : 'Unknown error'))
    }
    setImporting(false)
    if (importInputRef.current) importInputRef.current.value = ''
  }, [navigate])

  const handleExport = useCallback(async (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation()
    try {
      const zip = await exportProjectZip(projectId)
      downloadZip(zip, `${projectName}.gmproj.zip`)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }, [])

  const handleOpen = (id: string) => {
    navigate(`/project/${id}/assets`)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Delete this project and all its assets?')) return
    await deleteProject(id)
  }

  if (loadingProjects) {
    return (
      <div className="flex items-center justify-center h-screen text-neutral-500">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-neutral-900">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-6 text-neutral-100">Game Marker</h1>

        {/* Create new project */}
        <div className="flex gap-2 mb-8">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="New project name..."
            className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 text-neutral-100 text-sm focus:outline-none focus:border-sky-500"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm"
          >
            <FolderPlus size={14} />
            Create
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 text-neutral-200 text-sm border border-neutral-600"
          >
            <Upload size={14} />
            {importing ? 'Importing...' : 'Import'}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".zip,.gmproj.zip"
            className="hidden"
            onChange={e => handleImport(e.target.files)}
          />
        </div>

        {/* Project list */}
        {projects.length === 0 ? (
          <p className="text-neutral-500 text-sm text-center">
            No projects yet. Create one to get started.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => handleOpen(p.id)}
                className="flex items-center gap-3 px-4 py-3 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 hover:border-neutral-600 text-left group"
              >
                <FolderOpen size={18} className="text-neutral-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-neutral-100 truncate">{p.name}</div>
                  <div className="text-xs text-neutral-500">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={e => handleExport(e, p.id, p.name)}
                    className="p-1.5 text-neutral-600 hover:text-sky-400"
                    title="Export project"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={e => handleDelete(e, p.id)}
                    className="p-1.5 text-neutral-600 hover:text-red-400"
                    title="Delete project"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

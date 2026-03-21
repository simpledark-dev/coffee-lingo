import { useState, useEffect } from 'react'
import { useProject } from '../state/ProjectContext'
import { useToast } from '../components/Toast'
import { updateProject, getProject } from '../storage/db'

export function ProjectSettingsPage() {
  const { currentProject, renameProject } = useProject()
  const toast = useToast()

  const [name, setName] = useState(currentProject?.name ?? '')
  const [tileSize, setTileSize] = useState(currentProject?.tileSize ?? 32)

  useEffect(() => {
    if (!currentProject) return
    setName(currentProject.name)
    setTileSize(currentProject.tileSize ?? 32)
  }, [currentProject])

  if (!currentProject) return null

  const handleSave = async () => {
    await renameProject(currentProject.id, name.trim() || currentProject.name)
    const p = await getProject(currentProject.id)
    if (p) {
      await updateProject({ ...p, name: name.trim() || p.name, tileSize: Math.max(8, Math.min(128, tileSize)) })
    }
    toast('Settings saved', 'success')
    // Reload to pick up tileSize changes across contexts
    setTimeout(() => window.location.reload(), 500)
  }

  return (
    <div className="flex items-start justify-center p-8 h-full overflow-auto">
      <div className="w-full max-w-md space-y-6">
        <h2 className="text-lg font-bold text-neutral-100">Project Settings</h2>

        <div>
          <label className="text-xs text-neutral-500 block mb-1">Project Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 text-neutral-100 text-sm focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="text-xs text-neutral-500 block mb-1">Tile Size (px)</label>
          <input
            type="number"
            min={8} max={128} step={8}
            value={tileSize}
            onChange={e => setTileSize(+e.target.value || 32)}
            className="w-24 px-3 py-2 bg-neutral-800 border border-neutral-700 text-neutral-100 text-sm focus:outline-none focus:border-sky-500"
          />
          <p className="text-[10px] text-neutral-500 mt-1">
            Global tile size used across all maps and entities. Changing this affects how tilesets are sliced.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm"
        >
          Save
        </button>
      </div>
    </div>
  )
}

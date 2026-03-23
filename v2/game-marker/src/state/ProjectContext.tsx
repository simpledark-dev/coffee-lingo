import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Project, ProjectAsset } from '../types/project'
import * as db from '../storage/db'
import { revokeAll } from '../storage/blobUrlCache'

interface ProjectContextValue {
  // Projects
  projects: Project[]
  currentProject: Project | null
  loadingProjects: boolean
  createProject: (name: string) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  openProject: (project: Project) => void
  closeProject: () => void
  renameProject: (id: string, name: string) => Promise<void>

  // Assets (for current project)
  assets: ProjectAsset[]
  loadingAssets: boolean
  addAsset: (file: File, name: string, category: string, folder?: string) => Promise<ProjectAsset>
  updateAsset: (asset: ProjectAsset) => Promise<void>
  deleteAsset: (id: string) => Promise<void>
  refreshAssets: () => Promise<void>
}

const ProjectCtx = createContext<ProjectContextValue | null>(null)

export function useProject() {
  const ctx = useContext(ProjectCtx)
  if (!ctx) throw new Error('useProject must be used within ProjectProvider')
  return ctx
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [assets, setAssets] = useState<ProjectAsset[]>([])
  const [loadingAssets, setLoadingAssets] = useState(false)

  // Load projects on mount
  useEffect(() => {
    db.listProjects().then(p => {
      setProjects(p.sort((a, b) => b.updatedAt - a.updatedAt))
      setLoadingProjects(false)
    })
  }, [])

  // Load assets when project changes
  const refreshAssets = useCallback(async () => {
    if (!currentProject) { setAssets([]); return }
    setLoadingAssets(true)
    const list = await db.listAssets(currentProject.id)
    setAssets(list.sort((a, b) => a.name.localeCompare(b.name)))
    setLoadingAssets(false)
  }, [currentProject])

  useEffect(() => { refreshAssets() }, [refreshAssets])

  const createProject = useCallback(async (name: string) => {
    const p = await db.createProject(name)
    setProjects(prev => [p, ...prev])
    return p
  }, [])

  const deleteProjectFn = useCallback(async (id: string) => {
    await db.deleteProject(id)
    setProjects(prev => prev.filter(p => p.id !== id))
    if (currentProject?.id === id) {
      setCurrentProject(null)
      revokeAll()
    }
  }, [currentProject])

  const openProject = useCallback((project: Project) => {
    if (currentProject?.id !== project.id) {
      revokeAll()
    }
    setCurrentProject(project)
  }, [currentProject])

  const closeProject = useCallback(() => {
    revokeAll()
    setCurrentProject(null)
  }, [])

  const renameProject = useCallback(async (id: string, name: string) => {
    const p = await db.getProject(id)
    if (!p) return
    const updated = { ...p, name }
    await db.updateProject(updated)
    setProjects(prev => prev.map(x => x.id === id ? updated : x))
    if (currentProject?.id === id) setCurrentProject(updated)
  }, [currentProject])

  const addAsset = useCallback(async (file: File, name: string, category: string, folder = '') => {
    if (!currentProject) throw new Error('No project open')
    const asset = await db.addAsset(currentProject.id, file, name, category, folder)
    setAssets(prev => [...prev, asset].sort((a, b) => a.name.localeCompare(b.name)))
    return asset
  }, [currentProject])

  const updateAssetFn = useCallback(async (asset: ProjectAsset) => {
    await db.updateAsset(asset)
    setAssets(prev => prev.map(a => a.id === asset.id ? asset : a))
  }, [])

  const deleteAssetFn = useCallback(async (id: string) => {
    await db.deleteAsset(id)
    setAssets(prev => prev.filter(a => a.id !== id))
  }, [])

  return (
    <ProjectCtx.Provider value={{
      projects,
      currentProject,
      loadingProjects,
      createProject,
      deleteProject: deleteProjectFn,
      openProject,
      closeProject,
      renameProject,
      assets,
      loadingAssets,
      addAsset,
      updateAsset: updateAssetFn,
      deleteAsset: deleteAssetFn,
      refreshAssets,
    }}>
      {children}
    </ProjectCtx.Provider>
  )
}

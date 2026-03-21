import { useEffect } from 'react'
import { Outlet, useParams, useNavigate } from 'react-router-dom'
import { useProject } from '../state/ProjectContext'
import { TopNav } from '../components/TopNav'

/**
 * Layout wrapper for /project/:id/* routes.
 * Loads the project into context and renders TopNav + child route.
 */
export function ProjectShell() {
  const { id } = useParams<{ id: string }>()
  const { projects, currentProject, openProject, loadingProjects } = useProject()
  const navigate = useNavigate()

  useEffect(() => {
    if (loadingProjects) return
    const project = projects.find(p => p.id === id)
    if (!project) {
      navigate('/', { replace: true })
      return
    }
    if (currentProject?.id !== id) {
      openProject(project)
    }
  }, [id, projects, currentProject, openProject, loadingProjects, navigate])

  if (loadingProjects || !currentProject || currentProject.id !== id) {
    return (
      <div className="flex items-center justify-center h-screen text-neutral-500">
        Loading project...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-neutral-100">
      <TopNav />
      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
    </div>
  )
}

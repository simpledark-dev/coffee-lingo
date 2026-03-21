import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { EntityDef } from '../types/entity'
import type { StoredEntityDef } from '../storage/db'
import { useProject } from './ProjectContext'
import * as db from '../storage/db'

interface EntityContextValue {
  entityDefs: EntityDef[]
  loading: boolean
  addEntityDef: (def: Omit<EntityDef, 'id'>) => Promise<EntityDef>
  updateEntityDef: (def: EntityDef) => Promise<void>
  deleteEntityDef: (id: string) => Promise<void>
  refreshEntityDefs: () => Promise<void>
  getDefById: (id: string) => EntityDef | undefined
}

const EntityCtx = createContext<EntityContextValue | null>(null)

export function useEntityContext() {
  const ctx = useContext(EntityCtx)
  if (!ctx) throw new Error('useEntityContext must be used within EntityProvider')
  return ctx
}

export function useEntityDefs(): EntityDef[] {
  return useEntityContext().entityDefs
}

export function EntityProvider({ children }: { children: ReactNode }) {
  const { currentProject } = useProject()
  const [defs, setDefs] = useState<EntityDef[]>([])
  const [loading, setLoading] = useState(true)

  const refreshEntityDefs = useCallback(async () => {
    if (!currentProject) { setDefs([]); setLoading(false); return }
    setLoading(true)
    const stored = await db.listEntityDefs(currentProject.id)
    setDefs(stored.map(stripProjectId))
    setLoading(false)
  }, [currentProject])

  useEffect(() => { refreshEntityDefs() }, [refreshEntityDefs])

  const addEntityDef = useCallback(async (def: Omit<EntityDef, 'id'>) => {
    if (!currentProject) throw new Error('No project open')
    const full: EntityDef = { ...def, id: crypto.randomUUID() }
    await db.saveEntityDef(currentProject.id, full)
    setDefs(prev => [...prev, full])
    return full
  }, [currentProject])

  const updateEntityDefFn = useCallback(async (def: EntityDef) => {
    if (!currentProject) return
    const stored: StoredEntityDef = { ...def, projectId: currentProject.id }
    await db.updateEntityDef(stored)
    setDefs(prev => prev.map(d => d.id === def.id ? def : d))
  }, [currentProject])

  const deleteEntityDefFn = useCallback(async (id: string) => {
    await db.deleteEntityDef(id)
    setDefs(prev => prev.filter(d => d.id !== id))
  }, [])

  const getDefById = useCallback((id: string) => {
    return defs.find(d => d.id === id)
  }, [defs])

  return (
    <EntityCtx.Provider value={{
      entityDefs: defs,
      loading,
      addEntityDef,
      updateEntityDef: updateEntityDefFn,
      deleteEntityDef: deleteEntityDefFn,
      refreshEntityDefs,
      getDefById,
    }}>
      {children}
    </EntityCtx.Provider>
  )
}

function stripProjectId({ projectId: _, ...def }: StoredEntityDef): EntityDef {
  return def
}

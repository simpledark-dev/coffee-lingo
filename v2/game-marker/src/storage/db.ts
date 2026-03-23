import type { Project, ProjectAsset, ProjectAssetBlob, ProjectMap } from '../types/project'
import type { TilemapJSON } from '../types/editor'
import type { EntityDef } from '../types/entity'

export type StoredEntityDef = EntityDef & { projectId: string }


const DB_NAME = 'game-marker'
const DB_VERSION = 2

let dbInstance: IDBDatabase | null = null

export function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    // Verify the cached instance has all required stores
    if (dbInstance.objectStoreNames.contains('entityDefs')) {
      return Promise.resolve(dbInstance)
    }
    // DB is outdated — close and reopen to trigger upgrade
    dbInstance.close()
    dbInstance = null
  }

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('assets')) {
        const store = db.createObjectStore('assets', { keyPath: 'id' })
        store.createIndex('projectId', 'projectId', { unique: false })
        store.createIndex('projectId_category', ['projectId', 'category'], { unique: false })
      }
      if (!db.objectStoreNames.contains('assetBlobs')) {
        db.createObjectStore('assetBlobs', { keyPath: 'assetId' })
      }
      if (!db.objectStoreNames.contains('maps')) {
        const store = db.createObjectStore('maps', { keyPath: 'id' })
        store.createIndex('projectId', 'projectId', { unique: false })
      }
      if (!db.objectStoreNames.contains('entityDefs')) {
        const store = db.createObjectStore('entityDefs', { keyPath: 'id' })
        store.createIndex('projectId', 'projectId', { unique: false })
      }
    }

    req.onblocked = () => {
      console.warn('IndexedDB upgrade blocked — close other tabs using this app')
    }

    req.onsuccess = () => {
      dbInstance = req.result
      // If another tab upgrades the DB, close our connection so it can proceed
      dbInstance.onversionchange = () => {
        dbInstance?.close()
        dbInstance = null
      }
      resolve(dbInstance)
    }
    req.onerror = () => reject(req.error)
  })
}

// ── helpers ──────────────────────────────────────────────

function tx(store: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDB().then(db => db.transaction(store, mode).objectStore(store))
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

// ── Projects ─────────────────────────────────────────────

export async function createProject(name: string, tileSize = 32): Promise<Project> {
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    tileSize,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  const store = await tx('projects', 'readwrite')
  await req(store.put(project))
  return project
}

export async function listProjects(): Promise<Project[]> {
  const store = await tx('projects', 'readonly')
  return req(store.getAll())
}

export async function getProject(id: string): Promise<Project | undefined> {
  const store = await tx('projects', 'readonly')
  return req(store.get(id))
}

export async function updateProject(project: Project): Promise<void> {
  const store = await tx('projects', 'readwrite')
  await req(store.put({ ...project, updatedAt: Date.now() }))
}

export async function deleteProject(id: string): Promise<void> {
  // delete project + all its assets + blobs + maps + entityDefs
  const assets = await listAssets(id)
  for (const a of assets) {
    await deleteAsset(a.id)
  }
  const maps = await listMaps(id)
  for (const m of maps) {
    const mapStore = await tx('maps', 'readwrite')
    await req(mapStore.delete(m.id))
  }
  const eDefs = await listEntityDefs(id)
  for (const d of eDefs) {
    const eStore = await tx('entityDefs', 'readwrite')
    await req(eStore.delete(d.id))
  }
  const store = await tx('projects', 'readwrite')
  await req(store.delete(id))
}

// ── Assets ───────────────────────────────────────────────

export async function addAsset(
  projectId: string,
  file: File,
  name: string,
  category: string,
  folder = '',
): Promise<ProjectAsset> {
  const buffer = await file.arrayBuffer()

  // read image dimensions
  const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to read image dimensions'))
    }
    img.src = url
  })

  const asset: ProjectAsset = {
    id: crypto.randomUUID(),
    projectId,
    name,
    category,
    folder,
    filename: file.name,
    mimeType: file.type,
    width,
    height,
    createdAt: Date.now(),
  }

  const blob: ProjectAssetBlob = { assetId: asset.id, data: buffer }

  const assetStore = await tx('assets', 'readwrite')
  await req(assetStore.put(asset))

  const blobStore = await tx('assetBlobs', 'readwrite')
  await req(blobStore.put(blob))

  return asset
}

export async function listAssets(projectId: string): Promise<ProjectAsset[]> {
  const store = await tx('assets', 'readonly')
  const index = store.index('projectId')
  return req(index.getAll(projectId))
}

export async function listAssetsByCategory(projectId: string, category: string): Promise<ProjectAsset[]> {
  const store = await tx('assets', 'readonly')
  const index = store.index('projectId_category')
  return req(index.getAll([projectId, category]))
}

export async function getAsset(id: string): Promise<ProjectAsset | undefined> {
  const store = await tx('assets', 'readonly')
  return req(store.get(id))
}

export async function updateAsset(asset: ProjectAsset): Promise<void> {
  const store = await tx('assets', 'readwrite')
  await req(store.put(asset))
}

export async function deleteAsset(id: string): Promise<void> {
  const assetStore = await tx('assets', 'readwrite')
  await req(assetStore.delete(id))
  const blobStore = await tx('assetBlobs', 'readwrite')
  await req(blobStore.delete(id))
}

export async function getAssetBlob(assetId: string): Promise<ArrayBuffer | undefined> {
  const store = await tx('assetBlobs', 'readonly')
  const result: ProjectAssetBlob | undefined = await req(store.get(assetId))
  return result?.data
}

// ── Maps ─────────────────────────────────────────────────

export async function saveMap(projectId: string, name: string, data: TilemapJSON, mapId?: string): Promise<ProjectMap> {
  const map: ProjectMap = {
    id: mapId ?? crypto.randomUUID(),
    projectId,
    name,
    data,
    updatedAt: Date.now(),
  }
  const store = await tx('maps', 'readwrite')
  await req(store.put(map))
  return map
}

export async function listMaps(projectId: string): Promise<ProjectMap[]> {
  const store = await tx('maps', 'readonly')
  const index = store.index('projectId')
  return req(index.getAll(projectId))
}

export async function getMap(id: string): Promise<ProjectMap | undefined> {
  const store = await tx('maps', 'readonly')
  return req(store.get(id))
}

export async function deleteMap(id: string): Promise<void> {
  const store = await tx('maps', 'readwrite')
  await req(store.delete(id))
}

// ── Entity Defs ──────────────────────────────────────────

export async function saveEntityDef(projectId: string, def: EntityDef): Promise<StoredEntityDef> {
  const stored: StoredEntityDef = { ...def, id: def.id || crypto.randomUUID(), projectId }
  const store = await tx('entityDefs', 'readwrite')
  await req(store.put(stored))
  return stored
}

export async function listEntityDefs(projectId: string): Promise<StoredEntityDef[]> {
  const store = await tx('entityDefs', 'readonly')
  const index = store.index('projectId')
  return req(index.getAll(projectId))
}

export async function getEntityDef(id: string): Promise<StoredEntityDef | undefined> {
  const store = await tx('entityDefs', 'readonly')
  return req(store.get(id))
}

export async function updateEntityDef(def: StoredEntityDef): Promise<void> {
  const store = await tx('entityDefs', 'readwrite')
  await req(store.put(def))
}

export async function deleteEntityDef(id: string): Promise<void> {
  const store = await tx('entityDefs', 'readwrite')
  await req(store.delete(id))
}

// ── Export / Import Project (zip) ─────────────────────────

import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate'

/**
 * Zip structure:
 *   project.json          — manifest with project meta, asset metadata list, maps
 *   assets/<index>.<ext>  — raw binary for each asset (0.png, 1.png, ...)
 */

interface ProjectManifest {
  format: 'game-marker-project'
  version: 2 | 3
  project: Omit<Project, 'id'>
  assets: {
    file: string  // path inside zip, e.g. "assets/0.png"
    name: string
    category: string
    filename: string
    mimeType: string
    width: number
    height: number
    createdAt: number
  }[]
  maps: {
    name: string
    data: TilemapJSON
    updatedAt: number
  }[]
  entityDefs?: EntityDef[]   // v3+
}

export async function exportProjectZip(projectId: string): Promise<Uint8Array> {
  const project = await getProject(projectId)
  if (!project) throw new Error('Project not found')

  const assets = await listAssets(projectId)
  const maps = await listMaps(projectId)

  const zipData: Record<string, Uint8Array> = {}
  const manifestAssets: ProjectManifest['assets'] = []

  for (let i = 0; i < assets.length; i++) {
    const a = assets[i]
    const ext = a.filename.split('.').pop() || 'bin'
    const zipPath = `assets/${i}.${ext}`

    const blob = await getAssetBlob(a.id)
    if (blob) {
      zipData[zipPath] = new Uint8Array(blob)
    }

    manifestAssets.push({
      file: zipPath,
      name: a.name,
      category: a.category,
      filename: a.filename,
      mimeType: a.mimeType,
      width: a.width,
      height: a.height,
      createdAt: a.createdAt,
    })
  }

  // Entity defs
  const storedEntityDefs = await listEntityDefs(projectId)
  const entityDefsClean: EntityDef[] = storedEntityDefs.map(({ projectId: _pid, ...def }) => def)

  const manifest: ProjectManifest = {
    format: 'game-marker-project',
    version: 3,
    project: { name: project.name, tileSize: project.tileSize, createdAt: project.createdAt, updatedAt: project.updatedAt },
    assets: manifestAssets,
    maps: maps.map(m => ({ name: m.name, data: m.data, updatedAt: m.updatedAt })),
    entityDefs: entityDefsClean.length > 0 ? entityDefsClean : undefined,
  }

  zipData['project.json'] = strToU8(JSON.stringify(manifest, null, 2))

  return zipSync(zipData, { level: 6 })
}

export async function importProjectZip(zipBytes: Uint8Array): Promise<Project> {
  const files = unzipSync(zipBytes)

  const manifestBytes = files['project.json']
  if (!manifestBytes) throw new Error('Invalid project file: missing project.json')

  const manifest: ProjectManifest = JSON.parse(strFromU8(manifestBytes))
  if (manifest.format !== 'game-marker-project') throw new Error('Invalid project file format')

  // Create project
  const project: Project = {
    id: crypto.randomUUID(),
    name: manifest.project.name,
    tileSize: (manifest.project as Record<string, unknown>).tileSize as number || 32,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  const projStore = await tx('projects', 'readwrite')
  await req(projStore.put(project))

  // Import assets
  for (const a of manifest.assets) {
    const assetId = crypto.randomUUID()
    const asset: ProjectAsset = {
      id: assetId,
      projectId: project.id,
      name: a.name,
      category: a.category,
      folder: (a as Record<string, unknown>).folder as string ?? '',
      filename: a.filename,
      mimeType: a.mimeType,
      width: a.width,
      height: a.height,
      createdAt: a.createdAt,
    }
    const assetStore = await tx('assets', 'readwrite')
    await req(assetStore.put(asset))

    const fileData = files[a.file]
    if (fileData) {
      const blobData: ProjectAssetBlob = { assetId, data: fileData.buffer as ArrayBuffer }
      const blobStore = await tx('assetBlobs', 'readwrite')
      await req(blobStore.put(blobData))
    }
  }

  // Import maps
  for (const m of manifest.maps) {
    const map: ProjectMap = {
      id: crypto.randomUUID(),
      projectId: project.id,
      name: m.name,
      data: m.data,
      updatedAt: m.updatedAt,
    }
    const mapStore = await tx('maps', 'readwrite')
    await req(mapStore.put(map))
  }

  // Import entity defs (v3+)
  if (manifest.entityDefs) {
    for (const def of manifest.entityDefs) {
      const stored: StoredEntityDef = { ...def, id: crypto.randomUUID(), projectId: project.id }
      const eStore = await tx('entityDefs', 'readwrite')
      await req(eStore.put(stored))
    }
  }

  return project
}

export function downloadZip(data: Uint8Array, filename: string): void {
  const blob = new Blob([data as unknown as BlobPart], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function readZipFile(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer()
  return new Uint8Array(buffer)
}

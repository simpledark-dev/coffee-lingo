import type { TilemapJSON } from './editor'

export interface Project {
  id: string
  name: string
  tileSize: number        // global tile size in px (default 32)
  createdAt: number
  updatedAt: number
}

export interface ProjectAsset {
  id: string
  projectId: string
  name: string
  category: string        // e.g. "tileset", "sprite", "background"
  filename: string        // original upload filename
  mimeType: string
  width: number           // image natural width
  height: number          // image natural height
  createdAt: number
}

export interface ProjectAssetBlob {
  assetId: string
  data: ArrayBuffer
}

export interface ProjectMap {
  id: string
  projectId: string
  name: string
  data: TilemapJSON
  updatedAt: number
}

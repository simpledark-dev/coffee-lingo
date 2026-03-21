import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useProject } from './ProjectContext'
import { getAssetBlobUrl } from '../storage/blobUrlCache'
import { loadAllTilesets } from '../utils/tilesetLoader'
import type { TilesetConfig } from '../types/editor'

interface TilesetContextValue {
  tilesetConfigs: TilesetConfig[]
  tilesetImages: Map<string, HTMLImageElement>
  /** Maps tileset id (asset id) → human-readable name */
  tilesetNames: Map<string, string>
  loading: boolean
}

const TilesetCtx = createContext<TilesetContextValue>({
  tilesetConfigs: [],
  tilesetImages: new Map(),
  tilesetNames: new Map(),
  loading: true,
})

export function useTilesetConfigs(): TilesetConfig[] {
  return useContext(TilesetCtx).tilesetConfigs
}

export function useTilesetImages(): Map<string, HTMLImageElement> {
  return useContext(TilesetCtx).tilesetImages
}

export function useTilesetNames(): Map<string, string> {
  return useContext(TilesetCtx).tilesetNames
}

export function useTilesetLoading(): boolean {
  return useContext(TilesetCtx).loading
}

export function TilesetProvider({ children }: { children: ReactNode }) {
  const { assets, currentProject } = useProject()
  const [configs, setConfigs] = useState<TilesetConfig[]>([])
  const [images, setImages] = useState<Map<string, HTMLImageElement>>(new Map())
  const [names, setNames] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)

  // Build tileset configs from project assets with category "tileset"
  useEffect(() => {
    if (!currentProject) {
      setConfigs([])
      setImages(new Map())
      setNames(new Map())
      setLoading(false)
      return
    }

    let cancelled = false
    const tilesetAssets = assets.filter(a => a.category === 'tileset')

    async function load() {
      setLoading(true)
      // Build TilesetConfig[] from assets (id → blob URL)
      const cfgs: TilesetConfig[] = []
      for (const asset of tilesetAssets) {
        try {
          const url = await getAssetBlobUrl(asset.id, asset.mimeType)
          cfgs.push({ id: asset.id, src: url })
        } catch (e) {
          console.warn('Failed to load asset blob URL:', asset.name, e)
        }
      }

      if (cancelled) return
      setConfigs(cfgs)

      // Build name map
      const nameMap = new Map<string, string>()
      for (const asset of tilesetAssets) {
        nameMap.set(asset.id, asset.name)
      }
      setNames(nameMap)

      // Load images
      const imgMap = await loadAllTilesets(cfgs)
      if (cancelled) return
      setImages(imgMap)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [assets, currentProject])

  return (
    <TilesetCtx.Provider value={{ tilesetConfigs: configs, tilesetImages: images, tilesetNames: names, loading }}>
      {children}
    </TilesetCtx.Provider>
  )
}

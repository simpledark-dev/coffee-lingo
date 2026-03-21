import { useState, useEffect } from 'react'
import { useTilesetImages } from './TilesetContext'
import { useEntityDefs } from './EntityContext'
import { useProject } from './ProjectContext'
import { getAssetBlobUrl } from '../storage/blobUrlCache'

/**
 * Returns a Map of assetId → HTMLImageElement for all assets used by entity defs.
 * Includes tileset images from TilesetContext + loads sprite-sheet images on demand.
 */
export function useEntityImages(): Map<string, HTMLImageElement> {
  const tilesetImages = useTilesetImages()
  const entityDefs = useEntityDefs()
  const { assets } = useProject()
  const [extraImages, setExtraImages] = useState<Map<string, HTMLImageElement>>(new Map())

  // Find asset IDs used by entities that are NOT in tilesetImages
  useEffect(() => {
    const missing = new Set<string>()
    for (const def of entityDefs) {
      if (def.visual.assetId && !tilesetImages.has(def.visual.assetId)) {
        missing.add(def.visual.assetId)
      }
    }
    if (missing.size === 0) { setExtraImages(new Map()); return }

    let cancelled = false
    async function loadMissing() {
      const loaded = new Map<string, HTMLImageElement>()
      for (const assetId of missing) {
        try {
          const url = await getAssetBlobUrl(assetId)
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image()
            i.onload = () => resolve(i)
            i.onerror = reject
            i.src = url
          })
          if (cancelled) return
          loaded.set(assetId, img)
        } catch { /* skip */ }
      }
      if (!cancelled) setExtraImages(loaded)
    }
    loadMissing()
    return () => { cancelled = true }
  }, [entityDefs, tilesetImages, assets])

  // Merge tileset images + extra loaded images
  if (extraImages.size === 0) return tilesetImages

  const merged = new Map(tilesetImages)
  for (const [k, v] of extraImages) merged.set(k, v)
  return merged
}

import { getAssetBlob } from './db'

const cache = new Map<string, string>()

export async function getAssetBlobUrl(assetId: string, mimeType = 'image/png'): Promise<string> {
  const cached = cache.get(assetId)
  if (cached) return cached

  const buffer = await getAssetBlob(assetId)
  if (!buffer) throw new Error(`Asset blob not found: ${assetId}`)

  const blob = new Blob([buffer], { type: mimeType })
  const url = URL.createObjectURL(blob)
  cache.set(assetId, url)
  return url
}

export function getCachedBlobUrl(assetId: string): string | undefined {
  return cache.get(assetId)
}

export function revokeAll(): void {
  for (const url of cache.values()) {
    URL.revokeObjectURL(url)
  }
  cache.clear()
}

export function revokeBlobUrl(assetId: string): void {
  const url = cache.get(assetId)
  if (url) {
    URL.revokeObjectURL(url)
    cache.delete(assetId)
  }
}

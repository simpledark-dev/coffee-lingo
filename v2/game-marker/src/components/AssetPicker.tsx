import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight, FolderOpen } from 'lucide-react'
import { useProject } from '../state/ProjectContext'

/**
 * Asset picker dropdown that groups assets by folder with collapse/expand.
 * Filters by category (e.g. 'tileset', 'sprite-sheet', or undefined for all).
 */
export function AssetPicker({ value, onChange, categories, placeholder = '-- Select Asset --' }: {
  value: string
  onChange: (assetId: string) => void
  /** Filter by these categories. If empty/undefined, show all. */
  categories?: string[]
  placeholder?: string
}) {
  const { assets } = useProject()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)

  // Filter assets by category
  const filtered = categories && categories.length > 0
    ? assets.filter(a => categories.includes(a.category))
    : assets

  // Group by folder
  const folders = new Map<string, typeof filtered>()
  for (const a of filtered) {
    const f = a.folder ?? ''
    if (!folders.has(f)) folders.set(f, [])
    folders.get(f)!.push(a)
  }

  // Sort folder keys: '' (default) first, then alphabetical
  const sortedFolders = [...folders.keys()].sort((a, b) => {
    if (a === '') return -1
    if (b === '') return 1
    return a.localeCompare(b)
  })

  const selectedAsset = assets.find(a => a.id === value)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggleFolder = (f: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(f) ? next.delete(f) : next.add(f)
      return next
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 bg-neutral-900 border border-neutral-700 text-xs text-neutral-200 hover:bg-neutral-800 min-w-40 text-left"
      >
        <span className="flex-1 truncate">{selectedAsset ? selectedAsset.name : placeholder}</span>
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 max-h-72 overflow-y-auto bg-neutral-800 border border-neutral-600 z-50 shadow-lg">
          {/* Clear selection */}
          <button
            onClick={() => { onChange(''); setOpen(false) }}
            className="w-full text-left px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-700"
          >
            {placeholder}
          </button>

          {sortedFolders.map(folder => {
            const folderAssets = folders.get(folder)!
            const isCollapsed = collapsed.has(folder)
            const folderName = folder || 'Default'

            return (
              <div key={folder}>
                {/* Folder header — only show if more than 1 folder */}
                {sortedFolders.length > 1 && (
                  <div
                    onClick={() => toggleFolder(folder)}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-neutral-500 hover:bg-neutral-750 cursor-pointer bg-neutral-850 border-t border-neutral-700/50"
                  >
                    {isCollapsed ? <ChevronRight size={8} /> : <ChevronDown size={8} />}
                    <FolderOpen size={9} />
                    <span>{folderName}</span>
                    <span className="ml-auto">{folderAssets.length}</span>
                  </div>
                )}

                {/* Assets in folder */}
                {!isCollapsed && folderAssets.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { onChange(a.id); setOpen(false) }}
                    className={`w-full text-left px-3 py-1 text-xs hover:bg-neutral-700 ${
                      value === a.id ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-300'
                    }`}
                  >
                    {a.name}
                    <span className="text-[10px] text-neutral-500 ml-1">{a.category}</span>
                  </button>
                ))}
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-neutral-500">No assets found</div>
          )}
        </div>
      )}
    </div>
  )
}

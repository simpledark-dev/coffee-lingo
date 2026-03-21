import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useProject } from '../state/ProjectContext'
import { getAssetBlobUrl } from '../storage/blobUrlCache'
import type { ProjectAsset } from '../types/project'
import { Upload, Trash2, Pencil, Check, X, Search, Plus } from 'lucide-react'

/** "tileset" is always present as a built-in category (used by the editor). */
const BUILTIN_CATEGORIES = ['tileset']

export function AssetManagerPage() {
  const { assets, loadingAssets, addAsset, updateAsset, deleteAsset } = useProject()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Derive categories from existing assets + built-ins
  const categories = useMemo(() => {
    const set = new Set<string>(BUILTIN_CATEGORIES)
    for (const a of assets) if (a.category) set.add(a.category)
    return [...set].sort()
  }, [assets])

  // Upload state
  const [uploadCategory, setUploadCategory] = useState<string>('tileset')
  const [customCategory, setCustomCategory] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)

  const selected = assets.find(a => a.id === selectedId) ?? null

  // Load preview for selected asset
  useEffect(() => {
    if (!selected) { setPreviewUrl(null); return }
    let cancelled = false
    getAssetBlobUrl(selected.id, selected.mimeType).then(url => {
      if (!cancelled) setPreviewUrl(url)
    })
    return () => { cancelled = true }
  }, [selected])

  const filtered = assets.filter(a => {
    if (filterCategory !== 'all' && a.category !== filterCategory) return false
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files) return
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ')
      const asset = await addAsset(file, name, uploadCategory)
      setSelectedId(asset.id)
    }
  }, [addAsset, uploadCategory])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this asset?')) return
    await deleteAsset(id)
    if (selectedId === id) setSelectedId(null)
  }, [deleteAsset, selectedId])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel: asset list */}
      <div className="w-80 shrink-0 flex flex-col border-r border-neutral-700 bg-neutral-850">
        {/* Upload bar */}
        <div className="p-3 border-b border-neutral-700 flex flex-col gap-2">
          <div className="flex gap-2">
            {showNewCategory ? (
              <div className="flex-1 flex gap-1">
                <input
                  type="text"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customCategory.trim()) {
                      setUploadCategory(customCategory.trim().toLowerCase())
                      setShowNewCategory(false)
                      setCustomCategory('')
                    }
                    if (e.key === 'Escape') { setShowNewCategory(false); setCustomCategory('') }
                  }}
                  placeholder="New category..."
                  className="flex-1 px-2 py-1.5 bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs focus:outline-none focus:border-sky-500"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (customCategory.trim()) {
                      setUploadCategory(customCategory.trim().toLowerCase())
                      setShowNewCategory(false)
                      setCustomCategory('')
                    }
                  }}
                  className="px-2 py-1.5 text-green-400 hover:text-green-300 bg-neutral-800 border border-neutral-700 text-xs"
                ><Check size={12} /></button>
                <button
                  onClick={() => { setShowNewCategory(false); setCustomCategory('') }}
                  className="px-2 py-1.5 text-neutral-400 hover:text-neutral-200 bg-neutral-800 border border-neutral-700 text-xs"
                ><X size={12} /></button>
              </div>
            ) : (
              <>
                <select
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value)}
                  className="flex-1 px-2 py-1.5 bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  {uploadCategory && !categories.includes(uploadCategory) && (
                    <option value={uploadCategory}>{uploadCategory}</option>
                  )}
                </select>
                <button
                  onClick={() => setShowNewCategory(true)}
                  className="px-2 py-1.5 text-neutral-400 hover:text-neutral-200 bg-neutral-800 border border-neutral-700 text-xs"
                  title="New category"
                >
                  <Plus size={12} />
                </button>
              </>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs"
            >
              <Upload size={12} />
              Upload
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleUpload(e.target.files)}
          />
        </div>

        {/* Filter bar */}
        <div className="p-2 border-b border-neutral-700 flex gap-2">
          <div className="flex-1 flex items-center gap-1 px-2 bg-neutral-800 border border-neutral-700">
            <Search size={12} className="text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 py-1 bg-transparent text-xs text-neutral-200 focus:outline-none"
            />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-2 py-1 bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs"
          >
            <option value="all">All</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
            {filterCategory !== 'all' && !categories.includes(filterCategory) && (
              <option value={filterCategory}>{filterCategory}</option>
            )}
          </select>
        </div>

        {/* Asset list */}
        <div className="flex-1 overflow-y-auto">
          {loadingAssets ? (
            <div className="p-4 text-neutral-500 text-xs text-center">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-neutral-500 text-xs text-center">
              {assets.length === 0 ? 'No assets yet. Upload some images.' : 'No matches.'}
            </div>
          ) : (
            filtered.map(a => (
              <AssetRow
                key={a.id}
                asset={a}
                isSelected={a.id === selectedId}
                onSelect={() => setSelectedId(a.id)}
                onDelete={() => handleDelete(a.id)}
                onUpdate={updateAsset}
                categories={categories}
              />
            ))
          )}
        </div>

        <div className="px-3 py-2 border-t border-neutral-700 text-xs text-neutral-500">
          {assets.length} asset{assets.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Right panel: preview */}
      <div className="flex-1 flex flex-col bg-neutral-900 overflow-hidden">
        {selected && previewUrl ? (
          <>
            <AssetPreview src={previewUrl} name={selected.name} key={selected.id} />
            <div className="shrink-0 px-4 py-2 border-t border-neutral-700 text-center">
              <div className="text-sm text-neutral-200 font-bold">{selected.name}</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                {selected.width} x {selected.height} &middot; {selected.category} &middot; {selected.filename}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-600 text-sm">Select an asset to preview</div>
        )}
      </div>
    </div>
  )
}

// ── Asset Row ────────────────────────────────────────────

function AssetRow({
  asset,
  isSelected,
  onSelect,
  onDelete,
  onUpdate,
  categories,
}: {
  asset: ProjectAsset
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onUpdate: (a: ProjectAsset) => Promise<void>
  categories: string[]
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(asset.name)
  const [editCategory, setEditCategory] = useState(asset.category)
  const [editingNewCat, setEditingNewCat] = useState(false)
  const [newCatInput, setNewCatInput] = useState('')
  const [thumb, setThumb] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getAssetBlobUrl(asset.id, asset.mimeType).then(url => {
      if (!cancelled) setThumb(url)
    })
    return () => { cancelled = true }
  }, [asset.id, asset.mimeType])

  const handleSave = async () => {
    await onUpdate({ ...asset, name: editName.trim() || asset.name, category: editCategory })
    setEditing(false)
  }

  const handleCancel = () => {
    setEditName(asset.name)
    setEditCategory(asset.category)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="px-3 py-2 border-b border-neutral-800 bg-neutral-750 flex flex-col gap-1.5">
        <input
          type="text"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
          className="px-2 py-1 bg-neutral-800 border border-neutral-600 text-xs text-neutral-200 focus:outline-none focus:border-sky-500"
          autoFocus
        />
        <div className="flex gap-1.5 items-center">
          {editingNewCat ? (
            <input
              type="text"
              value={newCatInput}
              onChange={e => setNewCatInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newCatInput.trim()) {
                  setEditCategory(newCatInput.trim().toLowerCase())
                  setEditingNewCat(false)
                  setNewCatInput('')
                }
                if (e.key === 'Escape') { setEditingNewCat(false); setNewCatInput('') }
              }}
              placeholder="New category..."
              className="flex-1 px-2 py-1 bg-neutral-800 border border-neutral-600 text-xs text-neutral-200 focus:outline-none focus:border-sky-500"
              autoFocus
            />
          ) : (
            <div className="flex-1 flex gap-1">
              <select
                value={editCategory}
                onChange={e => setEditCategory(e.target.value)}
                className="flex-1 px-2 py-1 bg-neutral-800 border border-neutral-600 text-xs text-neutral-200"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                {/* Show current category if not in list */}
                {!categories.includes(editCategory) && (
                  <option value={editCategory}>{editCategory}</option>
                )}
              </select>
              <button
                onClick={() => setEditingNewCat(true)}
                className="px-1 text-neutral-500 hover:text-neutral-300"
                title="New category"
              ><Plus size={10} /></button>
            </div>
          )}
          <button onClick={handleSave} className="p-1 text-green-400 hover:text-green-300"><Check size={12} /></button>
          <button onClick={handleCancel} className="p-1 text-neutral-400 hover:text-neutral-200"><X size={12} /></button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2 border-b border-neutral-800 flex items-center gap-2.5 group hover:bg-neutral-800 ${isSelected ? 'bg-neutral-800 border-l-2 border-l-sky-500' : ''}`}
    >
      {thumb ? (
        <img src={thumb} className="w-8 h-8 object-cover bg-neutral-700 shrink-0" style={{ imageRendering: 'pixelated' }} />
      ) : (
        <div className="w-8 h-8 bg-neutral-700 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-neutral-200 truncate">{asset.name}</div>
        <div className="text-[10px] text-neutral-500">{asset.category} &middot; {asset.width}x{asset.height}</div>
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
        <button
          onClick={e => { e.stopPropagation(); setEditing(true) }}
          className="p-1 text-neutral-500 hover:text-sky-400"
          title="Edit"
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-1 text-neutral-500 hover:text-red-400"
          title="Delete"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </button>
  )
}

// ── Asset Preview with pan/zoom ──────────────────────────

function AssetPreview({ src, name }: { src: string; name: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const [fitted, setFitted] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Fit image to container on load
  const handleImageLoad = useCallback(() => {
    const container = containerRef.current
    const img = imgRef.current
    if (!container || !img) return
    const cw = container.clientWidth
    const ch = container.clientHeight
    const iw = img.naturalWidth
    const ih = img.naturalHeight
    if (iw === 0 || ih === 0) return
    const fitZoom = Math.min(cw / iw, ch / ih, 1) * 0.9
    setZoom(fitZoom)
    setPan({ x: (cw - iw * fitZoom) / 2, y: (ch - ih * fitZoom) / 2 })
    setFitted(true)
  }, [])

  // Reset when src changes
  useEffect(() => {
    setFitted(false)
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [src])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const newZoom = Math.max(0.05, Math.min(20, zoom * factor))
    const scale = newZoom / zoom
    setPan({ x: mx - (mx - pan.x) * scale, y: my - (my - pan.y) * scale })
    setZoom(newZoom)
  }, [zoom, pan])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return
    e.preventDefault()
    isPanning.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    setPan(p => ({ x: p.x + dx, y: p.y + dy }))
  }, [])

  const onPointerUp = useCallback(() => {
    isPanning.current = false
  }, [])

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-hidden cursor-grab active:cursor-grabbing relative"
      style={{ background: 'repeating-conic-gradient(#1a1a1a 0% 25%, #222 0% 50%) 50% / 16px 16px' }}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={e => e.preventDefault()}
    >
      <img
        ref={imgRef}
        src={src}
        alt={name}
        onLoad={handleImageLoad}
        className="absolute origin-top-left pointer-events-none"
        style={{
          imageRendering: 'pixelated',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          opacity: fitted ? 1 : 0,
        }}
        draggable={false}
      />
      {/* Zoom indicator */}
      <div className="absolute bottom-2 right-2 text-[10px] text-neutral-500 bg-neutral-900/80 px-1.5 py-0.5">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  )
}

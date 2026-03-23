import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import { useProject } from '../state/ProjectContext'
import { useDialog } from '../components/Dialog'
import { useToast } from '../components/Toast'
import { getAssetBlobUrl, getCachedBlobUrl } from '../storage/blobUrlCache'
import type { ProjectAsset } from '../types/project'
import { Upload, Trash2, Pencil, Check, X, Search, Plus, FolderOpen, FolderPlus } from 'lucide-react'
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent, type DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'

/** "tileset" is always present as a built-in category (used by the editor). */
const BUILTIN_CATEGORIES = ['tileset', 'sprite-sheet']

export function AssetManagerPage() {
  const { assets, loadingAssets, addAsset, updateAsset, deleteAsset } = useProject()
  const { confirm } = useDialog()
  const toast = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [dragActiveId, setDragActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [activeFolder, setActiveFolder] = useState<string | null>(null) // null = all, '' = default/unassigned, 'name' = folder
  const [search, setSearch] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']))

  // Derive categories from existing assets + built-ins
  const categories = useMemo(() => {
    const set = new Set<string>(BUILTIN_CATEGORIES)
    for (const a of assets) if (a.category) set.add(a.category)
    return [...set].sort()
  }, [assets])

  // Manually created folders (persisted in state so empty folders don't disappear)
  const [manualFolders, setManualFolders] = useState<Set<string>>(new Set())

  // Derive flat folder list from assets + manual folders (1 level only)
  const folderTree = useMemo(() => {
    const folders = new Set<string>()
    for (const a of assets) {
      const f = a.folder ?? ''
      if (f) folders.add(f)
    }
    for (const f of manualFolders) folders.add(f)
    return [...folders].sort()
  }, [assets, manualFolders])

  // Upload state
  const [uploadCategory, setUploadCategory] = useState<string>('tileset')
  const [customCategory, setCustomCategory] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [addingFolder, setAddingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

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
    if (activeFolder !== null) {
      const af = a.folder ?? ''
      if (activeFolder === '' ? af !== '' : af !== activeFolder) return false
    }
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files) return
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ')
      const asset = await addAsset(file, name, uploadCategory, activeFolder ?? '')
      setSelectedId(asset.id)
    }
  }, [addAsset, uploadCategory, activeFolder])

  const handleDelete = useCallback(async (id: string) => {
    if (!await confirm('Delete Asset', 'Delete this asset?')) return
    await deleteAsset(id)
    if (selectedId === id) setSelectedId(null)
  }, [deleteAsset, selectedId])

  const handleKeyNav = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    if (filtered.length === 0) return
    const idx = selectedId ? filtered.findIndex(a => a.id === selectedId) : -1
    const next = e.key === 'ArrowDown'
      ? Math.min(idx + 1, filtered.length - 1)
      : Math.max(idx - 1, 0)
    const id = filtered[next].id
    setSelectedId(id)
    setSelectedIds(new Set([id]))
  }, [filtered, selectedId])

  const handleAssetClick = useCallback((id: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Toggle multi-select
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
      })
    } else if (e.shiftKey && selectedId) {
      // Range select
      const ids = filtered.map(a => a.id)
      const from = ids.indexOf(selectedId)
      const to = ids.indexOf(id)
      if (from !== -1 && to !== -1) {
        const range = ids.slice(Math.min(from, to), Math.max(from, to) + 1)
        setSelectedIds(new Set(range))
      }
    } else {
      setSelectedId(id)
      setSelectedIds(new Set([id]))
    }
  }, [selectedId, filtered])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id)
    setDragActiveId(id)
    // If dragged item not in selection, select only it
    if (!selectedIds.has(id)) {
      setSelectedIds(new Set([id]))
      setSelectedId(id)
    }
  }, [selectedIds])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setDragActiveId(null)
    const { over } = event
    if (!over) return
    const targetFolder = String(over.id)
    // Move all selected assets to target folder
    const toMove = assets.filter(a => selectedIds.has(a.id))
    for (const a of toMove) {
      await updateAsset({ ...a, folder: targetFolder === '__root__' ? '' : targetFolder })
    }
    toast(`Moved ${toMove.length} asset${toMove.length > 1 ? 's' : ''}`, 'success')
    setSelectedIds(new Set())
  }, [selectedIds, assets, updateAsset, toast])

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      next.has(folder) ? next.delete(folder) : next.add(folder)
      return next
    })
  }

  const handleAddFolder = () => {
    const name = newFolderName.trim()
    if (!name) return
    setManualFolders(prev => new Set([...prev, name]))
    setActiveFolder(name)
    setAddingFolder(false)
    setNewFolderName('')
  }

  const handleDeleteFolder = useCallback(async (folderPath: string) => {
    if (!await confirm('Delete Folder', `Move all assets in "${folderPath}" to root and delete folder?`)) return
    // Move all assets in this folder (and sub-folders) to root
    for (const a of assets) {
      if ((a.folder ?? '') === folderPath || (a.folder ?? '').startsWith(folderPath + '/')) {
        await updateAsset({ ...a, folder: '' })
      }
    }
    // Remove from manual folders
    setManualFolders(prev => {
      const next = new Set(prev)
      for (const f of next) {
        if (f === folderPath || f.startsWith(folderPath + '/')) next.delete(f)
      }
      return next
    })
    if (activeFolder === folderPath || (activeFolder ?? '').startsWith(folderPath + '/')) setActiveFolder(null)
  }, [assets, updateAsset, confirm, activeFolder])

  const handleRenameFolder = useCallback(async (oldPath: string, newName: string) => {
    const parentPath = oldPath.includes('/') ? oldPath.slice(0, oldPath.lastIndexOf('/')) : ''
    const newPath = parentPath ? `${parentPath}/${newName}` : newName
    if (newPath === oldPath) return
    // Rename in all assets
    for (const a of assets) {
      const f = a.folder ?? ''
      if (f === oldPath) {
        await updateAsset({ ...a, folder: newPath })
      } else if (f.startsWith(oldPath + '/')) {
        await updateAsset({ ...a, folder: newPath + f.slice(oldPath.length) })
      }
    }
    // Update manual folders
    setManualFolders(prev => {
      const next = new Set<string>()
      for (const f of prev) {
        if (f === oldPath) next.add(newPath)
        else if (f.startsWith(oldPath + '/')) next.add(newPath + f.slice(oldPath.length))
        else next.add(f)
      }
      return next
    })
    if (activeFolder === oldPath) setActiveFolder(newPath)
    else if (activeFolder && activeFolder.startsWith(oldPath + '/')) setActiveFolder(newPath + activeFolder.slice(oldPath.length))
  }, [assets, updateAsset, activeFolder])

  // Count assets per folder
  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const f of folderTree) counts.set(f, 0)
    for (const a of assets) {
      const f = a.folder ?? ''
      for (const folder of folderTree) {
        if (folder === '' || f === folder || f.startsWith(folder + '/')) {
          counts.set(folder, (counts.get(folder) ?? 0) + 1)
        }
      }
    }
    return counts
  }, [assets, folderTree])

  // Flat folders — no nesting
  const getChildren = (_parent: string): string[] => []

  const draggedAsset = dragActiveId ? assets.find(a => a.id === dragActiveId) : null
  const dragCount = selectedIds.size > 1 ? selectedIds.size : 1

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <div className="flex h-full overflow-hidden">
      {/* Folder tree */}
      <div className="min-w-44 max-w-64 shrink-0 flex flex-col border-r border-neutral-700 bg-neutral-850">
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-neutral-700">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Folders</span>
          <button onClick={() => setAddingFolder(true)}
            className="p-0.5 text-neutral-500 hover:text-neutral-200">
            <FolderPlus size={12} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto text-xs">
          {/* Default (unassigned assets) */}
          <DroppableFolder id="__root__">
            <button onClick={() => setActiveFolder(activeFolder === '' ? null : '')}
              className={`w-full text-left py-1 flex items-center gap-1 ${activeFolder === '' ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400 hover:bg-neutral-800'}`}
              style={{ paddingLeft: 12 }}>
              <FolderOpen size={12} />
              <span className="flex-1">Default</span>
              <span className="text-[10px] text-neutral-500">{assets.filter(a => !(a.folder ?? '')).length}</span>
            </button>
          </DroppableFolder>
          {/* Folders */}
          {folderTree.map(f => (
            <FolderItem key={f} path={f} depth={0}
              activeFolder={activeFolder} setActiveFolder={setActiveFolder}
              expandedFolders={expandedFolders} toggleFolder={toggleFolder}
              getChildren={getChildren} folderCounts={folderCounts}
              onDelete={handleDeleteFolder} onRename={handleRenameFolder} />
          ))}
          {/* Add folder input */}
          {addingFolder && (
            <div className="px-2 py-1 flex items-center gap-1">
              <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddFolder(); if (e.key === 'Escape') { setAddingFolder(false); setNewFolderName('') } }}
                placeholder="folder name"
                className="flex-1 px-1 py-0.5 bg-neutral-900 border border-neutral-600 text-xs text-neutral-200 focus:outline-none focus:border-sky-500"
                autoFocus />
              <button onClick={handleAddFolder} className="text-green-400 hover:text-green-300"><Check size={10} /></button>
              <button onClick={() => { setAddingFolder(false); setNewFolderName('') }} className="text-neutral-500 hover:text-neutral-300"><X size={10} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Asset list */}
      <div className="w-72 shrink-0 flex flex-col border-r border-neutral-700 bg-neutral-850">
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
        <div className="flex-1 overflow-y-auto outline-none" tabIndex={0} onKeyDown={handleKeyNav}>
          {loadingAssets ? (
            <div className="p-4 text-neutral-500 text-xs text-center">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-neutral-500 text-xs text-center">
              {assets.length === 0 ? 'No assets yet. Upload some images.' : 'No matches.'}
            </div>
          ) : (
            filtered.map(a => (
              <DraggableAssetRow
                key={a.id}
                asset={a}
                isSelected={a.id === selectedId}
                isMultiSelected={selectedIds.has(a.id)}
                onSelect={(e: React.MouseEvent) => handleAssetClick(a.id, e)}
                onDelete={() => handleDelete(a.id)}
                onUpdate={updateAsset}
                categories={categories}
                folders={folderTree}
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

      {/* Drag overlay */}
      <DragOverlay>
        {dragActiveId && draggedAsset && (
          <div className="px-3 py-2 bg-neutral-800 border border-sky-500 text-xs text-neutral-200 shadow-lg opacity-90">
            {draggedAsset.name} {dragCount > 1 && `(+${dragCount - 1} more)`}
          </div>
        )}
      </DragOverlay>
    </div>
    </DndContext>
  )
}

// ── Draggable Asset Row wrapper ──────────────────────────

function DraggableAssetRow(props: { asset: ProjectAsset; isSelected: boolean; isMultiSelected: boolean; onSelect: (e: React.MouseEvent) => void; onDelete: () => void; onUpdate: (a: ProjectAsset) => Promise<void>; categories: string[]; folders: string[] }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: props.asset.id })
  const { isMultiSelected, ...restProps } = props
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.4 : 1 }}
      className={`outline-none ${isMultiSelected && !props.isSelected ? 'bg-sky-900/20' : ''}`}>
      <AssetRow {...restProps} />
    </div>
  )
}

// ── Droppable Folder wrapper ─────────────────────────────

function DroppableFolder({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={isOver ? 'bg-sky-900/30' : ''}>
      {children}
    </div>
  )
}

// ── Lazy thumbnail hook (IntersectionObserver) ───────────

function useLazyThumb(assetId: string, mimeType: string) {
  const ref = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState<string | null>(() => getCachedBlobUrl(assetId) ?? null)

  useEffect(() => {
    if (thumb) return // already loaded (from cache)
    const el = ref.current
    if (!el) return
    let cancelled = false
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      io.disconnect()
      getAssetBlobUrl(assetId, mimeType).then(url => {
        if (!cancelled) setThumb(url)
      })
    }, { rootMargin: '100px' })
    io.observe(el)
    return () => { cancelled = true; io.disconnect() }
  }, [assetId, mimeType, thumb])

  return { ref, thumb }
}

// ── Asset Row ────────────────────────────────────────────

const AssetRow = memo(function AssetRow({
  asset,
  isSelected,
  onSelect,
  onDelete,
  onUpdate,
  categories,
  folders,
}: {
  asset: ProjectAsset
  isSelected: boolean
  onSelect: (e: React.MouseEvent) => void
  onDelete: () => void
  onUpdate: (a: ProjectAsset) => Promise<void>
  folders: string[]
  categories: string[]
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(asset.name)
  const [editCategory, setEditCategory] = useState(asset.category)
  const [editFolder, setEditFolder] = useState(asset.folder ?? '')
  const [editingNewCat, setEditingNewCat] = useState(false)
  const [newCatInput, setNewCatInput] = useState('')
  const { ref: thumbRef, thumb } = useLazyThumb(asset.id, asset.mimeType)

  const handleSave = async () => {
    await onUpdate({ ...asset, name: editName.trim() || asset.name, category: editCategory, folder: editFolder })
    setEditing(false)
  }

  const handleCancel = () => {
    setEditName(asset.name)
    setEditCategory(asset.category)
    setEditFolder(asset.folder ?? '')
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
        <div className="flex gap-1.5 items-center">
          <span className="text-[10px] text-neutral-500 w-10">Folder</span>
          <select
            value={editFolder}
            onChange={e => setEditFolder(e.target.value)}
            className="flex-1 px-2 py-1 bg-neutral-800 border border-neutral-600 text-xs text-neutral-200"
          >
            <option value="">(root)</option>
            {folders.filter(f => f !== '').map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={thumbRef}
      onClick={onSelect}
      className={`w-full text-left px-3 py-2 border-b border-neutral-800 flex items-center gap-2.5 group hover:bg-neutral-800 cursor-pointer ${isSelected ? 'bg-neutral-800 border-l-2 border-l-sky-500' : ''}`}
    >
      {thumb ? (
        <img src={thumb} className="w-8 h-8 object-cover bg-neutral-700 shrink-0" style={{ imageRendering: 'pixelated' }} />
      ) : (
        <div className="w-8 h-8 bg-neutral-700 shrink-0 animate-pulse" />
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
    </div>
  )
})

// ── Folder tree item ─────────────────────────────────────

function FolderItem({ path, depth, activeFolder, setActiveFolder, expandedFolders, toggleFolder, getChildren, folderCounts, onDelete, onRename }: {
  path: string; depth: number
  activeFolder: string | null; setActiveFolder: (f: string | null) => void
  expandedFolders: Set<string>; toggleFolder: (f: string) => void
  getChildren: (parent: string) => string[]
  folderCounts: Map<string, number>
  onDelete: (path: string) => void
  onRename: (oldPath: string, newName: string) => void
}) {
  const name = path.includes('/') ? path.split('/').pop()! : path
  const children = getChildren(path)
  const isExpanded = expandedFolders.has(path)
  const isActive = activeFolder === path
  const count = folderCounts.get(path) ?? 0
  const [renaming, setRenaming] = useState(false)
  const [renameName, setRenameName] = useState(name)

  return (
    <DroppableFolder id={path}>
      <div
        onClick={() => setActiveFolder(isActive ? null : path)}
        className={`w-full text-left py-1 flex items-center gap-1 cursor-pointer group ${isActive ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400 hover:bg-neutral-800'}`}
        style={{ paddingLeft: (depth + 1) * 12 }}
      >
        <FolderOpen size={12} className="shrink-0" />
        {renaming ? (
          <input value={renameName} onChange={e => setRenameName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && renameName.trim()) { onRename(path, renameName.trim()); setRenaming(false) }
              if (e.key === 'Escape') { setRenameName(name); setRenaming(false) }
            }}
            onBlur={() => { if (renameName.trim()) { onRename(path, renameName.trim()); setRenaming(false) } }}
            onClick={e => e.stopPropagation()}
            className="flex-1 px-1 bg-neutral-900 border border-neutral-600 text-xs text-neutral-200 focus:outline-none"
            autoFocus />
        ) : (
          <span className="flex-1 truncate" onDoubleClick={e => { e.stopPropagation(); setRenaming(true); setRenameName(name) }}>{name}</span>
        )}
        <span className="text-[10px] text-neutral-500">{count}</span>
        <button onClick={e => { e.stopPropagation(); onDelete(path) }}
          className="p-0.5 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100">
          <Trash2 size={10} />
        </button>
      </div>
      {isExpanded && children.map(c => (
        <FolderItem key={c} path={c} depth={depth + 1}
          activeFolder={activeFolder} setActiveFolder={setActiveFolder}
          expandedFolders={expandedFolders} toggleFolder={toggleFolder}
          getChildren={getChildren} folderCounts={folderCounts}
          onDelete={onDelete} onRename={onRename} />
      ))}
    </DroppableFolder>
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

import { useRef, useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { useEntityContext } from '../state/EntityContext'
import { useEntityImages } from '../state/useEntityImages'
import { CollisionEditorOverlay } from './Canvas/CollisionEditorOverlay'

export function EntityCollisionModal() {
  const state = useEditorState()
  const entityDefId = state.selectedEntityDefForCollision
  if (!entityDefId) return null

  return createPortal(
    <FloatingWindow entityDefId={entityDefId} />,
    document.body,
  )
}

function FloatingWindow({ entityDefId }: { entityDefId: string }) {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const { entityDefs, updateEntityDef } = useEntityContext()
  const entityImages = useEntityImages()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<CollisionEditorOverlay | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const entityDef = entityDefs.find(d => d.id === entityDefId)

  const [pos, setPos] = useState({ x: 100, y: 80 })
  const [size] = useState({ w: 650, h: 550 })
  const isDragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  // Init overlay
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || !entityDef) return

    const overlay = new CollisionEditorOverlay(canvas)
    overlayRef.current = overlay
    overlay.syncState(state.zoneDefs, state.selectedZoneDefType)

    const rect = container.getBoundingClientRect()
    overlay.resize(Math.round(rect.width), Math.round(rect.height))
    overlay.open(entityDef, state.tileSize, entityImages)

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      overlay.resize(Math.round(width), Math.round(height))
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      overlay.destroy()
      overlayRef.current = null
    }
  }, [entityDefId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update images when they load (fixes sprite not rendering if image loads after open)
  useEffect(() => {
    overlayRef.current?.updateImages(entityImages)
  }, [entityImages])

  // Sync zone state
  useEffect(() => {
    overlayRef.current?.syncState(state.zoneDefs, state.selectedZoneDefType)
  }, [state.zoneDefs, state.selectedZoneDefType])

  const handleDone = useCallback(() => {
    const overlay = overlayRef.current
    if (!overlay || !entityDef) return
    updateEntityDef({ ...entityDef, collision: { zones: overlay.getZones() } })
    dispatch({ type: 'SELECT_ENTITY_DEF_FOR_COLLISION', entityDefId: null })
  }, [entityDef, dispatch, updateEntityDef])

  const handleClear = useCallback(() => {
    overlayRef.current?.clearZones()
  }, [])

  const handleClose = useCallback(() => {
    dispatch({ type: 'SELECT_ENTITY_DEF_FOR_COLLISION', entityDefId: null })
  }, [dispatch])

  // ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
      if (e.key === 'Delete' || e.key === 'Backspace') overlayRef.current?.deleteSelected()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleClose])

  // Title bar drag
  const onTitlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    isDragging.current = true
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [pos])

  const onTitlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
  }, [])

  const onTitlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  return (
    <div
      className="fixed z-50 bg-neutral-900 border border-neutral-600 shadow-2xl flex flex-col overflow-hidden"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-2 py-1.5 bg-neutral-800 border-b border-neutral-700 cursor-move select-none shrink-0"
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={onTitlePointerUp}
      >
        <span className="text-xs text-neutral-300 font-medium">{entityDef?.name ?? entityDefId} — Collision</span>
        <div className="flex items-center gap-1">
          <button onClick={handleClear} className="text-[10px] px-1.5 py-0.5 bg-neutral-700 text-neutral-300 border border-neutral-600 hover:bg-neutral-600">
            Clear
          </button>
          <button onClick={handleDone} className="text-[10px] px-1.5 py-0.5 bg-sky-700 text-white border border-sky-600 hover:bg-sky-600">
            Done
          </button>
          <button onClick={handleClose} className="text-[10px] px-1 text-neutral-400 hover:text-neutral-200">
            ✕
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onWheel={e => overlayRef.current?.onWheel(e.nativeEvent)}
          onPointerDown={e => overlayRef.current?.onPointerDown(e.nativeEvent)}
          onPointerMove={e => overlayRef.current?.onPointerMove(e.nativeEvent)}
          onPointerUp={e => overlayRef.current?.onPointerUp(e.nativeEvent)}
          onContextMenu={e => e.preventDefault()}
        />
      </div>

      {/* Footer */}
      <div className="px-2 py-1 border-t border-neutral-700 shrink-0">
        <span className="text-[9px] text-neutral-500">Select zone type → 2-click draw. Del to remove.</span>
      </div>
    </div>
  )
}

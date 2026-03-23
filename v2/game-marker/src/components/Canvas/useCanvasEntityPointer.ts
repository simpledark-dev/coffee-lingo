import { useCallback, useRef } from 'react'
import { useEditorState, useEditorDispatch } from '../../state/EditorContext'
import { getDefVisual } from '../../types/entity'
import type { EntityDef } from '../../types/entity'

export function useCanvasEntityPointer(canvasRef: React.RefObject<HTMLCanvasElement | null>, entityDefs: EntityDef[]) {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const isDragging = useRef(false)
  const dragEntityId = useRef<string | null>(null)
  const dragOffset = useRef({ row: 0, col: 0 })

  const screenToGrid = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left - state.panX) / state.zoom
    const y = (clientY - rect.top - state.panY) / state.zoom
    const col = Math.floor(x / state.tileSize)
    const row = Math.floor(y / state.tileSize)
    return { row, col }
  }, [canvasRef, state.panX, state.panY, state.zoom, state.tileSize])

  const getEntityAt = useCallback((row: number, col: number): { entity: import('../../types/entity').Entity; layerId: string } | null => {
    // Search ALL visible layers (reverse order = top layer first)
    for (let li = state.entityLayers.length - 1; li >= 0; li--) {
      const el = state.entityLayers[li]
      if (!el.visible) continue
      for (let i = el.entities.length - 1; i >= 0; i--) {
        const e = el.entities[i]
        const def = entityDefs.find(d => d.id === e.defId)
        if (!def) continue
        if (row >= e.row && row < e.row + getDefVisual(def).height && col >= e.col && col < e.col + getDefVisual(def).width) {
          return { entity: e, layerId: el.id }
        }
      }
    }
    return null
  }, [state.entityLayers, entityDefs])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 || state.editorMode !== 'entity') return
    const grid = screenToGrid(e.clientX, e.clientY)
    if (!grid) return

    // If placing mode (def selected) → always place, don't select instances
    if (state.selectedEntityDefId) {
      const def = entityDefs.find(d => d.id === state.selectedEntityDefId)
      if (!def) return
      dispatch({ type: 'PUSH_HISTORY' })
      dispatch({ type: 'PLACE_ENTITY', row: grid.row, col: grid.col, def, entityDefs })
      return
    }

    // Selection mode — click any entity across all visible layers
    const hit = getEntityAt(grid.row, grid.col)
    if (hit) {
      dispatch({ type: 'SELECT_ENTITY', entityId: hit.entity.id })
      dispatch({ type: 'SET_ACTIVE_ENTITY_LAYER', layerId: hit.layerId })
      isDragging.current = true
      dragEntityId.current = hit.entity.id
      dragOffset.current = { row: grid.row - hit.entity.row, col: grid.col - hit.entity.col }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      dispatch({ type: 'PUSH_HISTORY' })
    } else {
      dispatch({ type: 'SELECT_ENTITY', entityId: null })
    }
  }, [state.editorMode, state.selectedEntityDefId, screenToGrid, getEntityAt, dispatch, entityDefs])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !dragEntityId.current) return
    const grid = screenToGrid(e.clientX, e.clientY)
    if (!grid) return
    const newRow = grid.row - dragOffset.current.row
    const newCol = grid.col - dragOffset.current.col
    dispatch({ type: 'MOVE_ENTITY', entityId: dragEntityId.current, row: newRow, col: newCol, entityDefs })
  }, [screenToGrid, dispatch])

  const onPointerUp = useCallback(() => {
    isDragging.current = false
    dragEntityId.current = null
  }, [])

  return { onEntityPointerDown: onPointerDown, onEntityPointerMove: onPointerMove, onEntityPointerUp: onPointerUp }
}

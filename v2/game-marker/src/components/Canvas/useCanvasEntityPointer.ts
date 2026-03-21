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

  const getEntityAt = useCallback((row: number, col: number) => {
    // Only search active layer
    const activeLayer = state.entityLayers.find(l => l.id === state.activeEntityLayerId)
    if (!activeLayer || !activeLayer.visible || activeLayer.locked) return null
    for (let i = activeLayer.entities.length - 1; i >= 0; i--) {
      const e = activeLayer.entities[i]
      const def = entityDefs.find(d => d.id === e.defId)
      if (!def) continue
      if (row >= e.row && row < e.row + getDefVisual(def).height && col >= e.col && col < e.col + getDefVisual(def).width) {
        return e
      }
    }
    return null
  }, [state.entityLayers, state.activeEntityLayerId, entityDefs])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 || state.editorMode !== 'entity') return
    const grid = screenToGrid(e.clientX, e.clientY)
    if (!grid) return

    const entity = getEntityAt(grid.row, grid.col)

    if (entity) {
      // Select entity (already on active layer)
      dispatch({ type: 'SELECT_ENTITY', entityId: entity.id })
      isDragging.current = true
      dragEntityId.current = entity.id
      dragOffset.current = { row: grid.row - entity.row, col: grid.col - entity.col }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      dispatch({ type: 'PUSH_HISTORY' })
    } else if (state.selectedEntityDefId) {
      // Place new entity
      const def = entityDefs.find(d => d.id === state.selectedEntityDefId)
      if (!def) return
      dispatch({ type: 'PUSH_HISTORY' })
      dispatch({ type: 'PLACE_ENTITY', row: grid.row, col: grid.col, def })
    } else {
      // Deselect
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

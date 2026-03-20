import type { EditorAction, EditorState } from '../types/editor'
import type { Dispatch } from 'react'

export interface ToolHandlers {
  onDown(row: number, col: number, state: EditorState, dispatch: Dispatch<EditorAction>): void
  onMove(row: number, col: number, state: EditorState, dispatch: Dispatch<EditorAction>): void
  onUp(state: EditorState, dispatch: Dispatch<EditorAction>): void
}

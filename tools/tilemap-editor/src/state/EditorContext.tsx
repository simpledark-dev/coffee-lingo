import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react'
import type { EditorState, EditorAction } from '../types/editor'
import { editorReducer, createInitialState } from './editorReducer'

const EditorStateCtx = createContext<EditorState | null>(null)
const EditorDispatchCtx = createContext<Dispatch<EditorAction> | null>(null)

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, undefined, createInitialState)
  return (
    <EditorStateCtx.Provider value={state}>
      <EditorDispatchCtx.Provider value={dispatch}>
        {children}
      </EditorDispatchCtx.Provider>
    </EditorStateCtx.Provider>
  )
}

export function useEditorState(): EditorState {
  const ctx = useContext(EditorStateCtx)
  if (!ctx) throw new Error('useEditorState must be used within EditorProvider')
  return ctx
}

export function useEditorDispatch(): Dispatch<EditorAction> {
  const ctx = useContext(EditorDispatchCtx)
  if (!ctx) throw new Error('useEditorDispatch must be used within EditorProvider')
  return ctx
}

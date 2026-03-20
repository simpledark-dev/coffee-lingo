import type { EditorState, TilemapJSON } from '../types/editor'
import { exportJson } from './exportJson'
import { parseImportJson } from './importJson'

const STORAGE_KEY = 'tilemap-editor-save'

export function saveToLocalStorage(state: EditorState): void {
  try {
    const data = exportJson(state)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Failed to save to localStorage:', e)
  }
}

export function loadFromLocalStorage(): TilemapJSON | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return parseImportJson(raw)
  } catch (e) {
    console.warn('Failed to load from localStorage:', e)
    return null
  }
}

export function hasSavedData(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null
}

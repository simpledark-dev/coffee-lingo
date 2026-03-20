import { useRef, useState } from 'react'
import { X, Upload } from 'lucide-react'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { parseImportJson, readFileAsText } from '../utils/importJson'

export function ImportDialog() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  if (!state.importDialogOpen) return null

  const close = () => {
    setError(null)
    dispatch({ type: 'SET_IMPORT_DIALOG', open: false })
  }

  const handleFile = async (file: File) => {
    try {
      setError(null)
      const text = await readFileAsText(file)
      const data = parseImportJson(text)
      dispatch({ type: 'PUSH_HISTORY' })
      dispatch({ type: 'IMPORT_MAP', data })
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={close}>
      <div className="bg-neutral-800 border border-neutral-600 w-80 p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold uppercase tracking-wider">Import JSON</span>
          <button onClick={close} className="text-neutral-400 hover:text-neutral-100">
            <X size={16} />
          </button>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed p-6 text-center cursor-pointer ${
            dragOver ? 'border-sky-500 bg-sky-900/20' : 'border-neutral-600'
          }`}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={24} className="mx-auto mb-2 text-neutral-400" />
          <p className="text-xs text-neutral-400">Drop JSON file here or click to browse</p>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>

        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
      </div>
    </div>
  )
}

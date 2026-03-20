import { X } from 'lucide-react'
import { useEditorState, useEditorDispatch } from '../state/EditorContext'
import { exportJson, downloadJson } from '../utils/exportJson'
import { exportPng, downloadBlob } from '../utils/exportPng'
import { tilesetImageStore } from './TilePalette'

export function ExportDialog() {
  const state = useEditorState()
  const dispatch = useEditorDispatch()

  if (!state.exportDialogOpen) return null

  const close = () => dispatch({ type: 'SET_EXPORT_DIALOG', open: false })

  const handleExportJson = () => {
    const data = exportJson(state)
    downloadJson(data, `${state.mapName || 'tilemap'}.json`)
    close()
  }

  const handleExportPng = async () => {
    try {
      const blob = await exportPng(state, tilesetImageStore)
      downloadBlob(blob, `${state.mapName || 'tilemap'}.png`)
      close()
    } catch (err) {
      console.error('Export PNG failed:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={close}>
      <div className="bg-neutral-800 border border-neutral-600 w-72 p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold uppercase tracking-wider">Export</span>
          <button onClick={close} className="text-neutral-400 hover:text-neutral-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleExportPng}
            className="w-full py-2 text-sm bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 text-neutral-100"
          >
            Export as PNG
          </button>
          <button
            onClick={handleExportJson}
            className="w-full py-2 text-sm bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 text-neutral-100"
          >
            Export as JSON
          </button>
        </div>
      </div>
    </div>
  )
}

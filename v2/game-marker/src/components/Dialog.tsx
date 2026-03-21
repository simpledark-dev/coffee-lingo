import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'

interface DialogOptions {
  title: string
  message: string
  type?: 'confirm' | 'alert'
  confirmText?: string
  cancelText?: string
}

interface DialogContextValue {
  confirm: (title: string, message: string) => Promise<boolean>
  alert: (title: string, message: string) => Promise<void>
}

const DialogCtx = createContext<DialogContextValue>({
  confirm: () => Promise.resolve(false),
  alert: () => Promise.resolve(),
})

export function useDialog() {
  return useContext(DialogCtx)
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<(DialogOptions & { resolve: (v: boolean) => void }) | null>(null)
  const resolveRef = useRef<((v: boolean) => void) | null>(null)

  const showDialog = useCallback((opts: DialogOptions): Promise<boolean> => {
    return new Promise(resolve => {
      resolveRef.current = resolve
      setDialog({ ...opts, resolve })
    })
  }, [])

  const confirmFn = useCallback((title: string, message: string) => {
    return showDialog({ title, message, type: 'confirm' })
  }, [showDialog])

  const alertFn = useCallback(async (title: string, message: string) => {
    await showDialog({ title, message, type: 'alert' })
  }, [showDialog])

  const handleClose = useCallback((result: boolean) => {
    resolveRef.current?.(result)
    resolveRef.current = null
    setDialog(null)
  }, [])

  return (
    <DialogCtx.Provider value={{ confirm: confirmFn, alert: alertFn }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={() => handleClose(false)}>
          <div className="bg-neutral-800 border border-neutral-600 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-neutral-700">
              <h3 className="text-sm font-bold text-neutral-100">{dialog.title}</h3>
            </div>
            <div className="px-4 py-4">
              <p className="text-xs text-neutral-300 leading-relaxed">{dialog.message}</p>
            </div>
            <div className="flex gap-2 px-4 py-3 border-t border-neutral-700 justify-end">
              {dialog.type === 'confirm' && (
                <button
                  onClick={() => handleClose(false)}
                  className="px-3 py-1.5 text-xs bg-neutral-700 hover:bg-neutral-600 text-neutral-300 border border-neutral-600"
                >
                  {dialog.cancelText ?? 'Cancel'}
                </button>
              )}
              <button
                onClick={() => handleClose(true)}
                className={`px-3 py-1.5 text-xs text-white border ${
                  dialog.type === 'confirm'
                    ? 'bg-red-700 hover:bg-red-600 border-red-600'
                    : 'bg-sky-700 hover:bg-sky-600 border-sky-600'
                }`}
                autoFocus
              >
                {dialog.confirmText ?? (dialog.type === 'confirm' ? 'Delete' : 'OK')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogCtx.Provider>
  )
}

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  toast: (message: string, type?: Toast['type']) => void
}

const ToastCtx = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastCtx).toast
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = nextId.current++
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastCtx.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className={`pointer-events-auto flex items-center gap-2 px-3 py-2 text-xs shadow-lg border animate-[slideIn_0.2s_ease-out] ${
              t.type === 'success' ? 'bg-green-900/90 border-green-700 text-green-200' :
              t.type === 'error' ? 'bg-red-900/90 border-red-700 text-red-200' :
              'bg-neutral-800/90 border-neutral-600 text-neutral-200'
            }`}
          >
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-neutral-400 hover:text-neutral-200 shrink-0">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

import { useState, createContext, useContext, useCallback, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastItem {
  id: number
  message: string
  type: 'info' | 'success' | 'warn' | 'error'
  action?: ToastAction
}

interface ToastContextType {
  toast: (message: string, type?: ToastItem['type'], action?: ToastAction) => void
  showToast: (message: string, type?: ToastItem['type'], action?: ToastAction) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {}, showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback(
    (message: string, type: ToastItem['type'] = 'info', action?: ToastAction) => {
      const id = ++toastId
      setToasts(prev => [...prev, { id, message, type, action }])
      // A toast that carries an undo affordance stays long enough to be used.
      const ttl = action ? 7000 : 3000
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, ttl)
    },
    [],
  )

  const typeColors = {
    info: 'border-accent-2 bg-accent-2/10 text-accent-2',
    success: 'border-success bg-success/10 text-success',
    warn: 'border-warn bg-warn/10 text-warn',
    // Errors use --danger, not --accent: coral is the brand's primary accent,
    // so an error styled in coral did not read as an error.
    error: 'border-danger bg-danger/10 text-danger',
  }

  return (
    <ToastContext.Provider value={{ toast, showToast: toast }}>
      {children}
      {/* On mobile the toast has to clear the 56px bottom navigation bar and
          the retro window dock, otherwise it renders underneath them and the
          UNDO button cannot be tapped. */}
      <div className="fixed bottom-24 md:bottom-4 right-3 md:right-4 left-3 md:left-auto z-50 flex flex-col items-stretch md:items-end gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.9 }}
              className={`font-pixel text-small px-4 py-3 border-2 ${typeColors[t.type]} pixel-border max-w-full md:max-w-[260px] flex items-center gap-3 pointer-events-auto`}
            >
              <span className="flex-1 min-w-0 break-words">{t.message}</span>
              {t.action ? (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick()
                    setToasts(prev => prev.filter(x => x.id !== t.id))
                  }}
                  className="font-pixel text-small underline underline-offset-2 hover:no-underline shrink-0"
                >
                  {t.action.label}
                </button>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

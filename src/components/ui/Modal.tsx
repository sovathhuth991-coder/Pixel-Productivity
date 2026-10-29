import { type ReactNode, useId } from 'react'
import Dialog from './Dialog'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
}

/**
 * The app's standard modal chrome. All of the accessibility behaviour
 * (focus trap, focus restore, Escape, scroll lock, dialog semantics) lives in
 * the shared `Dialog` primitive underneath.
 */
export default function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  const titleId = useId()

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      panelClassName="w-full max-w-[420px] bg-surface border-4 border-line pixel-border"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-b-2 border-line">
        <h2 id={titleId} className="font-pixel text-lead text-accent">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="font-pixel text-lead text-dim hover:text-accent transition-colors w-8 h-8 flex items-center justify-center shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="flex justify-end gap-2 px-5 py-4 border-t-2 border-line">{footer}</div>
      )}
    </Dialog>
  )
}

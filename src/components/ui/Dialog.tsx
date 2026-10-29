import { type ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useDesignMode } from '../../context/DesignModeContext'

/**
 * The one dialog primitive for the whole app.
 *
 * Every overlay used to be hand-rolled: no `role="dialog"`, no `aria-modal`, no
 * focus trap, no focus restore, no body scroll lock and (for the Bookmarks
 * overlays) no Escape handling at all. Screen readers announced nothing and
 * Tab escaped behind the overlay into the page underneath.
 *
 * This component owns all of that:
 *   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
 *   - focus is moved into the panel on open and restored to the trigger on close
 *   - Tab / Shift+Tab cycle inside the panel (focus trap)
 *   - Escape closes
 *   - the page behind is scroll-locked (with scrollbar-width compensation so
 *     the layout does not jump sideways)
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** Visible, enabled, focusable descendants of `root`, in tab order. */
function getFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    el => !el.hasAttribute('disabled') && el.getClientRects().length > 0
  )
}

/** The nearest focusable element at or above `el`. */
function focusableAncestor(el: HTMLElement | null): HTMLElement | null {
  let cur: HTMLElement | null = el
  while (cur) {
    if (cur.matches(FOCUSABLE_SELECTOR) && cur.getClientRects().length > 0) return cur
    cur = cur.parentElement
  }
  return null
}

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  /** `id` of the element that contains the dialog's visible title. */
  labelledBy: string
  children: ReactNode
  /** Classes for the panel element. */
  panelClassName?: string
  /**
   * Where the panel sits. `center` is the default; `bottom` pins it to the
   * bottom of the screen, which is the right shape for a mobile action sheet.
   */
  align?: 'center' | 'bottom'
  /** Element that should receive focus when the dialog opens. */
  initialFocusRef?: React.RefObject<HTMLElement | null>
}

export default function Dialog({
  isOpen,
  onClose,
  labelledBy,
  children,
  panelClassName = '',
  align = 'center',
  initialFocusRef,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  // The "stop animations" toggle only used to mute CSS animations; the
  // framer-motion enter/exit transitions kept running, so a user who asked
  // for reduced motion still got a moving sheet. Honour the setting here.
  const { animationsEnabled } = useDesignMode()

  // Keep the latest onClose without re-running the effect (and without
  // re-running the focus trap) on every parent render.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // The element that had focus before the dialog opened, so focus can be
  // handed back when it closes. React's `autoFocus` moves focus during the
  // commit — before the open effect below could look — so the trigger is
  // captured during render, while focus is still sitting on it.
  const triggerRef = useRef<HTMLElement | null>(null)
  const isOpenRef = useRef(false)
  if (isOpen && !isOpenRef.current) {
    const el =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null
    if (el && el !== document.body) triggerRef.current = el
  }
  isOpenRef.current = isOpen

  // Backdrop press bookkeeping, so a drag that starts outside the panel and
  // ends inside it does not dismiss the dialog.
  const backdropDownRef = useRef(false)
  const backdropUpRef = useRef(false)

  useEffect(() => {
    if (isOpen) return
    // Fallback for a dialog that was opened without a focused trigger:
    // remember the last thing the user interacted with. Once the dialog is
    // open the focus belongs to it, so those events are ignored — otherwise
    // the field React's `autoFocus` lands on would replace the trigger.
    const remember = (e: Event) => {
      if (isOpenRef.current) return
      const el = e.target as HTMLElement | null
      if (el && el !== document.body) triggerRef.current = el
    }
    document.addEventListener('focusin', remember, true)
    document.addEventListener('click', remember, true)
    return () => {
      document.removeEventListener('focusin', remember, true)
      document.removeEventListener('click', remember, true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const panel = panelRef.current

    // Whatever was focused before the dialog opened: either the element that
    // still holds focus (if it is outside the panel), or the recorded trigger.
    const active = document.activeElement as HTMLElement | null
    const outsidePanel = active && panel && !panel.contains(active) ? active : null
    const previouslyFocused = outsidePanel ?? focusableAncestor(triggerRef.current)

    // --- scroll lock, compensated for the scrollbar width so nothing shifts ---
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const prevOverflow = document.body.style.overflow
    const prevPaddingRight = document.body.style.paddingRight
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      const currentPadding = parseFloat(window.getComputedStyle(document.body).paddingRight) || 0
      document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`
    }

    // --- move focus into the panel ---
    const raf = requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus()
        return
      }
      // If the panel already has focus (React's `autoFocus` on the first
      // field, for instance) leave it where the author put it.
      const current = document.activeElement
      if (current && panel?.contains(current)) return
      const first = getFocusable(panel)[0] ?? panel
      first?.focus()
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return

      const focusable = getFocusable(panel)
      if (focusable.length === 0) {
        e.preventDefault()
        panel?.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (e.shiftKey) {
        if (active === first || !panel?.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last || !panel?.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', handleKeyDown, true)
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPaddingRight
      // Restore focus to whatever opened the dialog.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [isOpen, initialFocusRef])

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Remember where the press started, and keep the browser from moving
    // focus out of the dialog while it is still open.
    backdropDownRef.current = e.target === e.currentTarget
    if (backdropDownRef.current) e.preventDefault()
  }

  const handleBackdropMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    // A press that started on the backdrop and ended on the backdrop was a
    // click on the backdrop. A drag that ended inside the panel was not.
    backdropUpRef.current = e.target === e.currentTarget
  }

  const handleBackdropClick = () => {
    if (backdropDownRef.current && backdropUpRef.current) onCloseRef.current()
    backdropDownRef.current = false
    backdropUpRef.current = false
  }

  // The overlay is rendered into <body>, not in place. A `position: fixed`
  // overlay is still trapped by any ancestor that creates a containing block
  // (a transform, a filter, `will-change`) — and plenty of things in this
  // app are transformed: the category carousel slides, the dialogs animate.
  // Portalling keeps every dialog full-screen wherever it is declared.
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={
            align === 'bottom'
              ? 'fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm'
              : 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4'
          }
          initial={{ opacity: animationsEnabled ? 0 : 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: animationsEnabled ? 0 : 1 }}
          transition={animationsEnabled ? undefined : { duration: 0 }}
          onMouseDown={handleBackdropMouseDown}
          onMouseUp={handleBackdropMouseUp}
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            className={`relative z-10 outline-none ${panelClassName}`}
            initial={
              animationsEnabled
                ? align === 'bottom'
                  ? { opacity: 0, y: 40 }
                  : { scale: 0.95, opacity: 0, y: 16 }
                : false
            }
            animate={align === 'bottom' ? { opacity: 1, y: 0 } : { scale: 1, opacity: 1, y: 0 }}
            exit={
              animationsEnabled
                ? align === 'bottom'
                  ? { opacity: 0, y: 40 }
                  : { scale: 0.95, opacity: 0, y: 16 }
                : undefined
            }
            transition={animationsEnabled ? { type: 'spring', damping: 25, stiffness: 300 } : { duration: 0 }}
            onMouseDown={e => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

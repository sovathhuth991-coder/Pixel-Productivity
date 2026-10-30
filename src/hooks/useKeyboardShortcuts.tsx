import { useEffect, useCallback, useState, useContext, createContext, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { usePomodoroContext } from '../context/PomodoroContext'
import { playStart } from '../utils/audio'
import { requestOpenTaskModal } from '../utils/taskModalRequests'

interface KeyboardShortcutsContextType {
  openShortcutsHelp: () => void
  closeShortcutsHelp: () => void
  isShortcutsHelpOpen: boolean
}

export const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType>({
  openShortcutsHelp: () => {},
  closeShortcutsHelp: () => {},
  isShortcutsHelpOpen: false,
})

export function useKeyboardShortcuts() {
  return useContext(KeyboardShortcutsContext)
}

/** True when the event came from somewhere the user is typing. */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return true
  return el.isContentEditable === true
}

/** True when the focused element handles Space / Enter itself. */
function isActivatable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'SUMMARY') return true
  return el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link'
}

/** True when a modal dialog owns the keyboard. */
function hasOpenDialog(): boolean {
  return typeof document !== 'undefined' && !!document.querySelector('[role="dialog"][aria-modal="true"]')
}

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false)

  const pomodoro = usePomodoroContext()

  const openShortcutsHelp = useCallback(() => setIsShortcutsHelpOpen(true), [])
  const closeShortcutsHelp = useCallback(() => setIsShortcutsHelpOpen(false), [])

  // N shortcut - go to the dashboard and open the new-task dialog.
  const handleNewTask = useCallback(() => {
    if (location.pathname !== '/') {
      navigate('/', { replace: true })
    }
    requestOpenTaskModal()
  }, [navigate, location.pathname])

  // Refs so the global listener never needs to be re-bound.
  const isRunningRef = useRef(pomodoro.isRunning)
  isRunningRef.current = pomodoro.isRunning
  const helpOpenRef = useRef(isShortcutsHelpOpen)
  helpOpenRef.current = isShortcutsHelpOpen
  const handleNewTaskRef = useRef(handleNewTask)
  handleNewTaskRef.current = handleNewTask

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // 1. Never steal keys from a text field.
      if (isTypingTarget(e.target)) return
      // 2. Never steal a browser or OS shortcut (Ctrl+R, Ctrl+S, Ctrl+N, ...).
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // 3. A modal dialog owns the keyboard while it is open.
      if (hasOpenDialog() && e.code !== 'Escape') return

      // Space: start/pause the timer — but let a focused button handle it.
      if (e.code === 'Space') {
        if (isActivatable(e.target)) return
        e.preventDefault()
        if (isRunningRef.current) {
          pomodoro.handlePause()
        } else {
          playStart()
          pomodoro.handleStart()
        }
        return
      }

      // Reset timer (R)
      if (e.code === 'KeyR') {
        e.preventDefault()
        pomodoro.handleReset()
        return
      }

      // Skip interval (S). ArrowRight only skips while a timer is running —
      // otherwise it would stop the Dashboard category carousel from scrolling.
      if (e.code === 'KeyS' || (e.code === 'ArrowRight' && isRunningRef.current)) {
        e.preventDefault()
        pomodoro.handleSkip()
        return
      }

      // Navigation shortcuts
      switch (e.code) {
        case 'KeyH':
          e.preventDefault()
          if (location.pathname !== '/home') navigate('/home', { replace: true })
          return
        case 'Digit1':
          e.preventDefault()
          if (location.pathname !== '/') navigate('/', { replace: true })
          return
        case 'Digit2':
          e.preventDefault()
          if (location.pathname !== '/board') navigate('/board', { replace: true })
          return
        case 'Digit3':
          e.preventDefault()
          if (location.pathname !== '/bookmarks') navigate('/bookmarks', { replace: true })
          return
        case 'Digit4':
          e.preventDefault()
          if (location.pathname !== '/pomodoro') navigate('/pomodoro', { replace: true })
          return
        case 'Digit5':
          e.preventDefault()
          if (location.pathname !== '/settings') navigate('/settings', { replace: true })
          return
      }

      // N shortcut for new task
      if (e.code === 'KeyN' || e.key === 'n') {
        e.preventDefault()
        handleNewTaskRef.current()
        return
      }

      // ? for keyboard shortcuts help
      if (e.key === '?') {
        e.preventDefault()
        openShortcutsHelp()
        return
      }

      // Escape: close the shortcuts help. Dialogs handle their own Escape.
      if (e.code === 'Escape' && helpOpenRef.current) {
        closeShortcutsHelp()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    navigate,
    location.pathname,
    pomodoro.handleStart,
    pomodoro.handlePause,
    pomodoro.handleReset,
    pomodoro.handleSkip,
    openShortcutsHelp,
    closeShortcutsHelp,
  ])

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        openShortcutsHelp,
        closeShortcutsHelp,
        isShortcutsHelpOpen,
      }}
    >
      {children}
    </KeyboardShortcutsContext.Provider>
  )
}

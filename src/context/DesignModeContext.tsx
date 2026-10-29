import { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type DesignMode = 'commander' | 'pixel-center'

interface DesignModeContextType {
  mode: DesignMode
  setMode: (mode: DesignMode) => void
  toggleMode: () => void
  animationsEnabled: boolean
  setAnimationsEnabled: (enabled: boolean) => void
}

const DesignModeContext = createContext<DesignModeContextType>({
  mode: 'pixel-center',
  setMode: () => {},
  toggleMode: () => {},
  animationsEnabled: true,
  setAnimationsEnabled: () => {},
})

export function useDesignMode() {
  return useContext(DesignModeContext)
}

/** Theme colours mirrored from src/index.css — used for the browser chrome. */
const THEME_COLORS: Record<DesignMode, string> = {
  'pixel-center': '#f6f1e7',
  commander: '#1a1a2e',
}

export function DesignModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<DesignMode>(() => {
    try {
      const saved = localStorage.getItem('design-mode')
      // Pixel Center is the product default; Commander is opt-in.
      return (saved === 'commander' ? 'commander' : 'pixel-center') as DesignMode
    } catch {
      return 'pixel-center'
    }
  })

  const [animationsEnabled, setAnimationsEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pixel_animations_enabled')
      if (saved !== null) return saved === 'true'
    } catch {}
    // The OS "reduce motion" preference sets the default; the user can still
    // override it explicitly with the toggle in Settings.
    try {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
    } catch {}
    return true
  })

  useEffect(() => {
    try {
      localStorage.setItem('design-mode', mode)
    } catch {}
    document.documentElement.classList.remove('mode-commander', 'mode-pixel-center')
    document.documentElement.classList.add(`mode-${mode}`)
    // Keep the browser / PWA chrome in step with the active skin.
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', THEME_COLORS[mode])
  }, [mode])

  useEffect(() => {
    try {
      localStorage.setItem('pixel_animations_enabled', animationsEnabled ? 'true' : 'false')
    } catch {}
    if (animationsEnabled) {
      document.documentElement.classList.remove('stop-animations')
    } else {
      document.documentElement.classList.add('stop-animations')
    }
  }, [animationsEnabled])

  const toggleMode = useCallback(() => {
    setMode(prev => (prev === 'commander' ? 'pixel-center' : 'commander'))
  }, [])

  const setAnimationsEnabled = useCallback((enabled: boolean) => {
    setAnimationsEnabledState(enabled)
  }, [])

  return (
    <DesignModeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        animationsEnabled,
        setAnimationsEnabled,
      }}
    >
      {children}
    </DesignModeContext.Provider>
  )
}

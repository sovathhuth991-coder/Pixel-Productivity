import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

type WallpaperType = 'css-scene' | 'image' | 'video'

type AmbientSoundName = 'rain' | 'fire' | 'wind' | 'whitenoise'

interface WallpaperState {
  /** Which wallpaper source is active */
  wallpaperType: WallpaperType
  /** Key for the active CSS scene */
  cssScene: string
  /** Custom image URL */
  imageUrl: string
  /** Custom video URL (mp4 loop) */
  videoUrl: string
  /** Darkness overlay opacity, 0.0–0.8 */
  overlayOpacity: number

  /** YouTube video ID for background music */
  youtubeVideoId: string
  /** YouTube player volume, 0–100 */
  youtubeVolume: number
  /** Whether YouTube audio is currently playing */
  isYoutubePlaying: boolean
  /** Per-sound volume levels, 0–1 */
  ambientSounds: Record<AmbientSoundName, number>
}

interface WallpaperContextValue extends WallpaperState {
  setWallpaperType: (type: WallpaperType) => void
  setCssScene: (scene: string) => void
  setImageUrl: (url: string) => void
  setVideoUrl: (url: string) => void
  setOverlayOpacity: (opacity: number) => void
  setYoutubeVideoId: (id: string) => void
  setYoutubeVolume: (volume: number) => void
  setIsYoutubePlaying: (playing: boolean) => void
  setAmbientSounds: (sounds: Record<AmbientSoundName, number>) => void
  /** Convenience setter — sets both the wallpaper type and the relevant URL/scene */
  setWallpaper: (type: WallpaperType, value: string) => void
}

// ── Defaults ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pixel_wallpaper_settings'

const DEFAULT_STATE: WallpaperState = {
  wallpaperType: 'css-scene',
  cssScene: 'cozy-rain',
  imageUrl: '',
  videoUrl: '',
  overlayOpacity: 0.2,

  youtubeVideoId: 'jfKfPfyJRdk',
  youtubeVolume: 30,
  isYoutubePlaying: false,
  ambientSounds: {
    rain: 0,
    fire: 0,
    wind: 0,
    whitenoise: 0,
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────

function loadFromStorage(): WallpaperState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WallpaperState>
      return { ...DEFAULT_STATE, ...parsed }
    }
  } catch {
    // Corrupted data — fall back to defaults
  }
  return DEFAULT_STATE
}

function saveToStorage(state: WallpaperState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

// ── Context ────────────────────────────────────────────────────────────────

const WallpaperContext = createContext<WallpaperContextValue | null>(null)

// ── Provider ───────────────────────────────────────────────────────────────

export function WallpaperProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WallpaperState>(() => loadFromStorage())

  // Persist every state change to localStorage
  useEffect(() => {
    saveToStorage(state)
  }, [state])

  // ── Individual setters ─────────────────────────────────────────────────

  const setWallpaperType = useCallback(
    (type: WallpaperType) => setState((prev) => ({ ...prev, wallpaperType: type })),
    [],
  )

  const setCssScene = useCallback(
    (scene: string) => setState((prev) => ({ ...prev, cssScene: scene })),
    [],
  )

  const setImageUrl = useCallback(
    (url: string) => setState((prev) => ({ ...prev, imageUrl: url })),
    [],
  )

  const setVideoUrl = useCallback(
    (url: string) => setState((prev) => ({ ...prev, videoUrl: url })),
    [],
  )

  const setOverlayOpacity = useCallback(
    (opacity: number) =>
      setState((prev) => ({ ...prev, overlayOpacity: Math.min(0.8, Math.max(0, opacity)) })),
    [],
  )

  const setYoutubeVideoId = useCallback(
    (id: string) => setState((prev) => ({ ...prev, youtubeVideoId: id })),
    [],
  )

  const setYoutubeVolume = useCallback(
    (volume: number) =>
      setState((prev) => ({ ...prev, youtubeVolume: Math.min(100, Math.max(0, volume)) })),
    [],
  )

  const setIsYoutubePlaying = useCallback(
    (playing: boolean) => setState((prev) => ({ ...prev, isYoutubePlaying: playing })),
    [],
  )

  const setAmbientSounds = useCallback(
    (sounds: Record<AmbientSoundName, number>) =>
      setState((prev) => ({ ...prev, ambientSounds: sounds })),
    [],
  )

  // ── Convenience setter ─────────────────────────────────────────────────

  const setWallpaper = useCallback((type: WallpaperType, value: string) => {
    setState((prev) => {
      const next = { ...prev, wallpaperType: type }
      switch (type) {
        case 'css-scene':
          next.cssScene = value
          break
        case 'image':
          next.imageUrl = value
          break
        case 'video':
          next.videoUrl = value
          break
      }
      return next
    })
  }, [])

  // ── Value ──────────────────────────────────────────────────────────────

  const value: WallpaperContextValue = {
    ...state,
    setWallpaperType,
    setCssScene,
    setImageUrl,
    setVideoUrl,
    setOverlayOpacity,
    setYoutubeVideoId,
    setYoutubeVolume,
    setIsYoutubePlaying,
    setAmbientSounds,
    setWallpaper,
  }

  return <WallpaperContext.Provider value={value}>{children}</WallpaperContext.Provider>
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useWallpaperContext(): WallpaperContextValue {
  const ctx = useContext(WallpaperContext)
  if (!ctx) {
    throw new Error('useWallpaperContext must be used within a <WallpaperProvider>')
  }
  return ctx
}

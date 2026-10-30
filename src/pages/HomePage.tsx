import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useWallpaperContext } from '../context/WallpaperContext'
import { usePomodoroContext } from '../context/PomodoroContext'
import { useTaskContext } from '../context/TaskContext'
import { useDesignMode } from '../context/DesignModeContext'
import { CSS_SCENES, CssScene } from '../components/wallpaper/CssScenes'
import { AmbientPlayerUI } from '../components/wallpaper/AmbientPlayer'
import PixelIcon from '../components/ui/PixelIcon'
import { safeHttpUrl } from '../utils/url'

// ─── Small helpers ────────────────────────────────────────────────────────

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getGreeting(hour: number): { title: string; sub: string } {
  if (hour < 5) return { title: 'Still up?', sub: 'The world is quiet. Make one small thing happen.' }
  if (hour < 12) return { title: 'Good morning', sub: 'A fresh page. Pick the first small win.' }
  if (hour < 17) return { title: 'Good afternoon', sub: 'Keep the momentum gentle and steady.' }
  if (hour < 23) return { title: 'Good evening', sub: 'Quiet evening. One focus session, then rest.' }
  return { title: 'Good night', sub: 'Wind down. Tomorrow can wait a few more minutes.' }
}

const SCENE_SWATCH: Record<string, string> = {
  'cozy-rain': 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 60%, #c47a4a 100%)',
  starfield: 'linear-gradient(135deg, #020010 0%, #0a0a2e 55%, #5b2a7a 100%)',
  aurora: 'linear-gradient(135deg, #020012 0%, #0a2a3a 50%, #38d9a9 100%)',
  sunset: 'linear-gradient(135deg, #1a0533 0%, #b7472a 55%, #f4a742 100%)',
  forest: 'linear-gradient(135deg, #071a0e 0%, #0f3321 55%, #6b8f5a 100%)',
}

// ─── Wallpaper drawer ─────────────────────────────────────────────────────

type DrawerTab = 'scenes' | 'image' | 'video' | 'display'

function WallpaperDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    wallpaperType,
    cssScene,
    imageUrl,
    videoUrl,
    overlayOpacity,
    setWallpaper,
    setImageUrl,
    setVideoUrl,
    setWallpaperType,
    setOverlayOpacity,
  } = useWallpaperContext()
  const { animationsEnabled, setAnimationsEnabled } = useDesignMode()

  const [tab, setTab] = useState<DrawerTab>('scenes')
  const [imageDraft, setImageDraft] = useState(imageUrl)
  const [videoDraft, setVideoDraft] = useState(videoUrl)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setImageDraft(imageUrl)
    setVideoDraft(videoUrl)
    setError('')
  }, [open, imageUrl, videoUrl])

  const applyMedia = (kind: 'image' | 'video') => {
    const raw = kind === 'image' ? imageDraft : videoDraft
    const safe = safeHttpUrl(raw)
    if (!safe) {
      setError('Use a full http(s) URL, for example https://…')
      return
    }
    setError('')
    if (kind === 'image') {
      setImageUrl(safe)
      setWallpaperType('image')
    } else {
      setVideoUrl(safe)
      setWallpaperType('video')
    }
  }

  const resetWallpaper = () => {
    setWallpaper('css-scene', 'cozy-rain')
    setImageUrl('')
    setVideoUrl('')
    setOverlayOpacity(0.2)
    setError('')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label="Wallpaper settings"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.18 }}
          className="absolute right-3 top-3 z-40 w-[min(22rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-1.5rem)] overflow-y-auto border-2 border-white/15 bg-[#0b0d16]/95 p-3 text-white shadow-2xl backdrop-blur-xl md:right-6 md:top-6"
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <PixelIcon name="pencil" size={16} className="text-[#f5c542]" />
              <span className="font-pixel text-caption">WALLPAPER</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close wallpaper settings"
              className="font-pixel text-caption px-2 py-1 text-white/60 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1">
            {(['scenes', 'image', 'video', 'display'] as DrawerTab[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError('') }}
                className={`font-pixel text-[7px] py-1.5 border transition-colors ${
                  tab === t
                    ? 'border-[#f5c542] text-[#f5c542] bg-[#f5c542]/10'
                    : 'border-white/10 text-white/45 hover:text-white/80'
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {tab === 'scenes' && (
            <div className="mt-3 space-y-2">
              {CSS_SCENES.map(scene => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => { setWallpaper('css-scene', scene.id); setError('') }}
                  className={`w-full flex items-center gap-3 p-2 border text-left transition-colors ${
                    wallpaperType === 'css-scene' && cssScene === scene.id
                      ? 'border-[#f5c542] bg-[#f5c542]/10'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <span
                    className="h-9 w-14 shrink-0 border border-white/15"
                    style={{ background: SCENE_SWATCH[scene.id] }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block font-pixel text-[9px] text-white/90">{scene.name}</span>
                    <span className="mt-1 block font-pixel text-[7px] leading-relaxed text-white/45">
                      {scene.preview}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {tab === 'image' && (
            <div className="mt-3 space-y-2">
              <p className="font-pixel text-[8px] leading-relaxed text-white/50">
                Paste an image URL. It is stored only in this browser.
              </p>
              <input
                type="url"
                value={imageDraft}
                onChange={e => setImageDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') applyMedia('image') }}
                placeholder="https://example.com/wallpaper.jpg"
                aria-label="Image wallpaper URL"
                className="w-full bg-black/40 border border-white/15 px-2 py-2 font-pixel text-[9px] text-white placeholder:text-white/25 outline-none focus:border-[#f5c542]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => applyMedia('image')}
                  className="flex-1 font-pixel text-[8px] py-2 border border-[#f5c542] text-[#f5c542] hover:bg-[#f5c542]/10"
                >
                  APPLY IMAGE
                </button>
                <button
                  type="button"
                  onClick={() => { setImageUrl(''); setWallpaper('css-scene', cssScene) }}
                  className="font-pixel text-[8px] px-2 py-2 border border-white/15 text-white/45 hover:text-white"
                >
                  CLEAR
                </button>
              </div>
            </div>
          )}

          {tab === 'video' && (
            <div className="mt-3 space-y-2">
              <p className="font-pixel text-[8px] leading-relaxed text-white/50">
                Paste a direct video URL (mp4/webm). It loops silently in the background.
              </p>
              <input
                type="url"
                value={videoDraft}
                onChange={e => setVideoDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') applyMedia('video') }}
                placeholder="https://example.com/loop.mp4"
                aria-label="Video wallpaper URL"
                className="w-full bg-black/40 border border-white/15 px-2 py-2 font-pixel text-[9px] text-white placeholder:text-white/25 outline-none focus:border-[#f5c542]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => applyMedia('video')}
                  className="flex-1 font-pixel text-[8px] py-2 border border-[#f5c542] text-[#f5c542] hover:bg-[#f5c542]/10"
                >
                  APPLY VIDEO
                </button>
                <button
                  type="button"
                  onClick={() => { setVideoUrl(''); setWallpaper('css-scene', cssScene) }}
                  className="font-pixel text-[8px] px-2 py-2 border border-white/15 text-white/45 hover:text-white"
                >
                  CLEAR
                </button>
              </div>
            </div>
          )}

          {tab === 'display' && (
            <div className="mt-3 space-y-4">
              <label className="block space-y-2">
                <span className="flex items-center justify-between font-pixel text-[8px] text-white/60">
                  <span>DARKEN WALLPAPER</span>
                  <span className="font-mono text-base text-[#f5c542]">
                    {Math.round(overlayOpacity * 100)}%
                  </span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={Math.round(overlayOpacity * 100)}
                  onChange={e => setOverlayOpacity(Number(e.target.value) / 100)}
                  className="w-full accent-[#f5c542]"
                />
              </label>

              <label className="flex items-center justify-between gap-3 font-pixel text-[8px] text-white/60">
                <span>ANIMATE WALLPAPER</span>
                <input
                  type="checkbox"
                  checked={animationsEnabled}
                  onChange={e => setAnimationsEnabled(e.target.checked)}
                  className="h-4 w-4 accent-[#f5c542]"
                />
              </label>

              <button
                type="button"
                onClick={resetWallpaper}
                className="w-full font-pixel text-[8px] py-2 border border-white/15 text-white/50 hover:text-white"
              >
                RESET TO COZY RAIN
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-2 font-pixel text-[8px] text-red-300">
              {error}
            </p>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

// ─── Focus card (desktop) ─────────────────────────────────────────────────

function FocusCard() {
  const { timeLeft, isRunning, mode, handleStart, handlePause } = usePomodoroContext()
  const label = mode === 'work' ? 'FOCUS' : mode === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK'

  return (
    <div className="absolute right-6 top-24 z-20 hidden w-56 border border-white/15 bg-black/40 p-4 text-white shadow-xl backdrop-blur-md md:block">
      <div className="flex items-center justify-between">
        <span className="font-pixel text-[7px] text-white/50">{label}</span>
        {isRunning && <span className="h-1.5 w-1.5 bg-[#f5c542] animate-pulse" aria-hidden="true" />}
      </div>
      <div className="mt-1 font-mono text-5xl leading-none tabular-nums">{formatTimer(timeLeft)}</div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={isRunning ? handlePause : handleStart}
          className="flex-1 font-pixel text-[8px] py-2 border border-[#f5c542] text-[#f5c542] hover:bg-[#f5c542]/10"
        >
          {isRunning ? 'PAUSE' : 'START'}
        </button>
        <Link
          to="/pomodoro"
          className="font-pixel text-[8px] px-2 py-2 border border-white/15 text-white/55 hover:text-white"
        >
          OPEN
        </Link>
      </div>
    </div>
  )
}

// ─── Home page ────────────────────────────────────────────────────────────

export default function HomePage() {
  const {
    wallpaperType,
    cssScene,
    imageUrl,
    videoUrl,
    overlayOpacity,
    setIsYoutubePlaying,
  } = useWallpaperContext()
  const { timeLeft, isRunning, mode } = usePomodoroContext()
  const { getStats } = useTaskContext()

  const [now, setNow] = useState(() => new Date())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [mediaFailed, setMediaFailed] = useState(false)

  const imageSrc = safeHttpUrl(imageUrl)
  const videoSrc = safeHttpUrl(videoUrl)
  const stats = getStats()

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const previous = document.title
    document.title = 'Pixel Productivity — Home'
    return () => { document.title = previous }
  }, [])

  // Do not leave a "playing" flag behind when the user leaves the home screen:
  // the YouTube player unmounts with this page.
  useEffect(() => () => setIsYoutubePlaying(false), [setIsYoutubePlaying])

  useEffect(() => {
    setMediaFailed(false)
  }, [wallpaperType, imageUrl, videoUrl])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const hours24 = now.getHours()
  const hours12 = hours24 % 12 || 12
  const clock = `${String(hours12).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const ampm = hours24 >= 12 ? 'PM' : 'AM'
  const date = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const greeting = useMemo(() => getGreeting(hours24), [hours24])
  const activeScene = CSS_SCENES.some(scene => scene.id === cssScene) ? cssScene : 'cozy-rain'
  const validType =
    wallpaperType === 'css-scene' || wallpaperType === 'image' || wallpaperType === 'video'

  const showScene =
    !validType ||
    mediaFailed ||
    wallpaperType === 'css-scene' ||
    (wallpaperType === 'image' && !imageSrc) ||
    (wallpaperType === 'video' && !videoSrc)

  const focusLabel = mode === 'work' ? 'FOCUS' : mode === 'shortBreak' ? 'BREAK' : 'LONG BREAK'

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    window.open(
      `https://www.google.com/search?q=${encodeURIComponent(q)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-[#05070f] text-white">
      {/* Wallpaper layer */}
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {showScene ? (
            <motion.div
              key={`scene-${activeScene}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="wallpaper-scene absolute inset-0"
            >
              <CssScene sceneName={activeScene} />
            </motion.div>
          ) : wallpaperType === 'image' && imageSrc ? (
            <motion.img
              key={`image-${imageSrc}`}
              src={imageSrc}
              alt=""
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              onError={() => setMediaFailed(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : wallpaperType === 'video' && videoSrc ? (
            <motion.video
              key={`video-${videoSrc}`}
              src={videoSrc}
              autoPlay
              muted
              loop
              playsInline
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              onError={() => setMediaFailed(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
        </AnimatePresence>

        <div
          className="absolute inset-0 bg-[#03050c]"
          style={{ opacity: overlayOpacity }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/75" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.35) 100%)',
          }}
          aria-hidden="true"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="flex w-full min-w-0 items-center justify-between gap-2 p-4 md:p-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <PixelIcon name="gamepad" size={22} className="shrink-0 text-[#f5c542]" />
            <span className="truncate font-pixel text-[10px] tracking-wide text-white/85 md:text-caption">
              PIXEL PROD
            </span>
            <span className="hidden font-pixel text-[8px] text-white/35 sm:inline">/ HOME</span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/pomodoro"
              className="hidden items-center gap-2 border border-white/15 bg-black/30 px-2.5 py-1.5 backdrop-blur-md hover:border-white/35 sm:flex"
              title="Open the focus timer"
            >
              <PixelIcon name="tomato" size={14} className="text-[#f5c542]" />
              <span className="font-mono text-lg leading-none tabular-nums">{formatTimer(timeLeft)}</span>
              <span className="hidden font-pixel text-[7px] text-white/45 sm:inline">{focusLabel}</span>
            </Link>
            <Link
              to="/pomodoro"
              aria-label="Open focus timer"
              className="flex h-9 w-9 items-center justify-center border border-white/15 bg-black/30 sm:hidden"
            >
              <PixelIcon name="tomato" size={16} className="text-[#f5c542]" />
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Wallpaper settings"
              className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/15 bg-black/30 text-white/70 backdrop-blur-md hover:border-white/35 hover:text-white"
            >
              <PixelIcon name="gear" size={16} />
            </button>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-12 text-center">
          <div className="select-none">
            <div className="flex items-start justify-center font-mono text-[clamp(4.5rem,16vw,9rem)] leading-[0.85] tracking-tight drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)]">
              <span>{clock}</span>
              <span className="ml-2 mt-3 font-pixel text-[clamp(0.65rem,1.8vw,0.95rem)] text-white/65">
                {ampm}
              </span>
            </div>
            <div className="mt-4 font-pixel text-[9px] uppercase tracking-[0.22em] text-white/65 md:text-caption">
              {date}
            </div>
          </div>

          <div className="mt-8 w-full md:mt-10">
            <h1 className="w-full font-pixel-center text-3xl text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.65)] md:text-5xl">
              {greeting.title}
            </h1>
            <p className="mx-auto mt-2 w-full max-w-md break-words px-2 font-pixel text-[9px] leading-relaxed text-white/55 md:text-caption">
              {greeting.sub}
            </p>
          </div>

          <form onSubmit={handleSearch} className="mx-auto mt-8 w-full max-w-md" role="search">
            <div className="flex items-center gap-2 border border-white/20 bg-black/35 px-3 py-2 backdrop-blur-md focus-within:border-white/45">
              <PixelIcon name="search" size={14} className="shrink-0 text-white/45" />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search the web"
                aria-label="Search the web"
                // The global pixel-center input rule paints inputs with
                // --input-fill; inline style wins over that rule.
                style={{ backgroundColor: 'transparent', color: '#ffffff' }}
                className="min-w-0 flex-1 appearance-none border-0 bg-transparent font-pixel text-caption text-white placeholder:text-white/30 outline-none"
              />
              <button
                type="submit"
                aria-label="Search"
                className="font-pixel text-[9px] text-white/45 hover:text-white"
              >
                ↵
              </button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 font-pixel text-[8px] text-white/45">
            <span>{stats.pending} OPEN</span>
            <span aria-hidden="true">•</span>
            <span>{stats.completed} DONE</span>
            <span aria-hidden="true">•</span>
            <Link to="/stats" className="hover:text-white/80">
              {stats.progress}% DONE
            </Link>
          </div>
        </main>

        <footer className="flex items-end justify-between gap-4 p-4 pb-20 pr-24 md:p-6 md:pr-24">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="border border-white/15 bg-black/30 px-3 py-2 font-pixel text-[9px] text-white/75 backdrop-blur-md hover:border-white/35 hover:text-white"
            >
              ← TASKS
            </Link>
            <Link
              to="/board"
              className="hidden border border-white/15 bg-black/30 px-3 py-2 font-pixel text-[9px] text-white/55 backdrop-blur-md hover:border-white/35 hover:text-white sm:inline"
            >
              BOARD
            </Link>
          </div>
          <span className="hidden font-pixel text-[7px] text-white/25 sm:block">
            {isRunning ? 'FOCUS SESSION RUNNING' : 'TAKE A BREATH'}
          </span>
        </footer>
      </div>

      <FocusCard />
      <AmbientPlayerUI />
      <WallpaperDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}

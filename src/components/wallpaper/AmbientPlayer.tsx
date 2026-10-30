import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallpaperContext } from '../../context/WallpaperContext'

// ── YouTube IFrame API types ───────────────────────────────────────────────
//
// Only the handful of methods this component calls. Defining them locally
// avoids pulling in @types/youtube just for the audio widget.

interface YouTubePlayer {
  playVideo(): void
  pauseVideo(): void
  setVolume(volume: number): void
  destroy(): void
}

interface YouTubePlayerConfig {
  videoId: string
  host?: string
  playerVars?: Record<string, string | number>
  events?: {
    onReady?: () => void
    onError?: () => void
  }
}

interface YouTubeNamespace {
  Player: new (
    element: string | HTMLElement,
    options: YouTubePlayerConfig,
  ) => YouTubePlayer
}

declare global {
  interface Window {
    YT?: YouTubeNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Load the YouTube IFrame API script once */
function ensureYouTubeAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.YT && window.YT.Player) {
      resolve()
      return
    }

    // Check if the script tag already exists
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      // Script injected but not ready yet — wait for callback
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        resolve()
      }
      return
    }

    window.onYouTubeIframeAPIReady = () => resolve()

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.async = true
    tag.onerror = () => reject(new Error('Failed to load YouTube IFrame API'))
    document.head.appendChild(tag)
  })
}

// ── Ambient sound node types ───────────────────────────────────────────────

type AmbientSoundName = 'rain' | 'fire' | 'wind' | 'whitenoise'

interface NoiseNodes {
  source: AudioBufferSourceNode
  filter: BiquadFilterNode
  gain: GainNode
  /** Optional LFO oscillator for modulation */
  lfo?: OscillatorNode
  lfoGain?: GainNode
}

// ── Noise buffer generators ────────────────────────────────────────────────

function createWhiteNoiseBuffer(ctx: AudioContext, durationSec = 4): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const length = sampleRate * durationSec
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

function createBrownNoiseBuffer(ctx: AudioContext, durationSec = 4): AudioBuffer {
  const sampleRate = ctx.sampleRate
  const length = sampleRate * durationSec
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  let lastOut = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    lastOut = (lastOut + 0.02 * white) / 1.02
    data[i] = lastOut * 3.5 // compensate for volume loss
  }
  return buffer
}

// ── Procedural ambient sound factory ───────────────────────────────────────

function createAmbientNodes(
  ctx: AudioContext,
  name: AmbientSoundName,
  volume: number,
): NoiseNodes {
  let buffer: AudioBuffer
  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  gain.gain.value = volume

  let lfo: OscillatorNode | undefined
  let lfoGain: GainNode | undefined

  switch (name) {
    case 'rain': {
      buffer = createWhiteNoiseBuffer(ctx)
      filter.type = 'lowpass'
      filter.frequency.value = 4000
      filter.Q.value = 1
      break
    }
    case 'fire': {
      buffer = createBrownNoiseBuffer(ctx)
      filter.type = 'bandpass'
      filter.frequency.value = 500
      filter.Q.value = 0.5
      break
    }
    case 'wind': {
      buffer = createWhiteNoiseBuffer(ctx)
      filter.type = 'bandpass'
      filter.frequency.value = 250
      filter.Q.value = 0.7

      // Slow LFO to modulate filter cutoff
      lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 0.15 // very slow modulation
      lfoGain = ctx.createGain()
      lfoGain.gain.value = 150 // modulates ±150 Hz around 250
      lfo.connect(lfoGain)
      lfoGain.connect(filter.frequency)
      lfo.start()
      break
    }
    case 'whitenoise': {
      buffer = createWhiteNoiseBuffer(ctx)
      filter.type = 'lowpass'
      filter.frequency.value = 12000
      filter.Q.value = 0
      break
    }
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true

  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  source.start()

  return { source, filter, gain, lfo, lfoGain }
}

function destroyNoiseNodes(nodes: NoiseNodes): void {
  try {
    nodes.source.stop()
  } catch {
    /* may already be stopped */
  }
  nodes.source.disconnect()
  nodes.filter.disconnect()
  nodes.gain.disconnect()
  nodes.lfo?.stop()
  nodes.lfo?.disconnect()
  nodes.lfoGain?.disconnect()
}

// ── YouTube Player Hook ────────────────────────────────────────────────────

function useYouTubePlayer(
  videoId: string,
  volume: number,
  isPlaying: boolean,
) {
  const playerRef = useRef<YouTubePlayer | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [ytAvailable, setYtAvailable] = useState<boolean | null>(null) // null = loading

  // Initialize YouTube player
  useEffect(() => {
    let cancelled = false
    let player: YouTubePlayer | null = null

    const init = async () => {
      try {
        await ensureYouTubeAPI()
        if (cancelled || !containerRef.current) return

        // Create a child div for the player (YT replaces the element)
        const el = document.createElement('div')
        el.id = 'yt-ambient-player'
        containerRef.current.appendChild(el)

        const YT = window.YT
        if (!YT) throw new Error('YouTube IFrame API unavailable')

        player = new YT.Player(el.id, {
          videoId,
          // Privacy-enhanced host: less cross-site state than youtube.com.
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            loop: 1,
            playlist: videoId, // required for loop to work
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (cancelled) return
              playerRef.current = player
              setYtAvailable(true)
              player!.setVolume(volume)
              if (isPlaying) {
                player!.playVideo()
              }
            },
            onError: () => {
              if (!cancelled) setYtAvailable(false)
            },
          },
        })
      } catch {
        if (!cancelled) setYtAvailable(false)
      }
    }

    init()

    return () => {
      cancelled = true
      if (player) {
        try {
          player.destroy()
        } catch {
          /* ignore */
        }
      }
      playerRef.current = null
      // Clear container children
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
    // Re-init when videoId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  // Sync volume
  useEffect(() => {
    if (playerRef.current && ytAvailable) {
      try {
        playerRef.current.setVolume(volume)
      } catch {
        /* player may not be ready */
      }
    }
  }, [volume, ytAvailable])

  // Sync play/pause
  useEffect(() => {
    if (playerRef.current && ytAvailable) {
      try {
        if (isPlaying) {
          playerRef.current.playVideo()
        } else {
          playerRef.current.pauseVideo()
        }
      } catch {
        /* player may not be ready */
      }
    }
  }, [isPlaying, ytAvailable])

  return { containerRef, ytAvailable }
}

// ── Ambient Sound Engine Hook ──────────────────────────────────────────────

function useAmbientSoundEngine(
  ambientSounds: Record<AmbientSoundName, number>,
) {
  const ctxRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef<Partial<Record<AmbientSoundName, NoiseNodes>>>({})

  const getOrCreateContext = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }
    // Resume if suspended (browser autoplay policy)
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  // Sync each ambient sound
  useEffect(() => {
    const names: AmbientSoundName[] = ['rain', 'fire', 'wind', 'whitenoise']
    const currentNodes = nodesRef.current

    for (const name of names) {
      const vol = ambientSounds[name]
      const existing = currentNodes[name]

      if (vol > 0 && existing) {
        // Update gain
        existing.gain.gain.setTargetAtTime(vol, existing.gain.context.currentTime, 0.1)
      } else if (vol > 0 && !existing) {
        // Create nodes
        const ctx = getOrCreateContext()
        currentNodes[name] = createAmbientNodes(ctx, name, vol)
      } else if (vol === 0 && existing) {
        // Tear down
        destroyNoiseNodes(existing)
        delete currentNodes[name]
      }
    }
  }, [ambientSounds, getOrCreateContext])

  // Clean up everything on unmount
  useEffect(() => {
    return () => {
      const currentNodes = nodesRef.current
      for (const name of Object.keys(currentNodes) as AmbientSoundName[]) {
        const n = currentNodes[name]
        if (n) destroyNoiseNodes(n)
      }
      nodesRef.current = {}
      if (ctxRef.current) {
        ctxRef.current.close()
        ctxRef.current = null
      }
    }
  }, [])
}

// ── AmbientPlayerUI Component ──────────────────────────────────────────────

const AMBIENT_SOUNDS_META: { name: AmbientSoundName; emoji: string; label: string }[] = [
  { name: 'rain', emoji: '🌧️', label: 'Rain' },
  { name: 'fire', emoji: '🔥', label: 'Fire' },
  { name: 'wind', emoji: '💨', label: 'Wind' },
  { name: 'whitenoise', emoji: '📻', label: 'White Noise' },
]

export function AmbientPlayerUI() {
  const {
    youtubeVideoId,
    youtubeVolume,
    isYoutubePlaying,
    ambientSounds,
    setYoutubeVideoId,
    setYoutubeVolume,
    setIsYoutubePlaying,
    setAmbientSounds,
  } = useWallpaperContext()

  const [isExpanded, setIsExpanded] = useState(false)
  const [videoIdInput, setVideoIdInput] = useState(youtubeVideoId)

  // Keep local input in sync if context changes externally
  useEffect(() => {
    setVideoIdInput(youtubeVideoId)
  }, [youtubeVideoId])

  // YouTube player (hidden)
  const { containerRef, ytAvailable } = useYouTubePlayer(
    youtubeVideoId,
    youtubeVolume,
    isYoutubePlaying,
  )

  // Ambient sound engine
  useAmbientSoundEngine(ambientSounds)

  /** Commit the video ID from the input field */
  const handleVideoIdCommit = useCallback(() => {
    const trimmed = videoIdInput.trim()
    if (trimmed && trimmed !== youtubeVideoId) {
      setYoutubeVideoId(trimmed)
    }
  }, [videoIdInput, youtubeVideoId, setYoutubeVideoId])

  /** Helper to set a single ambient sound volume */
  const setAmbientSound = useCallback(
    (name: AmbientSoundName, volume: number) => {
      setAmbientSounds({ ...ambientSounds, [name]: volume })
    },
    [ambientSounds, setAmbientSounds],
  )

  return (
    <>
      {/* Hidden YouTube player container */}
      <div
        ref={containerRef}
        className="fixed -left-[9999px] -top-[9999px] h-px w-px overflow-hidden opacity-0 pointer-events-none"
        aria-hidden="true"
      />

      {/* Floating control panel */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-black/70 backdrop-blur-md border-2 border-white/10 rounded-lg p-3 w-64 shadow-xl"
            >
              {/* ── YouTube Section ────────────────────────────── */}
              <div className="mb-3">
                <p
                  className="text-white/60 mb-2 uppercase tracking-wider"
                  style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '7px' }}
                >
                  🎵 Music
                </p>

                {/* Play / Pause + Volume */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setIsYoutubePlaying(!isYoutubePlaying)}
                    className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded transition-colors text-sm"
                    title={isYoutubePlaying ? 'Pause' : 'Play'}
                  >
                    {isYoutubePlaying ? '⏸' : '▶️'}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={youtubeVolume}
                    onChange={(e) => setYoutubeVolume(Number(e.target.value))}
                    className="flex-1 h-1 accent-purple-400 cursor-pointer"
                    title={`Volume: ${youtubeVolume}%`}
                  />
                  <span
                    className="text-white/50 w-7 text-right tabular-nums"
                    style={{ fontFamily: "'VT323', monospace", fontSize: '13px' }}
                  >
                    {youtubeVolume}
                  </span>
                </div>

                {/* Video ID input */}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={videoIdInput}
                    onChange={(e) => setVideoIdInput(e.target.value)}
                    onBlur={handleVideoIdCommit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleVideoIdCommit()
                    }}
                    placeholder="YouTube Video ID"
                    className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-white/80 placeholder-white/30 outline-none focus:border-purple-400/50 transition-colors"
                    style={{ fontFamily: "'VT323', monospace", fontSize: '13px' }}
                  />
                </div>

                {/* YouTube availability status */}
                {ytAvailable === false && (
                  <p
                    className="text-red-400/70 mt-1"
                    style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '6px' }}
                  >
                    YouTube unavailable
                  </p>
                )}
              </div>

              {/* ── Divider ────────────────────────────────────── */}
              <div className="border-t border-white/10 my-2" />

              {/* ── Ambient Sounds Section ─────────────────────── */}
              <div>
                <p
                  className="text-white/60 mb-2 uppercase tracking-wider"
                  style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '7px' }}
                >
                  Ambient
                </p>

                <div className="flex flex-col gap-2">
                  {AMBIENT_SOUNDS_META.map(({ name, emoji, label }) => {
                    const vol = Math.round(ambientSounds[name] * 100)
                    return (
                      <div key={name} className="flex items-center gap-2">
                        <span className="text-sm w-5 text-center" title={label}>
                          {emoji}
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={vol}
                          onChange={(e) =>
                            setAmbientSound(name, Number(e.target.value) / 100)
                          }
                          className="flex-1 h-1 accent-emerald-400 cursor-pointer"
                          title={`${label}: ${vol}%`}
                        />
                        <span
                          className="text-white/50 w-7 text-right tabular-nums"
                          style={{ fontFamily: "'VT323', monospace", fontSize: '13px' }}
                        >
                          {vol}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsExpanded((prev) => !prev)}
          className="w-10 h-10 bg-black/60 backdrop-blur-md border-2 border-white/10 rounded-lg flex items-center justify-center text-lg shadow-lg hover:border-white/20 transition-colors"
          title={isExpanded ? 'Collapse audio panel' : 'Expand audio panel'}
        >
          🎵
        </motion.button>
      </div>
    </>
  )
}

export default AmbientPlayerUI

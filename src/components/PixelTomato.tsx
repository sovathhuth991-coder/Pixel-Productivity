import { useMemo } from 'react'
import { useDesignMode } from '../context/DesignModeContext'

interface PixelTomatoProps {
  mode: 'work' | 'shortBreak' | 'longBreak'
  isRunning: boolean
  progress: number
}

/**
 * Redesigned Focus Character: "Chrono-Bot" (Byte)
 * An expressive retro-cybernetic desktop focus droid that embodies deep work,
 * sprint stamina, and rejuvenating recharge breaks!
 */
export default function PixelTomato({ mode, isRunning, progress }: PixelTomatoProps) {
  const { animationsEnabled } = useDesignMode()
  const animationClass = isRunning && animationsEnabled ? 'animate-bounce-slow' : ''

  // Dynamic theme colors reflecting machine energy states
  const chassisColor = mode === 'work' ? '#1e293b' : mode === 'shortBreak' ? '#0f292f' : '#1e1b4b'
  const screenBg = mode === 'work' ? '#090d16' : mode === 'shortBreak' ? '#041b1d' : '#0d091e'
  const glowColor = mode === 'work' ? '#e94560' : mode === 'shortBreak' ? '#4ecdc4' : '#a855f7'
  const accentLight = mode === 'work' ? '#ff7b93' : mode === 'shortBreak' ? '#7ee8e0' : '#c084fc'
  const eyeColor = mode === 'work' ? '#38bdf8' : mode === 'shortBreak' ? '#22c55e' : '#e0e7ff'

  // Construct robot body pixels (18x18 grid)
  const robotPixels = useMemo(() => {
    const pixels: { x: number; y: number; color: string }[] = []

    // Pattern symbols:
    // 'A': Antenna tip (glowing)
    // 'a': Antenna stem
    // 'C': Chassis dark slate
    // 'H': Chassis metallic highlight
    // 'S': Visor Screen background
    // 'G': Glowing side ear lights / headphones
    // 'c': Core power pip / badge
    const pattern = [
      '      A    A      ', // 0: Dual antenna tips
      '      a    a      ', // 1: Antenna stems
      '   HHHHHHHHHHHH   ', // 2: Chassis top bevel
      '  HCCCHHHHHHCCCH  ', // 3: Chassis upper
      ' GCCCCSSSSSSCCCCG ', // 4: Ear pods + Screen top
      ' GCCCCSSSSSSCCCCG ', // 5: Ear pods + Screen
      ' GCCCCSSSSSSCCCCG ', // 6: Ear pods + Screen center
      ' GCCCCSSSSSSCCCCG ', // 7: Ear pods + Screen lower
      ' GCCCCSSSSSSCCCCG ', // 8: Ear pods + Screen bottom
      '  HCCCCCCCCCCCCH  ', // 9: Chin bevel
      '   HHHHcHHcHHHH   ', // 10: Neck collar with power pips
      '    CCCCCCCCCC    ', // 11: Torso upper
      '   CCCGGGGGGCCC   ', // 12: Torso chest plate / core vent
      '   CCCCcGGcCCCC   ', // 13: Torso core glowing crystal
      '   CCCCcGGcCCCC   ', // 14: Torso core
      '    CCCCCCCCCC    ', // 15: Torso base
      '     CCCCCCCCC    ', // 16: Base chassis
      '      HH    HH    ', // 17: Feet / treads
    ]

    pattern.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const char = row[x]
        if (char === ' ') continue

        let color = chassisColor
        if (char === 'A') color = isRunning ? accentLight : glowColor
        else if (char === 'a') color = '#64748b'
        else if (char === 'H') color = '#475569'
        else if (char === 'C') color = chassisColor
        else if (char === 'S') color = screenBg
        else if (char === 'G') color = glowColor
        else if (char === 'c') color = accentLight

        pixels.push({ x, y, color })
      }
    })

    return pixels
  }, [chassisColor, screenBg, glowColor, accentLight, isRunning])

  // Expressive Digital LED Visor Face
  const facePixels = useMemo(() => {
    const pixels: { x: number; y: number; color: string }[] = []

    if (mode === 'work') {
      // FOCUS MODE: Intense digital targeting visor with reticle pupils
      // Left eye reticle
      pixels.push({ x: 6, y: 5, color: eyeColor })
      pixels.push({ x: 7, y: 5, color: eyeColor })
      pixels.push({ x: 6, y: 6, color: eyeColor })
      pixels.push({ x: 7, y: 6, color: '#ffffff' }) // Pupil glint
      // Right eye reticle
      pixels.push({ x: 10, y: 5, color: eyeColor })
      pixels.push({ x: 11, y: 5, color: eyeColor })
      pixels.push({ x: 10, y: 6, color: '#ffffff' }) // Pupil glint
      pixels.push({ x: 11, y: 6, color: eyeColor })
      // Determined digital mouth: glowing frequency pulse
      pixels.push({ x: 7, y: 8, color: accentLight })
      pixels.push({ x: 8, y: 8, color: '#ffffff' })
      pixels.push({ x: 9, y: 8, color: '#ffffff' })
      pixels.push({ x: 10, y: 8, color: accentLight })
    } else if (mode === 'shortBreak') {
      // SHORT BREAK: Relaxed happy anime eyes ^_^ and chill smile
      // Left eye (^)
      pixels.push({ x: 6, y: 6, color: eyeColor })
      pixels.push({ x: 7, y: 5, color: eyeColor })
      pixels.push({ x: 8, y: 6, color: eyeColor })
      // Right eye (^)
      pixels.push({ x: 9, y: 6, color: eyeColor })
      pixels.push({ x: 10, y: 5, color: eyeColor })
      pixels.push({ x: 11, y: 6, color: eyeColor })
      // Happy open smile
      pixels.push({ x: 7, y: 7, color: '#ffffff' })
      pixels.push({ x: 8, y: 8, color: '#ffffff' })
      pixels.push({ x: 9, y: 8, color: '#ffffff' })
      pixels.push({ x: 10, y: 7, color: '#ffffff' })
    } else {
      // LONG BREAK: Low power sleep mode with horizontal sleep lines and Zzz
      // Left eye closed line
      pixels.push({ x: 6, y: 6, color: '#a5b4fc' })
      pixels.push({ x: 7, y: 6, color: '#a5b4fc' })
      pixels.push({ x: 8, y: 6, color: '#a5b4fc' })
      // Right eye closed line
      pixels.push({ x: 9, y: 6, color: '#a5b4fc' })
      pixels.push({ x: 10, y: 6, color: '#a5b4fc' })
      pixels.push({ x: 11, y: 6, color: '#a5b4fc' })
      // Relaxed breathing pip
      pixels.push({ x: 8, y: 8, color: '#c7d2fe' })
      pixels.push({ x: 9, y: 8, color: '#c7d2fe' })
    }

    return pixels
  }, [mode, eyeColor, accentLight])

  // Overclock sparks when working hard
  const sparkPixels = useMemo(() => {
    if (mode !== 'work' || !isRunning) return []
    const pixels: { x: number; y: number; color: string }[] = []
    // Cyber spark top right
    pixels.push({ x: 15, y: 3, color: '#facc15' })
    pixels.push({ x: 16, y: 4, color: '#ffffff' })
    pixels.push({ x: 15, y: 5, color: '#facc15' })
    // Secondary data pulse left
    pixels.push({ x: 1, y: 4, color: '#38bdf8' })
    pixels.push({ x: 2, y: 5, color: '#ffffff' })
    return pixels
  }, [mode, isRunning])

  // Sleep Zzz particles for long break
  const zzzPixels = useMemo(() => {
    if (mode !== 'longBreak') return []
    const pixels: { x: number; y: number; color: string }[] = []
    // Big Z
    pixels.push({ x: 14, y: 1, color: '#c084fc' })
    pixels.push({ x: 15, y: 1, color: '#c084fc' })
    pixels.push({ x: 16, y: 1, color: '#c084fc' })
    pixels.push({ x: 15, y: 2, color: '#c084fc' })
    pixels.push({ x: 14, y: 3, color: '#c084fc' })
    pixels.push({ x: 15, y: 3, color: '#c084fc' })
    pixels.push({ x: 16, y: 3, color: '#c084fc' })
    // Small z
    pixels.push({ x: 16, y: 5, color: '#a855f7' })
    pixels.push({ x: 17, y: 5, color: '#a855f7' })
    pixels.push({ x: 16, y: 6, color: '#a855f7' })
    pixels.push({ x: 17, y: 6, color: '#a855f7' })
    return pixels
  }, [mode])

  // Music stream particles for short break
  const musicPixels = useMemo(() => {
    if (mode !== 'shortBreak') return []
    const pixels: { x: number; y: number; color: string }[] = []
    // Note 1
    pixels.push({ x: 14, y: 2, color: '#4ecdc4' })
    pixels.push({ x: 14, y: 3, color: '#4ecdc4' })
    pixels.push({ x: 14, y: 4, color: '#4ecdc4' })
    pixels.push({ x: 15, y: 4, color: '#4ecdc4' })
    // Note 2
    pixels.push({ x: 16, y: 1, color: '#7ee8e0' })
    pixels.push({ x: 16, y: 2, color: '#7ee8e0' })
    pixels.push({ x: 17, y: 2, color: '#7ee8e0' })
    return pixels
  }, [mode])

  const pixelSize = 5
  const gridSize = 18

  return (
    <div className={`relative ${animationClass} select-none`}>
      <svg
        width={gridSize * pixelSize}
        height={gridSize * pixelSize}
        viewBox={`0 0 ${gridSize * pixelSize} ${gridSize * pixelSize}`}
        style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges' }}
        className="drop-shadow-2xl"
      >
        {/* Robot Chassis & Head */}
        {robotPixels.map((pixel, i) => (
          <rect
            key={`body-${i}`}
            x={pixel.x * pixelSize}
            y={pixel.y * pixelSize}
            width={pixelSize}
            height={pixelSize}
            fill={pixel.color}
          />
        ))}

        {/* Digital LED Visor Face */}
        {facePixels.map((pixel, i) => (
          <rect
            key={`face-${i}`}
            x={pixel.x * pixelSize}
            y={pixel.y * pixelSize}
            width={pixelSize}
            height={pixelSize}
            fill={pixel.color}
          />
        ))}

        {/* Overclock Sparks */}
        {sparkPixels.map((pixel, i) => (
          <rect
            key={`spark-${i}`}
            x={pixel.x * pixelSize}
            y={pixel.y * pixelSize}
            width={pixelSize}
            height={pixelSize}
            fill={pixel.color}
            className="animate-pulse"
          />
        ))}

        {/* Sleep Zzz */}
        {zzzPixels.map((pixel, i) => (
          <rect
            key={`zzz-${i}`}
            x={pixel.x * pixelSize}
            y={pixel.y * pixelSize}
            width={pixelSize}
            height={pixelSize}
            fill={pixel.color}
            opacity={0.85}
          />
        ))}

        {/* Music Notes */}
        {musicPixels.map((pixel, i) => (
          <rect
            key={`music-${i}`}
            x={pixel.x * pixelSize}
            y={pixel.y * pixelSize}
            width={pixelSize}
            height={pixelSize}
            fill={pixel.color}
            className="animate-pulse"
          />
        ))}
      </svg>

      {/* Energy Core Nodes Below Companion */}
      <div className="flex gap-1.5 justify-center mt-2.5">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 border-2 transition-all ${
              i < Math.floor(progress * 4)
                ? mode === 'work'
                  ? 'bg-accent border-accent-hot shadow-xs'
                  : mode === 'shortBreak'
                  ? 'bg-accent-2 border-accent-2-hot shadow-xs'
                  : 'bg-purple border-[#c084fc] shadow-xs'
                : 'bg-app-deep border-line opacity-50'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

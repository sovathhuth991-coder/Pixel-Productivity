import { useMemo } from 'react'
import { useDesignMode } from '../context/DesignModeContext'

export default function PixelScene() {
  const { mode } = useDesignMode()
  const isPixelCenter = mode === 'pixel-center'

  // Generate random pixel sky particles (night stars or daylight sun motes)
  const particles = useMemo(() => {
    const result: { x: number; y: number; size: number; opacity: number; delay: number }[] = []
    for (let i = 0; i < 45; i++) {
      result.push({
        x: Math.random() * 100,
        y: Math.random() * 85,
        size: Math.random() > 0.7 ? 3 : 2,
        opacity: 0.3 + Math.random() * 0.7,
        delay: Math.random() * 3,
      })
    }
    return result
  }, [])

  // Generate pixel clouds
  const clouds = useMemo(() => {
    return [
      { x: 8, y: 12, width: 44 },
      { x: 55, y: 8, width: 52 },
      { x: 30, y: 22, width: 34 },
    ]
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden select-none">
      {/* Sky particles (Stars in Commander, Golden Sun motes in Pixel Center) */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute animate-twinkle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: isPixelCenter
              ? i % 2 === 0
                ? `rgba(224, 83, 60, ${p.opacity * 0.5})`
                : `rgba(244, 162, 97, ${p.opacity * 0.6})`
              : `rgba(255, 255, 255, ${p.opacity})`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Floating Pixel Clouds */}
      {clouds.map((cloud, i) => (
        <div
          key={`cloud-${i}`}
          className="absolute animate-float-slow"
          style={{
            left: `${cloud.x}%`,
            top: `${cloud.y}%`,
            animationDelay: `${i * 2.5}s`,
          }}
        >
          <svg width={cloud.width} height={20} style={{ imageRendering: 'pixelated' }}>
            <rect
              x="8"
              y="0"
              width="4"
              height="4"
              fill={isPixelCenter ? 'rgba(42, 157, 143, 0.12)' : 'rgba(255, 255, 255, 0.05)'}
            />
            <rect
              x="12"
              y="0"
              width="4"
              height="4"
              fill={isPixelCenter ? 'rgba(42, 157, 143, 0.12)' : 'rgba(255, 255, 255, 0.05)'}
            />
            <rect
              x="4"
              y="4"
              width="4"
              height="4"
              fill={isPixelCenter ? 'rgba(224, 83, 60, 0.10)' : 'rgba(255, 255, 255, 0.05)'}
            />
            <rect
              x="8"
              y="4"
              width="4"
              height="4"
              fill={isPixelCenter ? 'rgba(224, 83, 60, 0.14)' : 'rgba(255, 255, 255, 0.08)'}
            />
            <rect
              x="12"
              y="4"
              width="4"
              height="4"
              fill={isPixelCenter ? 'rgba(224, 83, 60, 0.14)' : 'rgba(255, 255, 255, 0.08)'}
            />
            <rect
              x="16"
              y="4"
              width="4"
              height="4"
              fill={isPixelCenter ? 'rgba(42, 157, 143, 0.10)' : 'rgba(255, 255, 255, 0.05)'}
            />
            <rect
              x="0"
              y="8"
              width="4"
              height="4"
              fill={isPixelCenter ? 'rgba(42, 157, 143, 0.06)' : 'rgba(255, 255, 255, 0.03)'}
            />
            <rect
              x="4"
              y="8"
              width="4"
              height="4"
              fill={isPixelCenter ? 'rgba(224, 83, 60, 0.10)' : 'rgba(255, 255, 255, 0.05)'}
            />
            <rect
              x="8"
              y="8"
              width="4"
              height="4"
              fill={isPixelCenter ? 'rgba(224, 83, 60, 0.14)' : 'rgba(255, 255, 255, 0.08)'}
            />
            <rect
              x="12"
              y="8"
              width="4"
              height="4"
              fill={isPixelCenter ? 'rgba(224, 83, 60, 0.14)' : 'rgba(255, 255, 255, 0.08)'}
            />
            <rect
              x="16"
              y="8"
              width="4"
              height="4"
              fill={isPixelCenter ? 'rgba(42, 157, 143, 0.10)' : 'rgba(255, 255, 255, 0.05)'}
            />
            <rect
              x="20"
              y="8"
              width="4"
              height="4"
              fill={isPixelCenter ? 'rgba(42, 157, 143, 0.06)' : 'rgba(255, 255, 255, 0.03)'}
            />
          </svg>
        </div>
      ))}

      {/* Ground Horizon Tiles */}
      <div className="absolute bottom-0 left-0 right-0 h-6 flex border-t border-line/20">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="flex-1"
            style={{
              backgroundColor: isPixelCenter
                ? i % 3 === 0
                  ? '#eae2d0'
                  : i % 3 === 1
                  ? '#ded5c2'
                  : '#cfc4ad'
                : i % 3 === 0
                ? '#0f3460'
                : i % 3 === 1
                ? '#16213e'
                : '#1a1a2e',
              opacity: isPixelCenter ? 0.75 : 0.5,
            }}
          />
        ))}
      </div>
    </div>
  )
}

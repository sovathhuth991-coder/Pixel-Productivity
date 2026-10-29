interface PixelDeskProps {
  mode: 'work' | 'shortBreak' | 'longBreak'
}

/**
 * Cyber-Deck Station:
 * A retro-futuristic console workstation matching Chrono-Bot with
 * neon conduits, RGB micro-keyboard, holographic screens, and status props!
 */
export default function PixelDesk({ mode }: PixelDeskProps) {
  const pixelSize = 5
  const deskWidth = 19
  const deskHeight = 5

  const neonAccent = mode === 'work' ? '#e94560' : mode === 'shortBreak' ? '#4ecdc4' : '#a855f7'
  const neonLight = mode === 'work' ? '#ff7b93' : mode === 'shortBreak' ? '#7ee8e0' : '#c084fc'

  return (
    <div className="relative select-none" style={{ marginTop: '-4px' }}>
      <svg
        width={deskWidth * pixelSize}
        height={deskHeight * pixelSize}
        viewBox={`0 0 ${deskWidth * pixelSize} ${deskHeight * pixelSize}`}
        style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges' }}
      >
        {/* Desk top bevel & keyboard strip */}
        {[...Array(deskWidth)].map((_, x) => (
          <rect
            key={`deck-top-${x}`}
            x={x * pixelSize}
            y={0}
            width={pixelSize}
            height={pixelSize}
            fill={x >= 6 && x <= 12 ? (x % 2 === 0 ? neonLight : '#38bdf8') : '#334155'}
          />
        ))}

        {/* Desk front chassis plate */}
        {[...Array(deskWidth)].map((_, x) => (
          <rect
            key={`deck-front-${x}`}
            x={x * pixelSize}
            y={pixelSize}
            width={pixelSize}
            height={pixelSize}
            fill="#1e293b"
          />
        ))}

        {/* Glowing Neon Conduit Stripe */}
        {[...Array(deskWidth)].map((_, x) => (
          <rect
            key={`deck-neon-${x}`}
            x={x * pixelSize}
            y={2 * pixelSize}
            width={pixelSize}
            height={pixelSize}
            fill={x === 0 || x === deskWidth - 1 ? '#0f172a' : neonAccent}
            opacity={0.9}
          />
        ))}

        {/* Base chassis & console legs */}
        <rect x={2 * pixelSize} y={3 * pixelSize} width={2 * pixelSize} height={2 * pixelSize} fill="#0f172a" />
        <rect x={15 * pixelSize} y={3 * pixelSize} width={2 * pixelSize} height={2 * pixelSize} fill="#0f172a" />
        <rect x={4 * pixelSize} y={3 * pixelSize} width={11 * pixelSize} height={pixelSize} fill="#090d16" />

        {/* Mode-Specific Station Props */}
        {mode === 'work' && (
          <>
            {/* Left Hologram Auxiliary Terminal */}
            <rect x={1 * pixelSize} y={-3 * pixelSize} width={3 * pixelSize} height={3 * pixelSize} fill="#090d16" />
            <rect x={1.5 * pixelSize} y={-2.5 * pixelSize} width={2 * pixelSize} height={1 * pixelSize} fill="#38bdf8" opacity={0.8} />
            <rect x={1.5 * pixelSize} y={-1.5 * pixelSize} width={1.5 * pixelSize} height={0.5 * pixelSize} fill="#22c55e" />
            {/* Right Energized Plasma Mug */}
            <rect x={15 * pixelSize} y={-2 * pixelSize} width={2 * pixelSize} height={2 * pixelSize} fill="#ffffff" />
            <rect x={15.5 * pixelSize} y={-1.5 * pixelSize} width={1 * pixelSize} height={1 * pixelSize} fill={neonAccent} />
            {/* Steam particle */}
            <rect x={16 * pixelSize} y={-3 * pixelSize} width={pixelSize} height={pixelSize} fill="#cbd5e1" opacity={0.6} />
          </>
        )}

        {mode === 'shortBreak' && (
          <>
            {/* Left Handheld Gameboy / Holo Pad */}
            <rect x={2 * pixelSize} y={-2 * pixelSize} width={3 * pixelSize} height={2 * pixelSize} fill="#4ecdc4" />
            <rect x={2.5 * pixelSize} y={-1.5 * pixelSize} width={2 * pixelSize} height={1 * pixelSize} fill="#090d16" />
            {/* Right Steaming Battery Mug */}
            <rect x={14 * pixelSize} y={-2 * pixelSize} width={2 * pixelSize} height={2 * pixelSize} fill="#10b981" />
            <rect x={14.5 * pixelSize} y={-1.5 * pixelSize} width={1 * pixelSize} height={1 * pixelSize} fill="#fef08a" />
            <rect x={14.5 * pixelSize} y={-3 * pixelSize} width={pixelSize} height={pixelSize} fill="#86efac" opacity={0.7} />
          </>
        )}

        {mode === 'longBreak' && (
          <>
            {/* Left Magnetic Sleep Cradle */}
            <rect x={2 * pixelSize} y={-2 * pixelSize} width={4 * pixelSize} height={2 * pixelSize} fill="#6d28d9" />
            <rect x={3 * pixelSize} y={-1.5 * pixelSize} width={2 * pixelSize} height={1 * pixelSize} fill="#c084fc" />
            {/* Right Floating Ambient Moon Core */}
            <rect x={15 * pixelSize} y={-3.5 * pixelSize} width={2 * pixelSize} height={2 * pixelSize} fill="#facc15" opacity={0.9} />
            <rect x={14.5 * pixelSize} y={-2.5 * pixelSize} width={1 * pixelSize} height={1 * pixelSize} fill="#ca8a04" />
          </>
        )}
      </svg>
    </div>
  )
}

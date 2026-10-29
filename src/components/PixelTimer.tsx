interface PixelTimerProps {
  timeLeft: number
  mode: 'work' | 'shortBreak' | 'longBreak'
}

export default function PixelTimer({ timeLeft, mode }: PixelTimerProps) {
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const colorClass = mode === 'work' 
    ? 'text-accent' 
    : mode === 'shortBreak' 
    ? 'text-accent-2' 
    : 'text-purple'

  const glowClass = mode === 'work'
    ? 'shadow-[0_0_20px_rgba(233,69,96,0.3)]'
    : mode === 'shortBreak'
    ? 'shadow-[0_0_20px_rgba(78,205,196,0.3)]'
    : 'shadow-[0_0_20px_rgba(168,85,247,0.3)]'

  return (
    <div className={`relative ${glowClass}`}>
      {/* Timer box */}
      <div className="bg-surface border-4 border-line px-6 py-4 md:px-10 md:py-6 pixel-border">
        {/* Corner decorations */}
        <div className="absolute top-1 left-1 w-2 h-2 bg-line" />
        <div className="absolute top-1 right-1 w-2 h-2 bg-line" />
        <div className="absolute bottom-1 left-1 w-2 h-2 bg-line" />
        <div className="absolute bottom-1 right-1 w-2 h-2 bg-line" />
        
        {/* Time display */}
        <div className={`font-pixel text-4xl md:text-6xl ${colorClass} tracking-widest pixel-text`}>
          {display}
        </div>
      </div>
    </div>
  )
}

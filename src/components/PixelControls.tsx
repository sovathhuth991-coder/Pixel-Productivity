interface PixelControlsProps {
  isRunning: boolean
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onSkip: () => void
}

export default function PixelControls({ isRunning, onStart, onPause, onReset, onSkip }: PixelControlsProps) {
  return (
    <div className="flex gap-3 items-center">
      {/* Reset button */}
      <button
        onClick={onReset}
        className="group relative"
        title="Reset" aria-label="Reset"
      >
        <div className="w-10 h-10 md:w-12 md:h-12 bg-surface border-4 border-line flex items-center justify-center hover:border-accent-hot transition-colors pixel-border">
          <span className="font-pixel text-accent-hot text-xs group-hover:scale-110 transition-transform">
            ↺
          </span>
        </div>
      </button>

      {/* Play/Pause button */}
      <button
        onClick={isRunning ? onPause : onStart}
        className="group relative"
        title={isRunning ? 'Pause' : 'Start'}
      >
        <div className={`w-14 h-14 md:w-16 md:h-16 border-4 flex items-center justify-center transition-all pixel-border ${
          isRunning 
            ? 'bg-accent/20 border-accent hover:bg-accent/40' 
            : 'bg-accent-2/20 border-accent-2 hover:bg-accent-2/40'
        }`}>
          {isRunning ? (
            <div className="flex gap-1">
              <div className="w-2 h-5 bg-accent" />
              <div className="w-2 h-5 bg-accent" />
            </div>
          ) : (
            <div className="w-0 h-0 border-l-[12px] border-l-accent-2 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent ml-1" />
          )}
        </div>
      </button>

      {/* Skip button */}
      <button
        onClick={onSkip}
        className="group relative"
        title="Skip" aria-label="Skip"
      >
        <div className="w-10 h-10 md:w-12 md:h-12 bg-surface border-4 border-line flex items-center justify-center hover:border-purple transition-colors pixel-border">
          <span className="font-pixel text-purple text-xs group-hover:scale-110 transition-transform">
            ⏭
          </span>
        </div>
      </button>
    </div>
  )
}

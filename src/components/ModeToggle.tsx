import { useDesignMode } from '../context/DesignModeContext'
import { playModeSwitch } from '../utils/audio'
import PixelEmoji from './ui/PixelEmoji'

interface ModeToggleProps {
  compact?: boolean
}

export default function ModeToggle({ compact = false }: ModeToggleProps) {
  const { mode, setMode } = useDesignMode()
  const isPixelCenter = mode === 'pixel-center'
  const next = isPixelCenter ? 'commander' : 'pixel-center'

  return (
    <button
      type="button"
      title={
        isPixelCenter
          ? 'Current: Pixel Center (Vintage Studio). Click to switch to Commander (Dark Arcade).'
          : 'Current: Commander (Dark Arcade). Click to switch to Pixel Center (Vintage Studio).'
      }
      onClick={() => {
        playModeSwitch()
        setMode(next)
      }}
      className={
        compact
          ? 'font-pixel text-label px-2 py-1 bg-surface text-ink border-2 border-line hover:border-accent active:scale-95 transition-all flex items-center gap-1 pixel-border'
          : 'w-full flex items-center justify-center gap-2 py-1.5 px-2 bg-surface hover:bg-app-deep text-ink border-2 border-line hover:border-accent transition-all active:scale-95'
      }
    >
      <PixelEmoji name={isPixelCenter ? 'sun' : 'star'} size={12} />
      {!compact && (
        <span className="font-pixel text-label tracking-wide font-bold">
          {isPixelCenter ? 'PIXEL CENTER' : 'COMMANDER'}
        </span>
      )}
      {compact && (
        <span className="font-pixel text-micro">{isPixelCenter ? 'CENTER' : 'COMMANDER'}</span>
      )}
    </button>
  )
}

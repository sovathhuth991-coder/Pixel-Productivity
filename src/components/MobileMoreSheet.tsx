import { NavLink } from 'react-router-dom'
import Dialog from './ui/Dialog'
import PixelIcon, { type PixelIconName } from './ui/PixelIcon'
import ModeToggle from './ModeToggle'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { usePomodoroContext } from '../context/PomodoroContext'
import { useSyncContext } from '../context/SyncContext'
import { playClick } from '../utils/audio'

/**
 * The mobile "MORE" sheet.
 *
 * The bottom bar used to carry all seven destinations, which meant each item
 * was ~54px wide on a 375px phone (7 x 54 = 378px, so the last one was
 * clipped) and the theme toggle had to float over the page title in the top
 * right corner, covering the heading on every page.
 *
 * The bar now carries four primary destinations plus MORE, and everything
 * else lives in this bottom sheet. That gives every bar item a full 75px
 * target and removes the floating toggle entirely.
 */

interface MoreLink {
  to: string
  label: string
  hint: string
  icon: PixelIconName
  end?: boolean
}

const moreLinks: MoreLink[] = [
  {
    to: '/bookmarks',
    label: 'TABS & BOOKMARKS',
    hint: 'Saved links and folders',
    icon: 'bookmark',
  },
  { to: '/weekly', label: 'WEEKLY REPORT', hint: 'Completion history', icon: 'scroll' },
  { to: '/settings', label: 'SETUP', hint: 'Preferences and data', icon: 'gear' },
]

interface MobileMoreSheetProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileMoreSheet({ isOpen, onClose }: MobileMoreSheetProps) {
  const { isMuted, toggleMute } = usePomodoroContext()
  const { syncStatus } = useSyncContext()
  const { openShortcutsHelp } = useKeyboardShortcuts()

  const syncLabel =
    syncStatus === 'synced'
      ? 'DATA: SYNCED'
      : syncStatus === 'syncing'
        ? 'DATA: SYNCING'
        : syncStatus === 'error'
          ? 'DATA: OFFLINE'
          : 'DATA: LOCAL'

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        labelledBy="mobile-more-title"
        align="bottom"
        // Capped at 85% of the viewport and scrollable: on a short phone
        // (or with the keyboard open) the sheet would otherwise run off the
        // top of the screen.
        panelClassName="w-full max-h-[85dvh] overflow-y-auto bg-app-deep border-t-4 border-line shadow-[0_-8px_0_rgba(0,0,0,0.25)] pb-4"
      >
        <div className="px-3 pt-2 pb-3">
          {/* Grabber */}
          <div className="flex justify-center pb-2">
            <span className="block w-12 h-1 bg-line" />
          </div>

          <h2
            id="mobile-more-title"
            className="font-pixel text-small text-ink mb-3 px-1 tracking-wide"
          >
            MORE
          </h2>

          <div className="space-y-2">
            {moreLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => {
                  playClick()
                  onClose()
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 w-full px-3 py-3 bg-surface border-2 transition-colors ${
                    isActive ? 'border-accent text-accent' : 'border-line text-ink hover:border-accent/50'
                  }`
                }
              >
                <PixelIcon name={link.icon} size={18} className="shrink-0" />
                <span className="flex flex-col min-w-0 flex-1">
                  <span className="font-pixel text-caption truncate">{link.label}</span>
                  <span className="font-pixel text-micro text-muted truncate">{link.hint}</span>
                </span>
                <span className="font-pixel text-label text-dim shrink-0">{'>'}</span>
              </NavLink>
            ))}

            {/* Sound */}
            <button
              type="button"
              onClick={() => {
                playClick()
                toggleMute()
              }}
              className="flex items-center gap-3 w-full px-3 py-3 bg-surface border-2 border-line text-ink hover:border-accent/50 transition-colors"
            >
              <PixelIcon name={isMuted ? 'speaker-muted' : 'speaker'} size={18} className="shrink-0" />
              <span className="flex flex-col min-w-0 flex-1 text-left">
                <span className="font-pixel text-caption">{isMuted ? 'SOUND MUTED' : 'SOUND ON'}</span>
                <span className="font-pixel text-micro text-muted">Tap to toggle audio feedback</span>
              </span>
              <span className="font-pixel text-label text-dim shrink-0">{isMuted ? 'OFF' : 'ON'}</span>
            </button>

            {/* Theme */}
            <div className="px-3 py-2 bg-surface border-2 border-line">
              <ModeToggle />
            </div>

            {/* Keyboard shortcuts */}
            <button
              type="button"
              onClick={() => {
                playClick()
                // Close the sheet first — otherwise the shortcuts dialog
                // would stack on top of it and two focus traps would
                // compete for the same key.
                onClose()
                openShortcutsHelp()
              }}
              className="flex items-center gap-3 w-full px-3 py-3 bg-surface border-2 border-line text-ink hover:border-accent/50 transition-colors"
            >
              <span className="font-pixel text-body font-bold shrink-0">[?]</span>
              <span className="flex flex-col min-w-0 flex-1 text-left">
                <span className="font-pixel text-caption">KEYBOARD SHORTCUTS</span>
                <span className="font-pixel text-micro text-muted">Shortcut reference</span>
              </span>
              <span className="font-pixel text-label text-dim shrink-0">{'>'}</span>
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span
              className={`font-pixel text-label flex items-center gap-1 min-w-0 ${
                syncStatus === 'error' ? 'text-danger' : 'text-muted'
              }`}
            >
              <span
                className={`inline-block w-1.5 h-1.5 shrink-0 ${
                  syncStatus === 'synced'
                    ? 'bg-success'
                    : syncStatus === 'syncing'
                      ? 'bg-warn'
                      : syncStatus === 'error'
                        ? 'bg-danger'
                        : 'bg-dim'
                }`}
              />
              <span className="truncate">{syncLabel}</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 font-pixel text-caption px-3 py-2 bg-app-deep text-ink border-2 border-line hover:border-accent transition-colors"
            >
              CLOSE
            </button>
          </div>
        </div>
      </Dialog>
    </>
  )
}

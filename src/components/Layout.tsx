import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { usePomodoroContext } from '../context/PomodoroContext'
import PixelIcon, { type PixelIconName } from './ui/PixelIcon'
import MobileMoreSheet from './MobileMoreSheet'
import KeyboardShortcutsModal from './ui/KeyboardShortcutsModal'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { playClick } from '../utils/audio'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const { isRunning, timeLeft, mode } = usePomodoroContext()
  const { isShortcutsHelpOpen, closeShortcutsHelp } = useKeyboardShortcuts()
  const location = useLocation()

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  // The bottom bar carries only the four destinations that get used daily.
  // Everything else lives in the MORE sheet.
  //
  // Seven items in a 375px bar meant 7 x 54px = 378px, so the last item was
  // clipped off the right edge. Four items + MORE give each one a full
  // 75px-wide target, well above the 44px minimum, and they stay legible at
  // the tiny pixel font this app uses.
  const mobileNavItems: { to: string; label: string; icon: PixelIconName; end?: boolean }[] = [
    { to: '/', label: 'TASKS', icon: 'clipboard', end: true },
    { to: '/board', label: 'BOARD', icon: 'board' },
    { to: '/pomodoro', label: 'FOCUS', icon: 'tomato' },
    { to: '/stats', label: 'STATS', icon: 'chart' },
  ]

  // Routes that are reachable from the MORE sheet — MORE stays highlighted
  // while any of them is open.
  const moreRoutes = ['/bookmarks', '/weekly', '/settings']
  const isMoreRoute = moreRoutes.some(r => location.pathname.startsWith(r))

  return (
    // `select-none` used to sit on the root, which made task titles, stats
    // and report text impossible to select or copy — the opposite of useful.
    // Selection is now suppressed only on chrome (the nav and the buttons),
    // where a stray drag would otherwise select a whole row of labels.
    <div className="flex h-screen w-full bg-app-bg text-ink overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      {/* Main Content Area.
          `min-w-0` is load-bearing: a flex item defaults to `min-width: auto`,
          which refuses to shrink below its content's min-content width. Without
          it the widest card in any page forced this column wider than the
          phone viewport, and the root's `overflow-hidden` silently clipped
          the overflow instead of letting the page scroll. */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation — 4 primary destinations + MORE */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-app-deep border-t-4 border-line flex items-stretch z-50 select-none">
          {mobileNavItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => playClick()}
              className={({ isActive }) =>
                `flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 relative ${
                  isActive ? 'text-accent' : 'text-muted hover:text-ink'
                }`
              }
            >
              <PixelIcon name={item.icon} size={18} />
              <span className="font-pixel text-label mt-0.5 truncate">{item.label}</span>

              {item.to === '/pomodoro' && isRunning && (
                <span
                  className={`absolute -top-1 right-2 font-pixel text-micro px-1 py-0.2 border ${
                    mode === 'work' ? 'border-accent text-accent bg-accent/20' : 'border-accent-2 text-accent-2 bg-accent-2/20'
                  } animate-pulse`}
                >
                  {timeFormatted}
                </span>
              )}
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => {
              playClick()
              setMoreOpen(true)
            }}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-1 ${
              isMoreRoute || moreOpen ? 'text-accent' : 'text-muted hover:text-ink'
            }`}
          >
            <PixelIcon name="menu" size={18} />
            <span className="font-pixel text-label mt-0.5 truncate">MORE</span>
          </button>
        </nav>

        <MobileMoreSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} />

        {/* The keyboard-shortcuts guide is mounted ONCE, here in the app
            shell. It used to be rendered by the Sidebar *and* by the
            Dashboard, so pressing `?` stacked two identical dialogs on top
            of each other — two focus traps fighting over the same key. */}
        <KeyboardShortcutsModal
          isOpen={isShortcutsHelpOpen}
          onClose={closeShortcutsHelp}
        />
      </div>
    </div>
  )
}

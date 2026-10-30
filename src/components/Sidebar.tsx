import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { usePomodoroContext } from '../context/PomodoroContext'
import { useSyncContext } from '../context/SyncContext'
import PixelIcon, { type PixelIconName } from './ui/PixelIcon'
import ModeToggle from './ModeToggle'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { playClick } from '../utils/audio'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { isRunning, timeLeft, mode, isMuted, toggleMute } = usePomodoroContext()
  const { openShortcutsHelp } = useKeyboardShortcuts()
  const { syncStatus } = useSyncContext()

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const navItems: { to: string; label: string; icon: PixelIconName; end?: boolean }[] = [
    { to: '/home', label: 'HOME', icon: 'home' },
    { to: '/', label: 'TASKS', icon: 'clipboard', end: true },
    { to: '/board', label: 'BOARD', icon: 'board' },
    { to: '/bookmarks', label: 'BOOKMARKS', icon: 'bookmark' },
    { to: '/pomodoro', label: 'FOCUS', icon: 'tomato' },
    { to: '/weekly', label: 'WEEKLY', icon: 'scroll' },
    { to: '/stats', label: 'STATS', icon: 'chart' },
    { to: '/settings', label: 'SETUP', icon: 'gear' },
  ]

  return (
    <motion.nav
      animate={{ width: collapsed ? 56 : 180 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="hidden md:flex flex-col bg-app-deep border-r-4 border-line h-full z-20 relative shrink-0"
    >
      {/* Logo */}
      <div className="px-3 py-4 border-b-2 border-line flex items-center justify-between overflow-hidden">
        <div className="flex items-center gap-2 overflow-hidden">
          <PixelIcon name="gamepad" size={22} className="shrink-0" />
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-pixel text-caption text-accent whitespace-nowrap"
            >
              PIXEL PROD
            </motion.span>
          )}
        </div>
      </div>

      {/* Nav links */}
      <div className="flex-1 py-3 space-y-1 px-2">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => playClick()}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-3 transition-all group relative ${
                isActive
                  ? 'bg-accent/15 border-l-2 border-accent'
                  : 'border-l-2 border-transparent hover:bg-accent/5 hover:border-accent/40'
              }`
            }
          >
            <PixelIcon name={item.icon} size={18} className="shrink-0" />
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-pixel text-caption text-muted group-hover:text-ink whitespace-nowrap flex-1"
              >
                {item.label}
              </motion.span>
            )}

            {/* Mini ticking badge on FOCUS item if running or active */}
            {item.to === '/pomodoro' && isRunning && (
              <span
                className={`font-pixel text-label px-1.5 py-0.5 rounded-none border ${
                  mode === 'work'
                    ? 'border-accent text-accent bg-accent/20 animate-pulse'
                    : 'border-accent-2 text-accent-2 bg-accent-2/20 animate-pulse'
                } ${collapsed ? 'absolute -top-1 -right-1 text-micro px-1' : ''}`}
                title={`Timer running: ${timeFormatted}`}
              >
                {timeFormatted}
              </span>
            )}
          </NavLink>
        ))}

        {/* Persistent Mini-Timer Card when running and not collapsed */}
        {!collapsed && isRunning && (
          <div className="mt-4 p-2 bg-surface border-2 border-line pixel-border text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-danger animate-ping" />
              <span className="font-pixel text-label text-accent">
                {mode === 'work' ? 'FOCUSING' : 'BREAK'}
              </span>
            </div>
            <div className="font-pixel text-lead text-ink tracking-widest">
              {timeFormatted}
            </div>
          </div>
        )}
      </div>

      {/* Shortcuts Guide Button */}
      <div className="p-2 border-t-2 border-line flex items-center justify-center">
        <button
          onClick={openShortcutsHelp}
          title="Keyboard Shortcuts [?]" aria-label="Keyboard Shortcuts [?]"
          className="w-full flex items-center justify-center gap-2 py-1.5 px-2 bg-surface hover:bg-hover-fill text-muted hover:text-accent-2 border border-line transition-colors"
        >
          <span className="font-pixel text-small font-bold">[?]</span>
          {!collapsed && (
            <span className="font-pixel text-label">
              KEYS
            </span>
          )}
        </button>
      </div>

      <div className="p-2 border-t-2 border-line flex items-center justify-center">
        {collapsed ? <ModeToggle compact /> : <ModeToggle />}
      </div>

      {/* Sound Mute / Unmute Toggle */}
      <div className="p-2 border-t-2 border-line flex items-center justify-center">
        <button
          onClick={toggleMute}
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-2 bg-surface hover:bg-hover-fill text-muted hover:text-ink border border-line transition-colors"
        >
          <PixelIcon name={isMuted ? 'speaker-muted' : 'speaker'} size={14} />
          {!collapsed && (
            <span className="font-pixel text-label">
              {isMuted ? 'MUTED' : 'SOUND ON'}
            </span>
          )}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="p-3 border-t-2 border-line text-dim hover:text-accent transition-colors flex items-center justify-center"
      >
        <span className="font-pixel text-small">{collapsed ? '›' : '‹'}</span>
      </button>

      {/* Footer — reflects where the data actually lives */}
      {!collapsed && (
        <div className="px-3 py-2 border-t-2 border-line">
          <span
            className={`font-pixel text-label flex items-center gap-1 ${
              syncStatus === 'error' ? 'text-danger' : 'text-muted'
            }`}
            title={
              syncStatus === 'error'
                ? 'Cloud sync failed — your data is saved locally and will retry.'
                : syncStatus === 'syncing'
                  ? 'Saving to the cloud…'
                  : syncStatus === 'synced'
                    ? 'Signed in — tasks are synced to the cloud.'
                    : 'Signed out — tasks are saved in this browser only.'
            }
          >
            <span
              className={`inline-block w-1.5 h-1.5 ${
                syncStatus === 'synced'
                  ? 'bg-success'
                  : syncStatus === 'syncing'
                    ? 'bg-warn'
                    : syncStatus === 'error'
                      ? 'bg-danger'
                      : 'bg-dim'
              }`}
            />
            {syncStatus === 'synced'
              ? 'DATA: SYNCED'
              : syncStatus === 'syncing'
                ? 'DATA: SYNCING'
                : syncStatus === 'error'
                  ? 'DATA: OFFLINE'
                  : 'DATA: LOCAL'}
          </span>
        </div>
      )}
    </motion.nav>
  )
}

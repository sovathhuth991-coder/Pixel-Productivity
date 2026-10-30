import { useState, useRef } from 'react'
import { usePomodoroContext } from '../context/PomodoroContext'
import { useToast } from '../components/ui/Toast'
import { playBeep, playComplete, playModeSwitch, playClick, isAudioMuted, toggleAudioMuted } from '../utils/audio'
import { requestNotificationPermission, sendBrowserNotification, isNotificationGranted } from '../utils/notifications'
import { useDesignMode } from '../context/DesignModeContext'
import PixelIcon from '../components/ui/PixelIcon'
import PixelEmoji from '../components/ui/PixelEmoji'
import ActionButton from '../components/ui/ActionButton'
import SyncAuthCard from '../components/SyncAuthCard'
import { useSyncContext, LAST_UID_KEY } from '../context/SyncContext'
import { SYNC_KEYS } from '../services/syncKeys'
import { downloadBackup } from '../utils/backup'
import { sanitizeBookmarks, sanitizeFolders } from '../utils/url'

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    obsidianSettings,
    updateObsidianSettings,
    resetSettings,
  } = usePomodoroContext()
  const { showToast } = useToast()
  const { mode, setMode, animationsEnabled, setAnimationsEnabled } = useDesignMode()
  const { setStoredValue, removeStoredValue } = useSyncContext()
  const [confirmClear, setConfirmClear] = useState(false)
  const [muted, setMuted] = useState(isAudioMuted())
  const [testingObsidian, setTestingObsidian] = useState(false)
  const [testingNotification, setTestingNotification] = useState(false)
  const [importing, setImporting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const handleToggleSound = () => {
    const next = toggleAudioMuted()
    setMuted(next)
    showToast(next ? 'Sound muted 🔇' : 'Sound enabled 🔊', 'info')
  }

  const handleTestNotification = async () => {
    setTestingNotification(true)
    try {
      const granted = await requestNotificationPermission()
      if (granted) {
        sendBrowserNotification('🍅 Pixel Productivity', {
          body: 'HTML5 Web Notifications are enabled and working!',
        })
        showToast('Notification sent!', 'success')
      } else {
        showToast('Notification permission denied or blocked', 'error')
      }
    } finally {
      setTestingNotification(false)
    }
  }

  const handleTestObsidian = async () => {
    if (!obsidianSettings.vaultPath.trim()) {
      showToast('Please specify an Obsidian vault path first', 'error')
      return
    }
    setTestingObsidian(true)
    try {
      const url = (obsidianSettings.gatewayUrl || 'http://localhost:5789').replace(/\/$/, '')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (obsidianSettings.gatewayToken) {
        headers['X-Pixel-Gateway-Token'] = obsidianSettings.gatewayToken
      }
      const res = await fetch(`${url}/pomodoro/session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          taskId: 'test',
          taskTitle: 'Connection Test',
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          duration: 60,
          vaultPath: obsidianSettings.vaultPath,
        }),
      })
      if (res.ok) {
        showToast('Obsidian gateway connected successfully! ✅', 'success')
      } else {
        showToast(`Gateway returned status: ${res.status}`, 'error')
      }
    } catch {
      showToast('Could not reach gateway at ' + obsidianSettings.gatewayUrl, 'error')
    } finally {
      setTestingObsidian(false)
    }
  }

  const handleApplyPreset = (work: number, shortB: number, longB: number, interval: number = 4) => {
    updateSettings({
      workDuration: work,
      shortBreakDuration: shortB,
      longBreakDuration: longB,
      longBreakInterval: interval,
    })
    showToast(`Preset applied: ${work}m / ${shortB}m / ${longB}m`, 'success')
  }

  const handleExport = () => {
    try {
      // Shared with the crash boundary, so an emergency export is the same
      // file as a normal one.
      downloadBackup()
      showToast('Data exported successfully!', 'success')
    } catch {
      showToast('Failed to export data', 'error')
    }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset the input so the same file can be picked again straight away.
    e.target.value = ''
    if (!file) return

    setImporting(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        if (
          parsed &&
          parsed.data &&
          Array.isArray(parsed.data.categories) &&
          parsed.data.categories.every(
            (cat: { tasks?: unknown[] }) =>
              cat &&
              typeof cat === 'object' &&
              Array.isArray(cat.tasks)
          )
        ) {
          setStoredValue('taskmanager_tasks', parsed.data)
          if (parsed.streak) {
            setStoredValue('taskmanager_streak', parsed.streak)
          }
          if (parsed.settings) {
            localStorage.setItem('pixel_pomodoro_settings', JSON.stringify(parsed.settings))
          }
          if (parsed.obsidianSettings) {
            localStorage.setItem('pixel_obsidian_settings', JSON.stringify(parsed.obsidianSettings))
          }
          // Restore everything else the backup carried, so a restore is a
          // restore and not just a task-list import.
          if (parsed.activity) {
            setStoredValue('taskmanager_activity', parsed.activity)
          }
          if (parsed.completionHistory) {
            setStoredValue('taskmanager_completion_history', parsed.completionHistory)
          }
          if (parsed.bookmarks) {
            // Never restore a javascript:/data: bookmark from a file; the
            // same allowlist the add form uses is applied here.
            setStoredValue('pixel_bookmarks', sanitizeBookmarks(parsed.bookmarks))
          }
          if (parsed.bookmarkFolders) {
            setStoredValue('pixel_bookmark_folders', sanitizeFolders(parsed.bookmarkFolders))
          }
          if (parsed.reportBuffer) {
            setStoredValue('pixel_report_buffer', parsed.reportBuffer)
          }
          if (parsed.pomodoroHistory) {
            setStoredValue('pixel_pomodoro_daily', parsed.pomodoroHistory)
          }
          if (parsed.wallpaperSettings) {
            localStorage.setItem('pixel_wallpaper_settings', JSON.stringify(parsed.wallpaperSettings))
          }
          showToast('Data restored! Reloading...', 'success')
          setTimeout(() => window.location.reload(), 800)
        } else {
          showToast('Invalid backup file format', 'error')
        }
      } catch {
        showToast('Error reading JSON file', 'error')
      } finally {
        setImporting(false)
      }
    }
    reader.onerror = () => {
      setImporting(false)
      showToast('Error reading JSON file', 'error')
    }
    reader.readAsText(file)
  }

  const handleClearAll = async () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    // Synced keys go through the cloud controller, so the copy in Firestore
    // is deleted as well. Listing a synced key as "local" would clear it
    // here only — the next snapshot would hand it straight back.
    const syncedKeys = [...SYNC_KEYS]
    // Purely local prefs (themes, settings, device-specific paths).
    const localKeys = [
      'pixel_pomodoro_settings',
      'pixel_pomodoro_session',
      'pixel_obsidian_settings',
      'taskmanager_resets',
      'design-mode',
      'pixel_animations_enabled',
      'pixel_weekly_report_last_saved',
      LAST_UID_KEY,
    ]
    setClearing(true)
    try {
      await Promise.all(syncedKeys.map(key => removeStoredValue(key)))
      localKeys.forEach(key => localStorage.removeItem(key))
      // Frequency reminders are stored one key per frequency.
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('taskmanager_freq_notif_')) {
          localStorage.removeItem(key)
        }
      })
      // The weekly-report banner dismissal is stored per week.
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('pixel_weekly_banner_dismissed_')) {
          localStorage.removeItem(key)
        }
      })
      // Also clear any daily report buffers
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('pixel_report_')) {
          localStorage.removeItem(key)
        }
      })
      showToast('All data cleared! Reloading...', 'info')
      setTimeout(() => window.location.reload(), 600)
    } finally {
      setClearing(false)
    }
  }
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b-4 border-line pb-4">
        <h1 className="font-pixel text-base md:text-xl text-accent pixel-shadow flex items-center gap-2.5">
          <PixelEmoji name="gear" size={24} />
          <span>SYSTEM CONFIG</span>
        </h1>
        <p className="font-pixel text-caption text-muted mt-2">
          CUSTOMIZE TIMER INTERVALS, AUDIO, STORAGE & PREFERENCES
        </p>
      </div>

      {/* Cloud Sync (opt-in; localStorage fallback built in) */}
      <div className="space-y-3">
        <SyncAuthCard />
      </div>

      {/* Pomodoro Timer Configuration */}
      <div className="bg-surface border-4 border-line p-4 pixel-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-line/50 pb-2">
          <h2 className="font-pixel text-body text-heading flex items-center gap-2">
            <PixelEmoji name="tomato" size={18} />
            <span>POMODORO TIMER INTERVALS</span>
          </h2>
          {/* Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-pixel text-label text-muted mr-1">PRESETS:</span>
            <button
              onClick={() => handleApplyPreset(25, 5, 15, 4)}
              className="font-pixel text-label px-2 py-1 bg-app-deep border border-line hover:border-accent text-accent transition-colors"
            >
              CLASSIC (25/5)
            </button>
            <button
              onClick={() => handleApplyPreset(50, 10, 30, 4)}
              className="font-pixel text-label px-2 py-1 bg-app-deep border border-line hover:border-accent-2 text-accent-2 transition-colors"
            >
              LONG FOCUS (50/10)
            </button>
            <button
              onClick={() => handleApplyPreset(15, 3, 10, 4)}
              className="font-pixel text-label px-2 py-1 bg-app-deep border border-line hover:border-purple text-purple transition-colors"
            >
              SPRINT (15/3)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Work Duration */}
          <div className="bg-app-deep/80 border-2 border-line p-2.5">
            <label htmlFor="focus-minutes" className="block font-pixel text-label text-muted mb-1">
              FOCUS TIME (MINUTES)
            </label>
            <input
              id="focus-minutes"
              type="number"
              min={1}
              max={180}
              value={settings.workDuration}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 1
                updateSettings({ workDuration: Math.max(1, Math.min(180, val)) })
              }}
              className="w-full bg-surface border-2 border-line focus:border-accent px-2 py-1.5 font-pixel text-body text-ink text-center outline-none"
            />
          </div>

          {/* Short Break */}
          <div className="bg-app-deep/80 border-2 border-line p-2.5">
            <label htmlFor="short-break" className="block font-pixel text-label text-muted mb-1">
              SHORT BREAK (MINUTES)
            </label>
            <input
              id="short-break"
              type="number"
              min={1}
              max={60}
              value={settings.shortBreakDuration}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 1
                updateSettings({ shortBreakDuration: Math.max(1, Math.min(60, val)) })
              }}
              className="w-full bg-surface border-2 border-line focus:border-accent px-2 py-1.5 font-pixel text-body text-ink text-center outline-none"
            />
          </div>

          {/* Long Break */}
          <div className="bg-app-deep/80 border-2 border-line p-2.5">
            <label htmlFor="long-break" className="block font-pixel text-label text-muted mb-1">
              LONG BREAK (MINUTES)
            </label>
            <input
              id="long-break"
              type="number"
              min={1}
              max={90}
              value={settings.longBreakDuration}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 1
                updateSettings({ longBreakDuration: Math.max(1, Math.min(90, val)) })
              }}
              className="w-full bg-surface border-2 border-line focus:border-accent px-2 py-1.5 font-pixel text-body text-ink text-center outline-none"
            />
          </div>

          {/* Long Break Interval */}
          <div className="bg-app-deep/80 border-2 border-line p-2.5">
            <label htmlFor="long-break-interval" className="block font-pixel text-label text-muted mb-1">
              LONG BREAK EVERY (SESSIONS)
            </label>
            <input
              id="long-break-interval"
              type="number"
              min={1}
              max={16}
              value={settings.longBreakInterval}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 1
                updateSettings({ longBreakInterval: Math.max(1, Math.min(16, val)) })
              }}
              className="w-full bg-surface border-2 border-line focus:border-accent px-2 py-1.5 font-pixel text-body text-ink text-center outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => {
              resetSettings()
              showToast('Timer settings reset to 25/5/15 defaults', 'info')
            }}
            className="font-pixel text-label px-3 py-1.5 border border-line text-muted hover:text-ink hover:border-accent-2 transition-colors"
          >
            RESET TO DEFAULTS
          </button>
        </div>
      </div>

      {/* Obsidian Vault Sync */}
      <div className="bg-surface border-4 border-line p-4 pixel-border space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-pixel text-body text-heading flex items-center gap-2">
            <PixelEmoji name="book" size={18} />
            <span>OBSIDIAN INTEGRATION (LOCAL GATEWAY)</span>
          </h2>
          <button
            onClick={() => {
              const next = !obsidianSettings.enabled
              updateObsidianSettings({ enabled: next })
              showToast(next ? 'Obsidian sync enabled' : 'Obsidian sync disabled', next ? 'success' : 'info')
            }}
            className={`font-pixel text-caption px-3 py-1.5 border-2 transition-colors flex items-center gap-1.5 ${
              obsidianSettings.enabled
                ? 'bg-purple/20 border-purple text-purple'
                : 'bg-app-deep border-line text-muted'
            }`}
          >
            <PixelEmoji name={obsidianSettings.enabled ? 'gem' : 'gear'} size={12} />
            <span>{obsidianSettings.enabled ? 'SYNC: ENABLED' : 'SYNC: DISABLED'}</span>
          </button>
        </div>

        <p className="font-pixel text-label text-muted leading-relaxed">
          Log completed pomodoros and daily task completions to your local Obsidian markdown vault via a local gateway daemon.
        </p>

        {obsidianSettings.enabled && (
          <div className="space-y-3 pt-2">
            <div>
              <label htmlFor="vault-path" className="block font-pixel text-label text-muted mb-1">
                VAULT ABSOLUTE PATH: <span className="text-danger">*</span>
              </label>
              <input
                id="vault-path"
                type="text"
                required
                placeholder="e.g. /home/user/Documents/MyVault or C:/Users/.../MyVault"
                value={obsidianSettings.vaultPath}
                onChange={(e) => updateObsidianSettings({ vaultPath: e.target.value })}
                className="w-full bg-app-deep border-2 border-line focus:border-accent p-2 text-ink font-pixel text-caption outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1">
                <label htmlFor="gateway-url" className="block font-pixel text-label text-muted mb-1">
                  LOCAL GATEWAY URL:
                </label>
                <input
                  id="gateway-url"
                  type="text"
                  placeholder="http://localhost:5789"
                  value={obsidianSettings.gatewayUrl}
                  onChange={(e) => updateObsidianSettings({ gatewayUrl: e.target.value })}
                  className="w-full bg-app-deep border-2 border-line focus:border-accent p-2 text-ink font-pixel text-caption outline-none"
                />
              </div>

              <div className="flex-1">
                <label htmlFor="gateway-token" className="block font-pixel text-label text-muted mb-1">
                  GATEWAY TOKEN:
                </label>
                <input
                  id="gateway-token"
                  type="password"
                  placeholder="shared secret from the gateway"
                  value={obsidianSettings.gatewayToken}
                  onChange={(e) => updateObsidianSettings({ gatewayToken: e.target.value })}
                  className="w-full bg-app-deep border-2 border-line focus:border-accent p-2 text-ink font-pixel text-caption outline-none"
                />
              </div>

              <div className="sm:self-end">
                <ActionButton
                  onClick={handleTestObsidian}
                  loading={testingObsidian}
                  loadingLabel="TESTING…"
                  className="font-pixel text-caption px-3 py-2 bg-purple border-2 border-purple text-ink hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-1.5 justify-center"
                >
                  <PixelEmoji name="gear" size={14} />
                  <span>TEST CONNECTION</span>
                </ActionButton>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audio & Notifications section */}
      <div className="bg-surface border-4 border-line p-4 pixel-border space-y-3">
        <h2 className="font-pixel text-body text-heading flex items-center gap-2">
          <PixelEmoji name="speaker" size={18} />
          <span>AUDIO & BROWSER ALERTS</span>
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleToggleSound}
            className={`font-pixel text-caption px-3 py-2 border-2 transition-colors flex items-center gap-1.5 ${
              muted
                ? 'bg-danger/20 border-danger text-danger'
                : 'bg-success/20 border-success text-success'
            }`}
          >
            <PixelEmoji name={muted ? 'speaker_muted' : 'speaker'} size={14} />
            <span>{muted ? 'SOUND: MUTED' : 'SOUND: ENABLED'}</span>
          </button>
          <button
            onClick={() => { playBeep(); showToast('Tested Beep audio', 'info') }}
            className="font-pixel text-caption px-3 py-2 bg-line hover:bg-accent text-on-dark border-2 transition-colors flex items-center gap-1.5"
          >
            <PixelEmoji name="bell" size={14} />
            <span>TEST BEEP</span>
          </button>
          <button
            onClick={() => { playComplete(); showToast('Tested Fanfare audio', 'success') }}
            className="font-pixel text-caption px-3 py-2 bg-line hover:bg-accent-2 text-on-dark border-2 transition-colors flex items-center gap-1.5"
          >
            <PixelEmoji name="trophy" size={14} />
            <span>TEST FANFARE</span>
          </button>
          <ActionButton
            onClick={handleTestNotification}
            loading={testingNotification}
            loadingLabel="SENDING…"
            className="font-pixel text-caption px-3 py-2 bg-purple/20 border-2 border-purple text-purple hover:bg-purple hover:text-ink transition-colors flex items-center gap-1.5"
          >
            <PixelEmoji name="bell" size={14} />
            <span>TEST NOTIFICATION</span>
          </ActionButton>
        </div>
        <p className="font-pixel text-label text-muted flex items-center gap-1.5">
          <PixelEmoji name={isNotificationGranted() ? 'check_shield' : 'warning'} size={12} />
          <span>Notification status: {isNotificationGranted() ? 'GRANTED' : 'NOT GRANTED / DEFAULT'}</span>
        </p>
      </div>

      {/* Storage Management */}
      <div className="bg-surface border-4 border-line p-4 pixel-border space-y-4">
        <h2 className="font-pixel text-body text-heading flex items-center gap-2">
          <PixelEmoji name="floppy" size={18} />
          <span>BACKUP & LOCAL STORAGE</span>
        </h2>
        <p className="font-pixel text-label text-muted leading-relaxed">
          Your tasks, streaks, categories, bookmarks, timer settings and the
          activity history behind the weekly report are stored in this
          browser. The JSON backup carries all of it, so you can restore it on
          any device.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExport}
            className="font-pixel text-caption px-3 py-2 bg-accent-2/20 border-2 border-accent-2 text-accent-2 hover:bg-accent-2 hover:text-on-accent-2 transition-colors flex items-center gap-1.5"
          >
            <PixelEmoji name="rocket" size={14} />
            <span>EXPORT BACKUP (JSON)</span>
          </button>

          <ActionButton
            onClick={() => importInputRef.current?.click()}
            loading={importing}
            loadingLabel="IMPORTING…"
            className="font-pixel text-caption px-3 py-2 bg-purple/20 border-2 border-purple text-purple hover:bg-purple hover:text-ink transition-colors flex items-center gap-1.5"
          >
            <PixelEmoji name="floppy" size={14} />
            <span>IMPORT BACKUP</span>
          </ActionButton>
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />

          <ActionButton
            onClick={handleClearAll}
            loading={clearing}
            loadingLabel="ERASING…"
            className={`font-pixel text-caption px-3 py-2 border-2 transition-colors flex items-center gap-1.5 ${
              confirmClear
                ? 'bg-danger text-on-danger border-danger animate-pulse'
                : 'bg-danger/10 border-danger/50 text-danger hover:bg-danger/25'
            }`}
          >
            <PixelEmoji name="warning" size={14} />
            <span>{confirmClear ? 'CLICK AGAIN TO CONFIRM ERASE' : 'FACTORY RESET'}</span>
          </ActionButton>
          {confirmClear && (
            <button
              onClick={() => setConfirmClear(false)}
              className="font-pixel text-caption px-2 py-2 text-muted hover:text-ink"
            >
              CANCEL
            </button>
          )}
        </div>
      </div>

      {/* Shortcuts & Info */}
      <div className="bg-surface border-4 border-line p-4 pixel-border">
        <h2 className="font-pixel text-body text-heading mb-3 flex items-center gap-2">
          <PixelEmoji name="gear" size={18} />
          <span>KEYBOARD CONTROLS</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted font-pixel text-caption">
          <div className="flex justify-between p-2 bg-app-deep/60 border border-ink/5">
            <span className="text-accent-2">[SPACE]</span>
            <span>Toggle Timer Play/Pause</span>
          </div>
          <div className="flex justify-between p-2 bg-app-deep/60 border border-ink/5">
            <span className="text-accent-2">[R]</span>
            <span>Reset Active Timer</span>
          </div>
          <div className="flex justify-between p-2 bg-app-deep/60 border border-ink/5">
            <span className="text-accent-2">[S] / [→]</span>
            <span>Skip Current Interval</span>
          </div>
          <div className="flex justify-between p-2 bg-app-deep/60 border border-ink/5">
            <span className="text-accent-2">[N]</span>
            <span>Create New Task</span>
          </div>
          <div className="flex justify-between p-2 bg-app-deep/60 border border-ink/5">
            <span className="text-accent-2">[1]</span>
            <span>Go to Tasks Dashboard</span>
          </div>
          <div className="flex justify-between p-2 bg-app-deep/60 border border-ink/5">
            <span className="text-accent-2">[2]</span>
            <span>Go to Kanban Board</span>
          </div>
          <div className="flex justify-between p-2 bg-app-deep/60 border border-ink/5">
            <span className="text-accent-2">[3]</span>
            <span>Go to Bookmarks / Tabs</span>
          </div>
          <div className="flex justify-between p-2 bg-app-deep/60 border border-ink/5">
            <span className="text-accent-2">[4]</span>
            <span>Go to Focus / Pomodoro</span>
          </div>
          <div className="flex justify-between p-2 bg-app-deep/60 border border-ink/5">
            <span className="text-accent-2">[5]</span>
            <span>Go to Settings</span>
          </div>
          <div className="flex justify-between p-2 bg-app-deep/60 border border-ink/5">
            <span className="text-accent-2">[?]</span>
            <span>Toggle Shortcuts Help</span>
          </div>
          <div className="flex justify-between p-2 bg-app-deep/60 border border-ink/5">
            <span className="text-accent-2">[ESC]</span>
            <span>Close Active Window or Modal</span>
          </div>
        </div>
      </div>

      {/* Animation & Motion Controls (Stop Animations / Enable Animations) */}
      <div className="bg-surface border-4 border-line p-4 pixel-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-line/50 pb-2">
          <h2 className="font-pixel text-body text-heading flex items-center gap-2">
            <PixelEmoji name="lightning" size={18} />
            <span>ANIMATION SETUP & MOTION PREFERENCES</span>
          </h2>
          <span
            className={`font-pixel text-label px-2 py-0.5 border ${
              animationsEnabled
                ? 'border-success text-success bg-success/15'
                : 'border-warn text-warn bg-warn/15'
            }`}
          >
            STATUS: {animationsEnabled ? 'ANIMATIONS ACTIVE' : 'ANIMATIONS STOPPED'}
          </span>
        </div>

        <p className="font-pixel text-label text-muted leading-relaxed">
          Configure how pixel graphics, animated sprites, and character idle effects render across the application. Select Option 1 to freeze all motion or Option 2 to enable kinetic animations.
        </p>

        {/* 2 Options Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Option 1: Stop Animations */}
          <label
            htmlFor="animation-stop"
            className={`p-3.5 border-2 cursor-pointer transition-all flex flex-col justify-between space-y-2.5 ${
              !animationsEnabled
                ? 'bg-warn/15 border-warn text-ink shadow-md scale-[1.01]'
                : 'bg-app-deep/70 border-line text-muted hover:border-warn/60 hover:text-ink'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-pixel text-title">⏸</span>
                <div>
                  <h3 className="font-pixel text-small text-heading font-bold">
                    OPTION 1: STOP ANIMATIONS
                  </h3>
                  <span className="font-pixel text-micro text-muted">
                    ZERO MOTION · BATTERY SAVING · REDUCED DISTRACTION
                  </span>
                </div>
              </div>
              <input
                id="animation-stop"
                type="radio"
                name="animationPreference"
                checked={!animationsEnabled}
                onChange={() => {
                  playClick()
                  setAnimationsEnabled(false)
                  showToast('Option 1 selected: All animations stopped ⏸', 'info')
                }}
                className="mt-0.5 cursor-pointer accent-warn"
              />
            </div>

            <p className="font-pixel text-label text-muted leading-normal">
              Immediately halts all sprite spinning, flame flicker, character idle bounce, and UI movement. All graphics render as static crisp pixel art.
            </p>

            <span
              className={`font-pixel text-label py-1.5 px-3 border transition-colors self-start ${
                !animationsEnabled
                  ? 'bg-warn text-app-deep font-bold border-warn'
                  : 'bg-surface border-line text-muted hover:text-ink'
              }`}
            >
              {!animationsEnabled ? '✓ CURRENTLY STOPPED' : 'SELECT STOP ANIMATIONS'}
            </span>
          </label>

          {/* Option 2: Enable Animations */}
          <label
            htmlFor="animation-enable"
            className={`p-3.5 border-2 cursor-pointer transition-all flex flex-col justify-between space-y-2.5 ${
              animationsEnabled
                ? 'bg-accent-2/15 border-accent-2 text-ink shadow-md scale-[1.01]'
                : 'bg-app-deep/70 border-line text-muted hover:border-accent-2/60 hover:text-ink'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-pixel text-title">▶</span>
                <div>
                  <h3 className="font-pixel text-small text-heading font-bold">
                    OPTION 2: ENABLE ANIMATIONS
                  </h3>
                  <span className="font-pixel text-micro text-muted">
                    FULL KINETIC 8-BIT SPRITES · VIBRANT ENERGY
                  </span>
                </div>
              </div>
              <input
                id="animation-enable"
                type="radio"
                name="animationPreference"
                checked={animationsEnabled}
                onChange={() => {
                  playClick()
                  setAnimationsEnabled(true)
                  showToast('Option 2 selected: Animations enabled ▶', 'success')
                }}
                className="mt-0.5 cursor-pointer accent-accent-2"
              />
            </div>

            <p className="font-pixel text-label text-muted leading-normal">
              Activates full arcade kinetic motion, including Chrono-Bot's clacking and focus bounce, animated flames, rotating chrono-core, and particle sparks.
            </p>

            <span
              className={`font-pixel text-label py-1.5 px-3 border transition-colors self-start ${
                animationsEnabled
                  ? 'bg-accent-2 text-on-accent-2 font-bold border-accent-2'
                  : 'bg-surface border-line text-muted hover:text-ink'
              }`}
            >
              {animationsEnabled ? '✓ CURRENTLY ACTIVE' : 'SELECT ENABLE ANIMATIONS'}
            </span>
          </label>
        </div>

        {/* Live Sprite Animation Preview Box */}
        <div className="p-3 bg-app-deep/80 border border-line flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="font-pixel text-label text-muted">LIVE PREVIEW:</span>
            <div className="flex items-center gap-2">
              <PixelEmoji name="tomato" size={18} />
              <PixelEmoji name="flame" size={18} />
              <PixelEmoji name="coin" size={18} />
              <PixelEmoji name="lightning" size={18} />
              <PixelEmoji name="trophy" size={18} />
            </div>
          </div>
          <span className="font-pixel text-label text-dim">
            {animationsEnabled ? '⚡ SPRITES ARE ANIMATING IN REAL-TIME' : '⏹ SPRITES ARE FROZEN / STATIC'}
          </span>
        </div>
      </div>

      {/* Design Mode Switcher: Reimagined Pixel Center & Commander */}
      <div className="bg-surface border-4 border-line p-4 pixel-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-line/50 pb-2">
          <h2 className="font-pixel text-body text-heading flex items-center gap-2">
            <PixelEmoji name="paint" size={18} />
            <span>VISUAL THEME & DESIGN PALETTE</span>
          </h2>
          <span className="font-pixel text-label px-2 py-0.5 border border-line bg-app-deep text-ink">
            CURRENT: {mode === 'pixel-center' ? 'PIXEL CENTER (VINTAGE)' : 'COMMANDER (DARK ARCADE)'}
          </span>
        </div>

        <p className="font-pixel text-label text-muted leading-relaxed">
          Select your retro visual identity. Switch anytime between the reimagined daylight 16-bit vintage studio and the midnight cyber-arcade terminal.
        </p>

        {/* 2 Theme Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Card 1: Pixel Center */}
          <label
            htmlFor="theme-pixel-center"
            className={`p-3.5 border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
              mode === 'pixel-center'
                ? 'bg-warn/15 border-warn text-ink shadow-md scale-[1.01]'
                : 'bg-app-deep/70 border-line text-muted hover:border-warn/60 hover:text-ink'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <PixelEmoji name="sun" size={16} />
                <div>
                  <h3 className="font-pixel text-small text-heading font-bold">
                    PIXEL CENTER
                  </h3>
                  <span className="font-pixel text-micro text-muted">
                    VINTAGE 16-BIT STUDIO & PARCHMENT
                  </span>
                </div>
              </div>
              <input
                id="theme-pixel-center"
                type="radio"
                name="designTheme"
                checked={mode === 'pixel-center'}
                onChange={() => {
                  if (mode !== 'pixel-center') {
                    playModeSwitch()
                    setMode('pixel-center')
                    showToast('Switched to Pixel Center theme ☕🎨', 'success')
                  }
                }}
                className="mt-0.5 cursor-pointer accent-warn"
              />
            </div>

            <p className="font-pixel text-label text-muted leading-normal">
              Warm Japanese linen parchment, terracotta cinnabar red, vintage jade teal, and crisp graphite line-art. High-contrast, easy on the eyes in daylight.
            </p>

            <div className="flex items-center gap-1.5 pt-1">
              <span className="w-3 h-3 border border-line bg-[#f6f1e7]" title="Linen Parchment" />
              <span className="w-3 h-3 border border-line bg-[#b53823]" title="Terracotta Coral" />
              <span className="w-3 h-3 border border-line bg-[#166b56]" title="Vintage Jade" />
              <span className="w-3 h-3 border border-line bg-[#231f32]" title="Graphite Line" />
              <span className="w-3 h-3 border border-line bg-[#7c3aed]" title="Arcade Violet" />
            </div>

            <span
              className={`font-pixel text-label py-1.5 px-3 border transition-colors self-start ${
                mode === 'pixel-center'
                  ? 'bg-warn text-app-deep font-bold border-warn'
                  : 'bg-surface border-line text-muted hover:text-ink'
              }`}
            >
              {mode === 'pixel-center' ? '✓ ACTIVE THEME' : 'SELECT PIXEL CENTER'}
            </span>
          </label>

          {/* Card 2: Commander */}
          <label
            htmlFor="theme-commander"
            className={`p-3.5 border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
              mode === 'commander'
                ? 'bg-accent/15 border-accent text-ink shadow-md scale-[1.01]'
                : 'bg-app-deep/70 border-line text-muted hover:border-accent/60 hover:text-ink'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <PixelEmoji name="star" size={16} />
                <div>
                  <h3 className="font-pixel text-small text-heading font-bold">
                    COMMANDER
                  </h3>
                  <span className="font-pixel text-micro text-muted">
                    MIDNIGHT CYBER-ARCADE TERMINAL
                  </span>
                </div>
              </div>
              <input
                id="theme-commander"
                type="radio"
                name="designTheme"
                checked={mode === 'commander'}
                onChange={() => {
                  if (mode !== 'commander') {
                    playModeSwitch()
                    setMode('commander')
                    showToast('Switched to Commander theme 🕹️⚡', 'info')
                  }
                }}
                className="mt-0.5 cursor-pointer accent-accent"
              />
            </div>

            <p className="font-pixel text-label text-muted leading-normal">
              Midnight obsidian space console, deep navy cockpit, glowing neon crimson, and electric cyan. Maximum contrast arcade immersion for night focus.
            </p>

            <div className="flex items-center gap-1.5 pt-1">
              <span className="w-3 h-3 border border-line bg-[#1a1a2e]" title="Midnight Obsidian" />
              <span className="w-3 h-3 border border-line bg-[#e94560]" title="Neon Crimson" />
              <span className="w-3 h-3 border border-line bg-[#4ecdc4]" title="Electric Cyan" />
              <span className="w-3 h-3 border border-line bg-[#0f3460]" title="Navy Line" />
              <span className="w-3 h-3 border border-line bg-[#a855f7]" title="Synthwave Purple" />
            </div>

            <span
              className={`font-pixel text-label py-1.5 px-3 border transition-colors self-start ${
                mode === 'commander'
                  ? 'bg-accent text-on-accent font-bold border-accent-hot'
                  : 'bg-surface border-line text-muted hover:text-ink'
              }`}
            >
              {mode === 'commander' ? '✓ ACTIVE THEME' : 'SELECT COMMANDER'}
            </span>
          </label>
        </div>
      </div>

      {/* About */}
      <div className="text-center pt-4 font-pixel text-label text-dim space-y-1">
        <div>PIXEL PRODUCTIVITY v1.1.0</div>
        <div>POMODORO TIMER + DAILY TASK MANAGER + KANBAN + BOOKMARKS</div>
      </div>
    </div>
  )
}

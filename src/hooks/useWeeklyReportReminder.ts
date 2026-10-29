import { useCallback, useEffect, useState } from 'react'
import {
  dateKey,
  generateWeeklyReport,
  getLastWeekDates,
  getReportSettings,
  isReportSaved,
  isWeeklySaveWindowOpen,
  markReportSaved,
  nextSaveWindowTime,
  readWeekBuffer,
  reportFilename,
} from '../utils/weekly-report'
import {
  hasVaultPermission,
  writeMarkdownToVault,
} from '../utils/obsidian-archive'
import {
  isNotificationGranted,
  isNotificationSupported,
  requestNotificationPermission,
  sendBrowserNotification,
} from '../utils/notifications'

export interface WeeklyReminderState {
  /** The configured save window is open right now. */
  windowOpen: boolean
  /** The window is open and last week's report has not been archived yet. */
  reportPending: boolean
  /** Whether the browser can show desktop notifications at all. */
  supported: boolean
  /** Whether the user has granted notification permission. */
  granted: boolean
  /** Ask for notification permission — only ever from a user gesture. */
  enableNotifications: () => Promise<boolean>
  /** The file the auto-save wrote, if it wrote one. */
  autoSavedFile: string | null
}

// The reminder is a singleton. The app shell mounts it to keep the schedule
// running across route changes, and the Tasks screen mounts it again to show
// the banner — two instances would mean two timers and two desktop
// notifications for the same window.
let timer: ReturnType<typeof setTimeout> | null = null
let firedKey: string | null = null
let windowOpen = false
let reportPending = false
let granted = false
let autoSavedFile: string | null = null
const listeners = new Set<(s: WeeklyReminderState) => void>()

function emit() {
  const snapshot: WeeklyReminderState = {
    windowOpen,
    reportPending,
    supported: isNotificationSupported(),
    granted,
    enableNotifications,
    autoSavedFile,
  }
  listeners.forEach(l => l(snapshot))
}

async function enableNotifications(): Promise<boolean> {
  const ok = await requestNotificationPermission()
  granted = ok
  emit()
  return ok
}

/**
 * Write last week's report into the vault without being asked.
 *
 * Only runs when the user turned auto-save on AND the browser still holds a
 * write permission for the vault folder — the check never prompts, so a
 * revoked permission means the auto-save quietly does nothing instead of
 * throwing a dialog at the user.
 */
async function tryAutoSave(weekDates: Date[]): Promise<void> {
  const settings = getReportSettings()
  if (!settings.autoSave) return
  if (autoSavedFile) return // already written for this window

  const entries = readWeekBuffer(weekDates)
  if (entries.length === 0) return

  let allowed = false
  try {
    allowed = await hasVaultPermission()
  } catch {
    allowed = false
  }
  if (!allowed) return

  try {
    const md = generateWeeklyReport(weekDates)
    const fname = reportFilename(weekDates[weekDates.length - 1])
    const res = await writeMarkdownToVault(fname, md)
    if (res.ok) {
      markReportSaved(weekDates)
      autoSavedFile = fname
      reportPending = false
    }
  } catch {
    /* best effort — the manual save still works */
  }
}

function refresh(now: Date) {
  windowOpen = isWeeklySaveWindowOpen(now)
  if (!windowOpen) {
    reportPending = false
    // Publish the state change. Without this the in-app banner kept the
    // "ready to save" message on screen after the window had closed.
    emit()
    return
  }
  const lastWeek = getLastWeekDates(now)
  const key = dateKey(lastWeek[0])
  const pending = !isReportSaved(lastWeek)
  reportPending = pending
  // Publish before the early returns below. The timer that fires at the
  // window boundary calls `refresh()`, so without this the in-app banner
  // never appeared if the window opened while you were already on the
  // Tasks screen — the desktop notification fired, but the banner did not,
  // and you had to navigate away and back to see it.
  emit()
  if (firedKey === key) return // already reminded for this window
  if (!pending) {
    firedKey = key
    return
  }
  if (isNotificationGranted()) {
    sendBrowserNotification('🗓️ Weekly report ready to save', {
      body: "Open Weekly Report and archive last week's activity before the window closes.",
      icon: '/icons/icon-192.png',
      tag: 'pp-weekly-report',
    })
  }
  firedKey = key
  // The auto-save runs after the reminder so the notification still fires.
  void tryAutoSave(lastWeek)
}

function schedule() {
  if (timer) clearTimeout(timer)
  const now = new Date()
  if (isWeeklySaveWindowOpen(now)) {
    refresh(now)
    timer = setTimeout(schedule, 60_000)
  } else {
    const delay = nextSaveWindowTime(now).getTime() - now.getTime()
    timer = setTimeout(() => schedule(), Math.max(0, delay))
  }
}

// App-wide reminder for the weekly report save window. It fires a single
// desktop notification when the configured save-window opens AND the previous
// week's report has not been archived yet, then re-schedules weekly.
//
// The permission is never requested on mount — a browser asks for a gesture
// first, and an unsolicited prompt on page load is both refused and rude.
// The in-app banner asks for it instead.
export function useWeeklyReportReminder(): WeeklyReminderState {
  const [state, setState] = useState<WeeklyReminderState>({
    windowOpen,
    reportPending,
    supported: isNotificationSupported(),
    granted,
    enableNotifications,
    autoSavedFile,
  })

  useEffect(() => {
    listeners.add(setState)
    granted = isNotificationGranted()
    schedule()
    emit()
    return () => {
      listeners.delete(setState)
      if (listeners.size === 0 && timer) {
        clearTimeout(timer)
        timer = null
      }
    }
  }, [])

  const enable = useCallback(async () => {
    const ok = await enableNotifications()
    return ok
  }, [])

  return { ...state, enableNotifications: enable }
}

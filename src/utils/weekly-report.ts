// ─── Weekly Report Buffer & Generator ──────────────────────────────────────
// Snapshots every task / pomodoro event into per-day entries so a weekly
// archive can survive unchecked-and-recheck events.
//
// The buffer used to be local-only, which meant the .md could only ever be
// written on the device that recorded the activity — the reason the weekly
// save felt device-bound. It now lives in one map (`pixel_report_buffer`)
// that is mirrored to Firestore through the cloud bridge, so the report can
// be produced (or auto-saved) from any signed-in device.

import type { Task, Category } from '../types/tasks'
import { writeToCloud } from './cloudBridge'

export type ReportAction =
  | 'task_completed'
  | 'task_uncompleted'
  | 'task_added'
  | 'task_deleted'
  | 'pomodoro_finished'

export interface ReportEntry {
  id: string
  timestamp: number // ms since epoch
  action: ReportAction
  taskTitle: string
  categoryId: string
  categoryName: string
  frequency?: string
  pomodorosSpent?: number
}

export interface WeeklyReportSettings {
  weeklySaveDay: number // 0 = Sunday ... 6 = Saturday
  weeklySaveTime: string // HH:MM (24h)
  vaultFolderName: string
  /** Write the .md automatically when the save window opens. */
  autoSave?: boolean
}

const DEFAULT_SETTINGS: WeeklyReportSettings = {
  weeklySaveDay: 0, // Sunday
  weeklySaveTime: '22:00',
  vaultFolderName: 'Tasks From PP',
  /**
   * Write the .md automatically when the save window opens.
   *
   * Off by default: it writes a file into the user's vault without being
   * asked, and it only works once a vault folder has been picked and the
   * browser has granted permission for it.
   */
  autoSave: false,
}

export const SETTINGS_KEY = 'pixel_weekly_report_settings'
const BUFFER_PREFIX = 'pixel_report_'

// ─── Settings ────────────────────────────────────────────────────────────
export function getReportSettings(): WeeklyReportSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    /* fall through */
  }
  return DEFAULT_SETTINGS
}

export function saveReportSettings(s: WeeklyReportSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch (e) {
    console.warn('Failed to save report settings:', e)
  }
  // The save schedule is a preference, not a device setting — mirror it so
  // the phone and the desktop agree on when the window opens.
  writeToCloud(SETTINGS_KEY, s)
}

// ─── Date helpers ─────────────────────────────────────────────────────────
export function dateKey(d: Date = new Date()): string {
  // YYYY-MM-DD in local time
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dayName(idx: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx] || 'Day'
}

// Return the 7 dates of the week containing `now`, starting from Sunday.
export function getWeekDates(now: Date = new Date()): Date[] {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  // getDay(): 0=Sun
  start.setDate(start.getDate() - start.getDay())
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

// Return the most recent completed week (the previous Sunday→Saturday).
// We use Sunday as week start, so "last week" is the 7 days ending the
// previous Saturday.
export function getLastWeekDates(now: Date = new Date()): Date[] {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  // Back up to the most recent Saturday
  // getDay(): 0=Sun
  const day = start.getDay()
  // If today is Sun(0)→ back 1 day → Sat; if Sat(6)→ back 7 days → prev Sat
  // We want the 7-day window ending the day before the current week's Sunday.
  const daysSinceThisSunday = day // 0..6
  const lastSunday = new Date(start)
  lastSunday.setDate(start.getDate() - daysSinceThisSunday - 7)
  const out: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(lastSunday)
    d.setDate(lastSunday.getDate() + i)
    out.push(d)
  }
  return out
}

// Are we currently within the configured weekly save window?
// True when today's day-of-week == weeklySaveDay and current time >= weeklySaveTime.
export function isWeeklySaveWindowOpen(now: Date = new Date()): boolean {
  const s = getReportSettings()
  if (now.getDay() !== s.weeklySaveDay) return false
  const [h, m] = s.weeklySaveTime.split(':').map(Number)
  const cur = now.getHours() * 60 + now.getMinutes()
  return cur >= (h * 60 + m)
}

// ─── Buffer API ───────────────────────────────────────────────────────────
function bufferKey(dateStr: string): string {
  return `${BUFFER_PREFIX}${dateStr}`
}

/** The whole buffer — one map of `date -> entries` — in one storage key. */
export const BUFFER_CLOUD_KEY = 'pixel_report_buffer'

export type ReportBuffer = Record<string, ReportEntry[]>

// Parsed once and reused: reading a week means seven reads, and the buffer
// is re-read on every render of the Weekly Report page.
//
// The cache is validated against the raw stored string rather than trusted
// blindly. The Firestore merge in SyncContext writes the map key directly,
// from outside this module, so a cache that was only ever invalidated by
// `writeDayBuffer` would keep serving the pre-merge view of the week — the
// report page would show only the entries recorded on this device and the
// merge itself would be computed from a stale map.
let bufferCache: ReportBuffer | null = null
let bufferCacheRaw: string | null = null

/**
 * Read the whole buffer.
 *
 * Merges the current map with any legacy per-day keys, so a buffer written
 * by an older build (one key per day) is picked up rather than lost.
 */
export function readBuffer(): ReportBuffer {
  let raw = ''
  try {
    raw = localStorage.getItem(BUFFER_CLOUD_KEY) ?? ''
  } catch {
    raw = ''
  }
  if (bufferCache && bufferCacheRaw === raw) return bufferCache

  const map: ReportBuffer = {}
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as ReportBuffer
      if (parsed && typeof parsed === 'object') {
        for (const [date, entries] of Object.entries(parsed)) {
          if (Array.isArray(entries)) map[date] = entries
        }
      }
    } catch {
      /* fall through to the legacy keys */
    }
  }
  // Legacy per-day keys.
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(BUFFER_PREFIX)) continue
      const date = key.slice(BUFFER_PREFIX.length)
      if (date === BUFFER_CLOUD_KEY.slice(BUFFER_PREFIX.length)) continue
      const entries = readDayBufferLegacy(date)
      if (entries.length) map[date] = mergeEntries(map[date] ?? [], entries)
    }
  } catch {
    /* ignore */
  }
  bufferCache = map
  bufferCacheRaw = raw
  return map
}

/** Union two entry lists, de-duplicated by entry id, oldest first. */
export function mergeEntries(a: ReportEntry[], b: ReportEntry[]): ReportEntry[] {
  const byId = new Map<string, ReportEntry>()
  for (const e of [...a, ...b]) {
    if (e && typeof e.id === 'string') byId.set(e.id, e)
  }
  return [...byId.values()].sort((x, y) => x.timestamp - y.timestamp)
}

/** Union two buffer maps day by day. */
export function mergeBuffers(a: ReportBuffer, b: ReportBuffer): ReportBuffer {
  const out: ReportBuffer = { ...a }
  for (const [date, entries] of Object.entries(b)) {
    out[date] = mergeEntries(out[date] ?? [], entries ?? [])
  }
  return out
}

function readDayBufferLegacy(dateStr: string): ReportEntry[] {
  try {
    const raw = localStorage.getItem(bufferKey(dateStr))
    if (raw) return JSON.parse(raw)
  } catch {
    /* fall through */
  }
  return []
}

export function readDayBuffer(dateStr: string): ReportEntry[] {
  const map = readBuffer()
  return map[dateStr] ?? []
}

/**
 * Keep the buffer to the last N weeks.
 *
 * The whole buffer is rewritten and re-uploaded on every single event, so
 * it has to stay bounded. At roughly 200 bytes per entry and a couple of
 * dozen events a day, an unpruned buffer passes the 1 MiB Firestore
 * document limit after a few months — and because the cloud write failure
 * is swallowed, the cloud copy would quietly stop updating. The local copy
 * would keep growing until localStorage's quota was hit, at which point
 * the weekly report stopped recording entirely, with no error shown.
 */
const REPORT_BUFFER_WEEKS = 16

function pruneReportBuffer(map: ReportBuffer): ReportBuffer {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - REPORT_BUFFER_WEEKS * 7)
  const cutoffKey = dateKey(cutoff)
  const out: ReportBuffer = {}
  for (const [date, entries] of Object.entries(map)) {
    if (date >= cutoffKey) out[date] = entries
  }
  // The legacy per-day keys mirror the map; drop the ones that fell out
  // of the window as well, or they keep the storage growing on their own.
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(BUFFER_PREFIX)) continue
      const date = key.slice(BUFFER_PREFIX.length)
      if (date === BUFFER_CLOUD_KEY.slice(BUFFER_PREFIX.length)) continue
      if (date < cutoffKey) localStorage.removeItem(key)
    }
  } catch {
    /* ignore */
  }
  return out
}

export function writeDayBuffer(dateStr: string, entries: ReportEntry[]): void {
  const map = pruneReportBuffer(readBuffer())
  map[dateStr] = entries
  bufferCache = map
  try {
    const raw = JSON.stringify(map)
    localStorage.setItem(BUFFER_CLOUD_KEY, raw)
    // Keep the cached copy in step with what is actually on disk, so the
    // next read does not have to re-parse.
    bufferCacheRaw = raw
    // Keep the per-day key in step for any older reader.
    localStorage.setItem(bufferKey(dateStr), JSON.stringify(entries))
  } catch (e) {
    console.warn('Failed to write day buffer:', e)
  }
  // Mirror the whole buffer to the cloud so another device can build the
  // same .md. Best effort: with no signed-in user this is a no-op.
  writeToCloud(BUFFER_CLOUD_KEY, map)
}

export function appendEntry(dateStr: string, entry: ReportEntry): void {
  const existing = readDayBuffer(dateStr)
  writeDayBuffer(dateStr, [...existing, entry])
}

export function readWeekBuffer(weekDates: Date[]): ReportEntry[] {
  return weekDates.flatMap(d => readDayBuffer(dateKey(d)))
}

export function clearWeekBuffer(weekDates: Date[]): void {
  // The map in `pixel_report_buffer` is what `readBuffer` actually reads;
  // the per-day keys are only a mirror kept for older readers. Removing
  // just the per-day keys left the week in the map, so a "clear the week"
  // call was a no-op as far as the report page was concerned.
  const map = readBuffer()
  const keys = new Set(weekDates.map(d => dateKey(d)))

  const out: ReportBuffer = {}
  let changed = false
  for (const [date, entries] of Object.entries(map)) {
    if (keys.has(date)) {
      changed = true
      continue
    }
    out[date] = entries
  }

  weekDates.forEach(d => {
    try {
      localStorage.removeItem(bufferKey(dateKey(d)))
    } catch {
      /* ignore */
    }
  })

  if (!changed) return
  bufferCache = out
  try {
    const raw = JSON.stringify(out)
    localStorage.setItem(BUFFER_CLOUD_KEY, raw)
    bufferCacheRaw = raw
  } catch {
    /* ignore */
  }
  writeToCloud(BUFFER_CLOUD_KEY, out)
}

// ─── Live entry writers (called from contexts) ───────────────────────────
export function recordTaskCompleted(task: Task, category: Category | undefined): void {
  const now = new Date()
  appendEntry(dateKey(now), {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: now.getTime(),
    action: 'task_completed',
    taskTitle: task.title,
    categoryId: category?.id || '',
    categoryName: category?.name || 'Uncategorized',
    frequency: task.frequency,
    pomodorosSpent: task.pomodorosSpent,
  })
}

export function recordTaskUncompleted(task: Task, category: Category | undefined): void {
  const now = new Date()
  appendEntry(dateKey(now), {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: now.getTime(),
    action: 'task_uncompleted',
    taskTitle: task.title,
    categoryId: category?.id || '',
    categoryName: category?.name || 'Uncategorized',
    frequency: task.frequency,
  })
}

export function recordTaskAdded(task: Task, category: Category | undefined): void {
  const now = new Date()
  appendEntry(dateKey(now), {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: now.getTime(),
    action: 'task_added',
    taskTitle: task.title,
    categoryId: category?.id || '',
    categoryName: category?.name || 'Uncategorized',
    frequency: task.frequency,
  })
}

export function recordTaskDeleted(task: Task, category: Category | undefined): void {
  const now = new Date()
  appendEntry(dateKey(now), {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: now.getTime(),
    action: 'task_deleted',
    taskTitle: task.title,
    categoryId: category?.id || '',
    categoryName: category?.name || 'Uncategorized',
    frequency: task.frequency,
  })
}

export function recordPomodoroFinished(taskTitle: string, category: Category | undefined): void {
  const now = new Date()
  appendEntry(dateKey(now), {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: now.getTime(),
    action: 'pomodoro_finished',
    taskTitle,
    categoryId: category?.id || '',
    categoryName: category?.name || 'Uncategorized',
  })
}

// ─── Report generation ────────────────────────────────────────────────────
export function generateWeeklyReport(weekDates: Date[]): string {
  const entries = readWeekBuffer(weekDates)
  if (entries.length === 0) {
    return `# This Week Report\n\n_No activity recorded for this week._\n`
  }

  // Group by category, then by day-of-week (Day 1..7)
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp)

  const byCategory = new Map<string, ReportEntry[]>()
  sorted.forEach(e => {
    if (!byCategory.has(e.categoryName)) byCategory.set(e.categoryName, [])
    byCategory.get(e.categoryName)!.push(e)
  })

  const firstDate = weekDates[0]
  const lastDate = weekDates[6]
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const lines: string[] = []
  lines.push(`# This Week Report`)
  lines.push(``)
  lines.push(
    `Week of ${fmt(firstDate)} – ${fmt(lastDate)}, ${lastDate.getFullYear()}`,
  )
  lines.push(``)
  lines.push(`> Generated ${new Date().toLocaleString()}`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  // Day index lookup: day-of-week Sunday=0 → Day N (1..7)
  const dayIndex = (d: Date) => d.getDay() + 1

  // Entries by date for header
  const countByDay = new Map<string, number>()
  entries.forEach(e => {
    const k = dateKey(new Date(e.timestamp))
    countByDay.set(k, (countByDay.get(k) || 0) + 1)
  })

  lines.push(`## Daily Totals`)
  weekDates.forEach((d, i) => {
    const cnt = countByDay.get(dateKey(d)) || 0
    lines.push(
      `- **Day ${i + 1} (${dayName(d.getDay())}, ${fmt(d)})** — ${cnt} action${cnt === 1 ? '' : 's'}`,
    )
  })
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  // By category
  for (const [catName, list] of byCategory) {
    lines.push(`## ${catName}`)
    lines.push(``)

    // group by day index
    const byDay = new Map<number, ReportEntry[]>()
    list.forEach(e => {
      const di = dayIndex(new Date(e.timestamp))
      if (!byDay.has(di)) byDay.set(di, [])
      byDay.get(di)!.push(e)
    })

    const sortedDays = [...byDay.keys()].sort((a, b) => a - b)
    sortedDays.forEach(di => {
      const dayDate = weekDates[di - 1]
      lines.push(`### Day ${di} (${dayName(dayDate.getDay())})`)
      lines.push(``)
      byDay.get(di)!.forEach(e => {
        const time = new Date(e.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
        const bullet = actionBullet(e)
        lines.push(`- ${bullet} ${e.taskTitle} — _${time}_`)
      })
      lines.push(``)
    })
  }

  lines.push(`---`)
  lines.push(``)
  lines.push(
    `_Total events: ${entries.length} · Categories: ${byCategory.size}_`,
  )
  lines.push(``)

  return lines.join('\n')
}

function actionBullet(e: ReportEntry): string {
  switch (e.action) {
    case 'task_completed':
      return '✅'
    case 'task_uncompleted':
      return '↩️'
    case 'task_added':
      return '➕'
    case 'task_deleted':
      return '🗑️'
    case 'pomodoro_finished':
      return '🍅'
  }
}

// ─── Filename helper ──────────────────────────────────────────────────────
export function reportFilename(d: Date = new Date()): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}.md`
}

// ─── Week boundary + save-window reminder helpers ────────────────────────
// Week keys here are Sunday-start to match getWeekDates() and the UI.

const LAST_SAVED_KEY = 'pixel_weekly_report_last_saved' // local-only bookmark

export function markReportSaved(weekDates: Date[]): void {
  try {
    localStorage.setItem(LAST_SAVED_KEY, dateKey(weekDates[0]))
  } catch {}
}

export function isReportSaved(weekDates: Date[]): boolean {
  try {
    return localStorage.getItem(LAST_SAVED_KEY) === dateKey(weekDates[0])
  } catch {
    return false
  }
}

// Wall-clock time the configured save window next opens (for scheduling a
// reminder). Only meaningful when the window is currently CLOSED.
export function nextSaveWindowTime(now: Date = new Date()): Date {
  const s = getReportSettings()
  const [h, m] = s.weeklySaveTime.split(':').map(Number)
  const targetDay = s.weeklySaveDay
  const next = new Date(now)
  next.setHours(h, m, 0, 0)
  let daysAhead = (targetDay - next.getDay() + 7) % 7
  if (daysAhead === 0 && next <= now) daysAhead = 7 // already passed today
  if (daysAhead !== 0) {
    next.setDate(next.getDate() + daysAhead)
    next.setHours(h, m, 0, 0)
  }
  return next
}

// ─── Pomodoro daily history (mirrored to the cloud, for the Stats hub) ─────
// The Stats page reads this map. It used to be local-only, so the pomodoro
// chart on one device disagreed with the chart on another; it is now
// mirrored alongside the report buffer.
export const POMO_HISTORY_KEY = 'pixel_pomodoro_daily'

export function recordPomodoroSession(d: Date = new Date()): void {
  const k = dateKey(d)
  const hist = readPomodoroHistory()
  hist[k] = (hist[k] || 0) + 1
  try {
    localStorage.setItem(POMO_HISTORY_KEY, JSON.stringify(hist))
  } catch {}
  writeToCloud(POMO_HISTORY_KEY, hist)
  prunePomodoroHistory()
}

export function readPomodoroHistory(): Record<string, number> {
  try {
    const raw = localStorage.getItem(POMO_HISTORY_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/**
 * Drop the days that are older than the retention window.
 *
 * Pure, so the cloud merge can prune its result too. The merge in
 * SyncContext takes the larger count per day, so without pruning the
 * merged map it would pull the days the local prune had just removed
 * straight back out of the cloud copy — the prune never stuck.
 */
export function prunePomodoroHistoryMap(
  hist: Record<string, number>,
  olderThanDays = 90,
): Record<string, number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - olderThanDays)
  const cutoffKey = dateKey(cutoff)
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(hist)) {
    if (k >= cutoffKey) out[k] = v
  }
  return out
}

// Drop entries older than ~90 days (the map is small, so trimming is cheap).
export function prunePomodoroHistory(olderThanDays = 90): void {
  try {
    const raw = localStorage.getItem(POMO_HISTORY_KEY)
    if (!raw) return
    const hist: Record<string, number> = JSON.parse(raw)
    const pruned = prunePomodoroHistoryMap(hist, olderThanDays)
    localStorage.setItem(POMO_HISTORY_KEY, JSON.stringify(pruned))
    // Mirror the pruned map, otherwise the cloud keeps the days the local
    // prune just removed and hands them back on the next sign-in.
    writeToCloud(POMO_HISTORY_KEY, pruned)
  } catch {}
}

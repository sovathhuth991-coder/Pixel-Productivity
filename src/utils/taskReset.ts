import type { Task, TaskData } from '../types/tasks'
import { dateKey } from './weekly-report'

/**
 * The local date of the Sunday that starts the week containing `date`.
 *
 * Sunday-start, matching the weekly report's `getWeekDates()` and the day
 * grid. The old ISO (Monday-based) key delayed the weekly task reset until
 * Monday, which left last week's `weekly` checks in place on Sunday — the
 * stale "checked though I didn't check it" state at the start of a new week.
 *
 * Local time, not UTC: the week a person lives in starts at their local
 * midnight, and the rest of the app (weekly report buffer, day grid) is
 * built on local dates too.
 */
export function getWeekKey(date: Date = new Date()): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay()) // 0 = Sunday -> back to this Sunday
  return dateKey(d)
}

/**
 * The Sunday that starts the week *before* the week containing `date`.
 *
 * Built with the local date constructor rather than by subtracting a fixed
 * number of milliseconds, so a daylight-saving change inside the week cannot
 * shift the result onto the wrong day.
 */
export function getPreviousWeekKey(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7)
  return getWeekKey(d)
}

/**
 * The local day before `date`.
 *
 * Same reasoning as `getPreviousWeekKey`: local date arithmetic, not
 * millisecond subtraction, so DST cannot move it.
 */
export function getPreviousDayKey(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1)
  return dateKey(d)
}

/**
 * The local day a task was completed on.
 *
 * `completedAt` is an absolute instant, so it stays correct across timezone
 * changes; `lastCompletedDate` is a plain date string and is only a fallback
 * for records that predate `completedAt`.
 */
export function taskCompletionDay(task: Task): string {
  if (task.completedAt) {
    const d = new Date(task.completedAt)
    if (!Number.isNaN(d.getTime())) return dateKey(d)
  }
  return task.lastCompletedDate || ''
}

/**
 * Is this task's completion stale?
 *
 * A `daily` task belongs to today; a `weekly` task belongs to the current
 * week. Anything completed in an earlier period is a leftover that has to be
 * cleared, and `once` tasks never reset.
 *
 * Deriving this from the task itself — rather than from a one-shot "the reset
 * already ran" flag — is what makes the reset self-healing. The old flag was
 * written to localStorage the moment the reset was requested, so if the reset
 * was then lost (a cloud snapshot restoring last week's state, a sign-in that
 * resolved after the reset had already been written, a cleared localStorage)
 * the flag said "already done" and the stale checks were never cleared again.
 * Deriving it means a stale check is cleared whenever it shows up, no matter
 * how it got there.
 */
export function isStaleCompletion(
  task: Task,
  today: string,
  weekStart: string,
): boolean {
  if (!task.completed) return false
  const freq = task.frequency || 'once'
  if (freq === 'once') return false
  const done = taskCompletionDay(task)
  // Completed but we cannot tell when — treat it as a leftover, otherwise it
  // would never reset.
  if (!done) return true
  return freq === 'daily' ? done < today : done < weekStart
}

/**
 * Clear every completion that belongs to an earlier period.
 *
 * Returns the input object untouched when there is nothing to clear, so
 * callers can use the reference to detect "no change" and skip the write.
 */
export function clearStaleCompletions(prev: TaskData): TaskData {
  const today = dateKey()
  const weekStart = getWeekKey()
  let changed = false
  const categories = prev.categories.map(cat => {
    let catChanged = false
    const tasks = cat.tasks.map(t => {
      if (!isStaleCompletion(t, today, weekStart)) return t
      catChanged = true
      return { ...t, completed: false, completedAt: '', reminderFired: false }
    })
    if (!catChanged) return cat
    changed = true
    return { ...cat, tasks }
  })
  return changed ? { ...prev, categories } : prev
}

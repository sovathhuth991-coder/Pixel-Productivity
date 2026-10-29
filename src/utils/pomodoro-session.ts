// ─── Persisted Pomodoro session ─────────────────────────────────────────
//
// The timer used to live entirely in React state: a reload (or iOS evicting
// the PWA in the background) silently threw away a 25-minute session. The
// wall-clock end time is the only thing that actually needs saving — the
// remaining seconds can be recomputed from it on the next load.

import type { Task } from '../types/tasks'

export type StoredTimerMode = 'work' | 'shortBreak' | 'longBreak'

export interface StoredActiveTask {
  categoryId: string
  task: Task
}

export interface StoredPomodoroSession {
  version: 1
  mode: StoredTimerMode
  isRunning: boolean
  /** Epoch ms when the interval ends; only meaningful while running. */
  endAt: number | null
  /** Seconds left while paused. */
  remaining: number
  /** Epoch ms when this interval was started (for the Obsidian log). */
  startedAt: number | null
  activeTask: StoredActiveTask | null
  sessionsCompleted: number
  totalSessions: number
  savedAt: number
}

export const POMODORO_SESSION_KEY = 'pixel_pomodoro_session'

const MODES: StoredTimerMode[] = ['work', 'shortBreak', 'longBreak']
const MAX_REMAINING = 12 * 60 * 60 // a session longer than 12h is corrupt

function isMode(value: unknown): value is StoredTimerMode {
  return typeof value === 'string' && (MODES as string[]).includes(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Read and validate the saved session.
 *
 * Anything malformed is rejected rather than partially trusted: a bad
 * `endAt` from an older build must not leave the UI counting down to 1970.
 */
export function readStoredSession(): StoredPomodoroSession | null {
  try {
    const raw = localStorage.getItem(POMODORO_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredPomodoroSession>
    if (!parsed || parsed.version !== 1) return null
    if (!isMode(parsed.mode)) return null
    if (typeof parsed.isRunning !== 'boolean') return null
    if (!isFiniteNumber(parsed.remaining)) return null
    if (parsed.remaining < 0) return null
    if (parsed.endAt != null && !isFiniteNumber(parsed.endAt)) return null
    if (parsed.startedAt != null && !isFiniteNumber(parsed.startedAt)) return null

    const activeTask =
      parsed.activeTask &&
      typeof parsed.activeTask === 'object' &&
      typeof (parsed.activeTask as StoredActiveTask).categoryId === 'string' &&
      (parsed.activeTask as StoredActiveTask).task &&
      typeof (parsed.activeTask as StoredActiveTask).task.id === 'string'
        ? (parsed.activeTask as StoredActiveTask)
        : null

    return {
      version: 1,
      mode: parsed.mode,
      isRunning: parsed.isRunning,
      endAt: parsed.endAt ?? null,
      remaining: Math.min(Math.floor(parsed.remaining), MAX_REMAINING),
      startedAt: parsed.startedAt ?? null,
      activeTask,
      sessionsCompleted: isFiniteNumber(parsed.sessionsCompleted) ? Math.max(0, parsed.sessionsCompleted) : 0,
      totalSessions: isFiniteNumber(parsed.totalSessions) ? Math.max(0, parsed.totalSessions) : 0,
      savedAt: isFiniteNumber(parsed.savedAt) ? parsed.savedAt : 0,
    }
  } catch {
    return null
  }
}

export function writeStoredSession(session: StoredPomodoroSession): void {
  try {
    localStorage.setItem(POMODORO_SESSION_KEY, JSON.stringify(session))
  } catch {
    /* quota or private mode — the timer still runs for this session */
  }
}

export function clearStoredSession(): void {
  try {
    localStorage.removeItem(POMODORO_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

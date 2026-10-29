import { useCallback, useRef, useEffect } from 'react'
import { useSyncedStorage } from './useSyncedStorage'
import type {
  TaskData, Task, Category, StreakData, ActivityItem,
  FreqStats, GlobalStats, CategoryProgress, FreqNotification,
  Frequency, Priority
} from '../types/tasks'
import { sendBrowserNotification } from '../utils/notifications'
import {
  recordTaskCompleted,
  recordTaskUncompleted,
  recordTaskAdded,
  recordTaskDeleted,
  dateKey,
} from '../utils/weekly-report'
import { clearStaleCompletions, getPreviousDayKey, getPreviousWeekKey, getWeekKey } from '../utils/taskReset'

const DEFAULT_DATA: TaskData = {
  categories: [
    {
      id: 'cat_1',
      name: 'My Tasks',
      color: '#b53823',
      tasks: [
        {
          id: 'd1', title: 'Morning workout', description: '30 minutes exercise',
          frequency: 'daily', completed: false, createdAt: new Date().toISOString(),
          streak: 0, lastCompletedDate: '', completedAt: '', priority: 'medium',
          reminder: { enabled: false, time: '09:00', date: '' },
          pomodorosSpent: 0
        },
        {
          id: 'd2', title: 'Read for 20 minutes', description: 'Read a book or article',
          frequency: 'daily', completed: false, createdAt: new Date().toISOString(),
          streak: 0, lastCompletedDate: '', completedAt: '', priority: 'low',
          reminder: { enabled: false, time: '09:00', date: '' },
          pomodorosSpent: 0
        },
        {
          id: 'd3', title: 'Buy new headphones', description: 'Order from Amazon',
          frequency: 'once', completed: true, createdAt: new Date().toISOString(),
          streak: 0, lastCompletedDate: '', completedAt: new Date().toISOString(), priority: 'high',
          reminder: { enabled: false, time: '09:00', date: '' },
          pomodorosSpent: 0
        },
      ],
    },
  ],
}

/**
 * Fill in fields that older records may be missing.
 *
 * Returns the input untouched when there is nothing to fix, so the caller can
 * use the reference to detect "no change" and skip the write.
 */
function sanitizeTaskData(raw: TaskData): TaskData {
  if (!raw || !Array.isArray(raw.categories)) return DEFAULT_DATA
  let changed = false
  const categories = raw.categories.map(cat => {
    let catChanged = false
    const tasks = (cat.tasks || []).map(task => {
      const pomodorosSpent =
        typeof task.pomodorosSpent === 'number' ? task.pomodorosSpent : 0
      const frequency = task.frequency || 'once'
      const priority = task.priority || 'medium'
      const streak = typeof task.streak === 'number' ? task.streak : 0
      const lastCompletedDate = task.lastCompletedDate || ''
      const completedAt = task.completedAt || ''
      const reminder = task.reminder || { enabled: false, time: '09:00', date: '' }

      const same =
        pomodorosSpent === task.pomodorosSpent &&
        frequency === task.frequency &&
        priority === task.priority &&
        streak === task.streak &&
        lastCompletedDate === task.lastCompletedDate &&
        completedAt === task.completedAt &&
        reminder === task.reminder

      if (same) return task
      catChanged = true
      return {
        ...task,
        pomodorosSpent,
        frequency,
        priority,
        streak,
        lastCompletedDate,
        completedAt,
        reminder,
      }
    })
    if (!catChanged) return cat
    changed = true
    return { ...cat, tasks }
  })
  return changed ? { ...raw, categories } : raw
}

/**
 * The next value of a task's streak badge.
 *
 * The badge counts CONSECUTIVE periods, not total completions. It used to
 * be a lifetime counter — incremented on every completion and never
 * decremented — so a daily task completed on Monday, skipped on Tuesday
 * and completed again on Wednesday showed "3d". Nothing ever broke it.
 *
 * The chain is now derived from the last completion date, which survives
 * the daily/weekly reset (the reset clears `completed`, not
 * `lastCompletedDate`):
 * - daily: continuing means the task was completed *yesterday*.
 * - weekly: continuing means the task was completed in the previous week.
 *
 * `task` is the task as it was *before* this completion — `lastCompletedDate`
 * must be the previous one, not today's.
 */
function nextStreak(task: Task, today: string): number {
  const freq = task.frequency || 'once'
  // A one-off task has no streak.
  if (freq === 'once') return 0

  const last = task.lastCompletedDate
  if (!last) return 1
  // Already counted today (the task was completed, un-completed and
  // completed again) — do not count the same day twice.
  if (last === today) return task.streak || 1

  // A streak that is missing (older records, a snapshot that arrived before
  // the sanitizer ran) must not turn the badge into NaN.
  const current = task.streak || 0

  if (freq === 'daily') {
    return last === getPreviousDayKey() ? current + 1 : 1
  }

  // Weekly: the chain continues if the previous completion fell in the
  // week before the current one.
  const thisWeek = getWeekKey()
  const prevWeek = getPreviousWeekKey()
  // Already completed in the current week — un-checking and re-checking it
  // must not restart the chain.
  if (last >= thisWeek) return current || 1
  return last >= prevWeek ? current + 1 : 1
}

/**
 * The demo list a brand new browser starts with.
 *
 * It is the app's sample content, not user data — but it is also the list
 * most people simply keep. So a task counts as "demo" only while it still
 * carries the seed's title, description, frequency and priority. The moment
 * the user renames it, edits it or changes its frequency, it is their task
 * and must never be filtered out of a merge.
 */
const SEED_TASK_IDS = new Set(['d1', 'd2', 'd3'])
const SEED_CATEGORY_IDS = new Set(['cat_1'])
const SEED_TASKS = new Map(
  DEFAULT_DATA.categories.flatMap(c => c.tasks).map(t => [t.id, t]),
)

/** Is this task still exactly as the app shipped it? */
function isUntouchedSeedTask(task: Task): boolean {
  if (!SEED_TASK_IDS.has(task.id)) return false
  const seed = SEED_TASKS.get(task.id)
  if (!seed) return false
  return (
    task.title === seed.title &&
    task.description === seed.description &&
    task.frequency === seed.frequency &&
    task.priority === seed.priority
  )
}

/**
 * Union two task trees by category id and task id.
 *
 * Used for the first contact with the cloud. A browser that held a real
 * task list before it ever signed in has the only copy of that list; if
 * another device created the cloud document first, the plain
 * last-write-wins rule would hand that (possibly empty) document over and
 * wipe the tasks.
 *
 * The remote task wins on a conflict — it is the shared state — and a
 * local task the remote does not have is rescued rather than dropped. The
 * merge runs once per account; after that the normal last-write-wins
 * behaviour applies, so deletions still propagate.
 */
function mergeTaskData(local: TaskData, remote: TaskData): TaskData {
  if (!local || !Array.isArray(local.categories)) return remote
  if (!remote || !Array.isArray(remote.categories)) return local

  const byId = new Map<string, Category>()
  for (const cat of remote.categories) {
    byId.set(cat.id, { ...cat, tasks: [...(cat.tasks || [])] })
  }
  for (const cat of local.categories) {
    const existing = byId.get(cat.id)
    const tasks = cat.tasks || []

    // The demo category, untouched, is the app's sample list rather than
    // user data, so it is not carried into a real task list. As soon as
    // anything in it was renamed, edited or checked off, the whole category
    // belongs to the user and all of it comes along.
    const untouchedDemoCategory =
      SEED_CATEGORY_IDS.has(cat.id) && tasks.length > 0 && tasks.every(isUntouchedSeedTask)
    if (!existing && untouchedDemoCategory) continue

    const localTasks = untouchedDemoCategory ? [] : [...tasks]
    if (!existing) {
      byId.set(cat.id, { ...cat, tasks: localTasks })
      continue
    }
    const knownIds = new Set(existing.tasks.map(t => t.id))
    const merged = [...existing.tasks]
    for (const t of localTasks) {
      if (!knownIds.has(t.id)) merged.push(t)
    }
    // The remote category wins on a conflict — it is the shared state.
    byId.set(cat.id, { ...existing, tasks: merged })
  }
  return { ...remote, categories: [...byId.values()] }
}

export function useTaskManager() {
  const [data, setData] = useSyncedStorage<TaskData>('taskmanager_tasks', DEFAULT_DATA, {
    mergeOnFirstContact: mergeTaskData,
  })
  const [streak, setStreak] = useSyncedStorage<StreakData>('taskmanager_streak', { current: 0, best: 0, lastDate: null })
  const [activity, setActivity] = useSyncedStorage<ActivityItem[]>('taskmanager_activity', [])
  const [completionHistory, setCompletionHistory] = useSyncedStorage<Record<string, number>>('taskmanager_completion_history', {})
  const notificationTimers = useRef<Record<string, number>>({})
  // The reminder callbacks run long after they were scheduled, so they must
  // not close over the categories as they were at scheduling time — a task
  // renamed or deleted in the meantime would not be found, or would be
  // reported under its old name.
  const categoriesRef = useRef(data.categories)
  categoriesRef.current = data.categories

  // The setter captured on the first render closes over a `setStoredValue`
  // that was built before Firebase auth had resolved, so it did not know
  // about the signed-in user and wrote to localStorage only. Routing every
  // reset through this ref means the reset always uses the current setter
  // and therefore actually reaches the cloud.
  const setDataRef = useRef(setData)
  setDataRef.current = setData

  // ─── Auto reset & data migration on mount ────────────────────────
  useEffect(() => {
    // Clear any completion that belongs to an earlier day or week, and fill
    // in fields that older records may be missing.
    //
    // This replaces a one-shot "the weekly reset already ran" flag. That flag
    // was written to localStorage as soon as the reset was requested, which
    // meant a reset that got lost — because a cloud snapshot restored last
    // week's state, or because the sign-in that lets the write reach the
    // cloud had not resolved yet — was never retried, and the stale checks
    // stayed on screen for good. Deriving the correct state from the tasks
    // themselves makes this self-healing: it runs again on every tick and
    // whenever the data changes, and it only writes when there is genuinely
    // something to clear.
    const applyResets = () => {
      setDataRef.current(prev => clearStaleCompletions(sanitizeTaskData(prev)))
    }

    // Run once immediately, then every minute, and again whenever the tab
    // regains focus / becomes visible — so crossing midnight (daily) or the
    // Sunday week boundary is caught even if the page was backgrounded.
    applyResets()
    const interval = setInterval(applyResets, 60_000)
    const onResume = () => applyResets()
    window.addEventListener('focus', onResume)
    document.addEventListener('visibilitychange', onResume)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onResume)
      document.removeEventListener('visibilitychange', onResume)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-check whenever the task data itself changes. Without this, a stale
  // cloud snapshot landing after the mount-time pass would leave the old
  // checks on screen until the next tick. `clearStaleCompletions` returns the
  // same object when there is nothing to clear, so this never writes in a
  // loop.
  useEffect(() => {
    setDataRef.current(prev => clearStaleCompletions(sanitizeTaskData(prev)))
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Category CRUD ────────────────────────────────────────────────
  const addCategory = useCallback((name: string, color: string) => {
    const newCat: Category = {
      id: 'cat_' + Date.now(),
      name,
      color,
      tasks: []
    }
    setData(prev => ({ ...prev, categories: [...prev.categories, newCat] }))
    logActivity('added', `Created category "${name}"`)
    return newCat
  }, [setData]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateCategory = useCallback((id: string, updates: Partial<Pick<Category, 'name' | 'color'>>) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === id ? { ...c, ...updates } : c)
    }))
  }, [setData])

  const deleteCategory = useCallback((id: string) => {
    const cat = data.categories.find(c => c.id === id)
    if (cat) {
      logActivity('deleted', `Deleted category "${cat.name}"`)
      // Drop the pending reminder timers for the tasks that go with the
      // category, otherwise a notification fires for a task that no longer
      // exists.
      cat.tasks.forEach(t => {
        const timerId = notificationTimers.current[t.id]
        if (timerId !== undefined) {
          clearTimeout(timerId)
          delete notificationTimers.current[t.id]
        }
      })
    }
    setData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== id)
    }))
  }, [data.categories, setData]) // eslint-disable-line react-hooks/exhaustive-deps

  const getCategory = useCallback((id: string): Category | undefined => {
    return data.categories.find(c => c.id === id)
  }, [data.categories])

  // ─── Task CRUD ────────────────────────────────────────────────────
  const addTask = useCallback((categoryId: string, taskInput: {
    title: string; description?: string; frequency?: Frequency; priority?: Priority;
    completed?: boolean; pomodorosSpent?: number; streak?: number;
  }) => {
    const newTask: Task = {
      id: 'task_' + Date.now(),
      title: taskInput.title,
      description: taskInput.description || '',
      frequency: taskInput.frequency || 'daily',
      priority: taskInput.priority || 'medium',
      completed: taskInput.completed || false,
      createdAt: new Date().toISOString(),
      completedAt: taskInput.completed ? new Date().toISOString() : '',
      streak: taskInput.streak || 0,
      // Stamp the completion day so a task created already-checked still
      // resets at the right period boundary.
      lastCompletedDate: taskInput.completed ? dateKey() : '',
      reminder: { enabled: false, time: '09:00', date: '' },
      pomodorosSpent: taskInput.pomodorosSpent || 0
    }
    setData(prev => {
      const updated = {
        ...prev,
        categories: prev.categories.map(c =>
          c.id === categoryId ? { ...c, tasks: [...c.tasks, newTask] } : c
        )
      }
      const cat = prev.categories.find(c => c.id === categoryId)
      logActivity('added', `Added "${taskInput.title}" to ${cat?.name}`)
      recordTaskAdded(newTask, cat)
      return updated
    })
    return newTask
  }, [setData]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateTask = useCallback((categoryId: string, taskId: string, updates: Partial<Task>) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(c =>
        c.id === categoryId
          ? { ...c, tasks: c.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) }
          : c
      )
    }))
  }, [setData])

  const deleteTask = useCallback((categoryId: string, taskId: string) => {
    if (notificationTimers.current[taskId]) {
      clearTimeout(notificationTimers.current[taskId])
      delete notificationTimers.current[taskId]
    }
    setData(prev => {
      const cat = prev.categories.find(c => c.id === categoryId)
      const task = cat?.tasks.find(t => t.id === taskId)
      if (task) {
        logActivity('deleted', `Deleted "${task.title}" from ${cat?.name}`)
        recordTaskDeleted(task, cat)
      }
      return {
        ...prev,
        categories: prev.categories.map(c =>
          c.id === categoryId
            ? { ...c, tasks: c.tasks.filter(t => t.id !== taskId) }
            : c
        )
      }
    })
  }, [setData]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Re-insert a deleted task at its original position, keeping its original
   * ID so completion history, streaks and pomodoro counts survive the
   * delete → undo round trip. Powers the undo affordance on task deletion.
   */
  const restoreTask = useCallback(
    (categoryId: string, task: Task, index?: number) => {
      setData(prev => {
        const cat = prev.categories.find(c => c.id === categoryId)
        // The report buffer needs the matching "added" event. Without it the
        // weekly report kept the "deleted" line for a task that was still
        // there, and the event total was wrong.
        if (cat) recordTaskAdded(task, cat)
        return {
          ...prev,
          categories: prev.categories.map(c => {
            if (c.id !== categoryId) return c
            const tasks = [...c.tasks]
            const at =
              typeof index === 'number' && index >= 0 && index <= tasks.length ? index : tasks.length
            tasks.splice(at, 0, task)
            return { ...c, tasks }
          }),
        }
      })
    },
    [setData],
  )

  const toggleTask = useCallback((categoryId: string, taskId: string) => {
    // Local date, not UTC. `toISOString()` is UTC, so in any timezone behind
    // Greenwich a task completed before 07:00 local would be stamped with
    // yesterday's date — which then looks like a stale completion and gets
    // cleared by the reset.
    const today = dateKey()
    setData(prev => {
      const cat = prev.categories.find(c => c.id === categoryId)
      const task = cat?.tasks.find(t => t.id === taskId)
      if (!task) return prev
      const wasCompleted = task.completed
      const newCompleted = !wasCompleted
      const updatedCategories = prev.categories.map(c => {
        if (c.id !== categoryId) return c
        return {
          ...c,
          tasks: c.tasks.map(t => {
            if (t.id !== taskId) return t
            return {
              ...t,
              completed: newCompleted,
              completedAt: newCompleted ? new Date().toISOString() : '',
              lastCompletedDate: newCompleted ? today : t.lastCompletedDate,
              streak: newCompleted ? nextStreak(t, today) : t.streak
            }
          })
        }
      })
      // Side effects
      if (newCompleted) {
        logActivity('completed', `Completed "${task.title}" in ${cat?.name}`)
        recordTaskCompleted({ ...task, completed: true, completedAt: new Date().toISOString() }, cat)
        updateStreakOnComplete()
        setCompletionHistory(prevHist => ({
          ...prevHist,
          [today]: (prevHist[today] || 0) + 1
        }))
      } else {
        logActivity('added', `Uncompleted "${task.title}" in ${cat?.name}`)
        recordTaskUncompleted(task, cat)
        // The daily chart, the heatmap and the weekly bars are all built
        // from this map. Without the decrement, un-checking a task left the
        // day counting it as a completion — so the charts disagreed with
        // the report buffer, which does record the un-completion.
        setCompletionHistory(prevHist => {
          const current = prevHist[today] || 0
          if (current <= 0) return prevHist
          return { ...prevHist, [today]: current - 1 }
        })
      }
      return {
        ...prev,
        categories: updatedCategories
      }
    })
  }, [setData]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Pomodoro Integration ─────────────────────────────────────────
  const incrementPomodoro = useCallback((categoryId: string, taskId: string) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(c =>
        c.id === categoryId
          ? {
              ...c,
              tasks: c.tasks.map(t =>
                t.id === taskId ? { ...t, pomodorosSpent: (t.pomodorosSpent || 0) + 1 } : t
              )
            }
          : c
      )
    }))
  }, [setData])

  // ─── Stats ────────────────────────────────────────────────────────
  const getStats = useCallback((): GlobalStats => {
    let total = 0, completed = 0
    data.categories.forEach(cat => {
      total += cat.tasks.length
      completed += cat.tasks.filter(t => t.completed).length
    })
    return {
      total,
      completed,
      pending: total - completed,
      progress: total ? Math.round((completed / total) * 100) : 0
    }
  }, [data.categories])

  const getCategoryProgress = useCallback((categoryId: string): CategoryProgress => {
    const cat = data.categories.find(c => c.id === categoryId)
    if (!cat || cat.tasks.length === 0) return { completed: 0, total: 0, percent: 0 }
    const completed = cat.tasks.filter(t => t.completed).length
    return {
      completed,
      total: cat.tasks.length,
      percent: Math.round((completed / cat.tasks.length) * 100)
    }
  }, [data.categories])

  const getFrequencyStats = useCallback((categoryId: string, frequency: Frequency): FreqStats => {
    const cat = data.categories.find(c => c.id === categoryId)
    if (!cat) return { total: 0, completed: 0, percent: 0 }
    const tasks = cat.tasks.filter(t => (t.frequency || 'once') === frequency)
    const total = tasks.length
    const completed = tasks.filter(t => t.completed).length
    return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 }
  }, [data.categories])

  const getGlobalFreqStats = useCallback(() => {
    const stats = { daily: { total: 0, completed: 0 }, weekly: { total: 0, completed: 0 }, once: { total: 0, completed: 0 } }
    data.categories.forEach(cat => {
      cat.tasks.forEach(t => {
        const freq = (t.frequency || 'once') as Frequency
        if (stats[freq]) {
          stats[freq].total++
          if (t.completed) stats[freq].completed++
        }
      })
    })
    return stats
  }, [data.categories])

  // ─── Activity ─────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  function logActivity(type: ActivityItem['type'], text: string) {
    setActivity(prev => {
      const newLog = [{ type, text, time: Date.now() }, ...prev]
      return newLog.slice(0, 50)
    })
  }

  // ─── Streaks ──────────────────────────────────────────────────────
  function updateStreakOnComplete() {
    // Local date — a streak should break at the user's midnight, not at
    // 07:00 local / 00:00 UTC.
    const today = dateKey()
    setStreak(prev => {
      if (prev.lastDate === today) return prev
      let current = prev.current
      if (prev.lastDate === null) {
        current = 1
      } else {
        const lastDateObj = new Date(prev.lastDate)
        const todayObj = new Date(today)
        const diffDays = Math.floor((todayObj.getTime() - lastDateObj.getTime()) / 86400000)
        if (diffDays === 1) {
          current = prev.current + 1
        } else if (diffDays > 1) {
          current = 1
        }
      }
      return {
        current,
        best: Math.max(prev.best, current),
        lastDate: today
      }
    })
  }

  const getWeeklyActivity = useCallback(() => {
    const now = new Date()
    const days: { day: string; date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = dateKey(d)
      const dayName = d.toLocaleDateString('en', { weekday: 'short' })
      let count = 0
      data.categories.forEach(cat => {
        cat.tasks.forEach(task => {
          if (task.lastCompletedDate === dateStr) count++
        })
      })
      days.push({ day: dayName, date: dateStr, count })
    }
    return days
  }, [data.categories])

  // ─── Frequency notifications ──────────────────────────────────────
  const getFreqNotification = useCallback((freq: Frequency): FreqNotification => {
    try {
      const raw = localStorage.getItem('taskmanager_freq_notif_' + freq)
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return { enabled: false, time: '09:00', message: '' }
  }, [])

  const saveFreqNotification = useCallback((freq: Frequency, notifData: FreqNotification) => {
    localStorage.setItem('taskmanager_freq_notif_' + freq, JSON.stringify(notifData))
  }, [])

  const updateTaskReminder = useCallback((categoryId: string, taskId: string, reminder: Partial<Task['reminder']>) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.map(c =>
        c.id === categoryId
          ? {
              ...c,
              tasks: c.tasks.map(t =>
                t.id === taskId ? { ...t, reminder: { ...t.reminder, ...reminder } } : t
              )
            }
          : c
      )
    }))
  }, [setData])

  // ─── Task Reminder Scheduler ────────────────────────────────────────
  const scheduleTaskReminder = useCallback((categoryId: string, taskId: string, reminder: Task['reminder']) => {
    // Always drop the timer that is already pending for this task first.
    // Overwriting the handle left the old timer alive, so the reminder
    // fired twice and the activity log got two "reminder fired" entries.
    const existing = notificationTimers.current[taskId]
    if (existing !== undefined) {
      clearTimeout(existing)
      delete notificationTimers.current[taskId]
    }

    if (!reminder.enabled) return

    const [hours, minutes] = reminder.time.split(':').map(Number)
    const now = new Date()
    
    // Calculate next reminder time
    const nextReminder = new Date(now)
    nextReminder.setHours(hours, minutes, 0, 0)
    
    // If time has passed today, schedule for tomorrow
    if (nextReminder <= now) {
      nextReminder.setDate(nextReminder.getDate() + 1)
    }

    const timeUntilReminder = nextReminder.getTime() - now.getTime()

    // Set timer if reminder is enabled
    const timerId = window.setTimeout(() => {
      const task = categoriesRef.current.find(c => c.id === categoryId)?.tasks.find(t => t.id === taskId)
      if (task) {
        sendBrowserNotification('⏰ Task Reminder', {
          body: `Reminder for "${task.title}"`,
        })
        logActivity('reminder_fired', `Reminder fired for "${task.title}"`)
      }
      delete notificationTimers.current[taskId]
    }, timeUntilReminder)

    notificationTimers.current[taskId] = timerId
  }, [])

  // Clear all pending reminders and reschedule for tasks that need them
  const rescheduleAllReminders = useCallback(() => {
    // Clear existing timers
    Object.values(notificationTimers.current).forEach(timerId => {
      clearTimeout(timerId)
    })
    notificationTimers.current = {}

    // Schedule new reminders
    data.categories.forEach(cat => {
      cat.tasks.forEach(task => {
        if (task.reminder?.enabled && !task.completed) {
          scheduleTaskReminder(cat.id, task.id, task.reminder)
        }
      })
    })
  }, [data.categories, scheduleTaskReminder])

  // Schedule reminders when data changes
  useEffect(() => {
    rescheduleAllReminders()
    // Clear the pending timers when the provider unmounts. Without this the
    // timers outlived the component and fired notifications for tasks that
    // were no longer on screen. On a dependency change the cleanup runs
    // first, and `rescheduleAllReminders` below re-arms them.
    return () => {
      Object.values(notificationTimers.current).forEach(timerId => {
        clearTimeout(timerId)
      })
      notificationTimers.current = {}
    }
  }, [rescheduleAllReminders])

  return {
    data,
    streak,
    activity,
    completionHistory,

    // Category
    addCategory,
    updateCategory,
    deleteCategory,
    getCategory,

    // Task
    addTask,
    updateTask,
    deleteTask,
    restoreTask,
    toggleTask,
    updateTaskReminder,

    // Stats
    getStats,
    getCategoryProgress,
    getFrequencyStats,
    getGlobalFreqStats,
    getWeeklyActivity,

    // Activity
    logActivity,

    // Notifications
    getFreqNotification,
    saveFreqNotification,

    // Task Reminder Scheduler
    scheduleTaskReminder,
    rescheduleAllReminders,

    // Pomodoro
    incrementPomodoro,
  }
}

export type TaskManagerReturn = ReturnType<typeof useTaskManager>

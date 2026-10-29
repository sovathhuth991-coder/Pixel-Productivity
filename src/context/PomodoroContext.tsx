import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { Task } from '../types/tasks'
import { useTaskContext } from './TaskContext'
import { playBeep, playComplete, isAudioMuted, toggleAudioMuted } from '../utils/audio'
import { sendBrowserNotification, requestNotificationPermission } from '../utils/notifications'
import { autoLogSession, logTaskCompletion, type PomodoroSaleToObsidian, type TaskLogEntry } from '../utils/obsidian-sync'
import { recordPomodoroFinished, recordPomodoroSession } from '../utils/weekly-report'

export type TimerMode = 'work' | 'shortBreak' | 'longBreak'

export interface PomodoroSettings {
  workDuration: number // minutes
  shortBreakDuration: number // minutes
  longBreakDuration: number // minutes
  longBreakInterval: number // sessions before long break
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
}

export interface ObsidianSettings {
  enabled: boolean
  vaultPath: string
  gatewayUrl: string
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
}

export const DEFAULT_OBSIDIAN_SETTINGS: ObsidianSettings = {
  enabled: false,
  vaultPath: '',
  gatewayUrl: 'http://localhost:5789',
}

// Fallback exported object for backwards compatibility
export const TIMER_CONFIG = {
  work: DEFAULT_POMODORO_SETTINGS.workDuration * 60,
  shortBreak: DEFAULT_POMODORO_SETTINGS.shortBreakDuration * 60,
  longBreak: DEFAULT_POMODORO_SETTINGS.longBreakDuration * 60,
}

export interface ActiveTaskInfo {
  categoryId: string
  task: Task
}

interface PomodoroContextType {
  // Timer state
  mode: TimerMode
  timeLeft: number
  isRunning: boolean
  sessionsCompleted: number
  totalSessions: number
  progress: number

  // Settings
  settings: PomodoroSettings
  updateSettings: (newSettings: Partial<PomodoroSettings>) => void
  obsidianSettings: ObsidianSettings
  updateObsidianSettings: (newSettings: Partial<ObsidianSettings>) => void
  resetSettings: () => void

  // Active task
  activeTask: ActiveTaskInfo | null
  showCompletePrompt: boolean
  completedTaskCandidate: ActiveTaskInfo | null

  // Sound & Notifications
  isMuted: boolean

  // Actions
  setMode: (mode: TimerMode) => void
  handleStart: () => void
  handlePause: () => void
  handleReset: () => void
  handleSkip: () => void
  setActiveTask: (task: ActiveTaskInfo | null) => void
  toggleMute: () => void
  closeCompletePrompt: () => void
  confirmCompleteTask: () => void
}

const PomodoroContext = createContext<PomodoroContextType | null>(null)

function getStoredSettings(): PomodoroSettings {
  try {
    const raw = localStorage.getItem('pixel_pomodoro_settings')
    if (raw) {
      return { ...DEFAULT_POMODORO_SETTINGS, ...JSON.parse(raw) }
    }
  } catch {
    // fallback
  }
  return DEFAULT_POMODORO_SETTINGS
}

function getStoredObsidianSettings(): ObsidianSettings {
  try {
    const raw = localStorage.getItem('pixel_obsidian_settings')
    if (raw) {
      return { ...DEFAULT_OBSIDIAN_SETTINGS, ...JSON.parse(raw) }
    }
  } catch {
    // fallback
  }
  return DEFAULT_OBSIDIAN_SETTINGS
}

function getDurationSeconds(mode: TimerMode, settings: PomodoroSettings): number {
  switch (mode) {
    case 'work':
      return Math.max(1, settings.workDuration) * 60
    case 'shortBreak':
      return Math.max(1, settings.shortBreakDuration) * 60
    case 'longBreak':
      return Math.max(1, settings.longBreakDuration) * 60
  }
}

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { incrementPomodoro, toggleTask, getCategory } = useTaskContext()

  const [settings, setSettings] = useState<PomodoroSettings>(getStoredSettings)
  const [obsidianSettings, setObsidianSettings] = useState<ObsidianSettings>(getStoredObsidianSettings)

  const [mode, setModeState] = useState<TimerMode>('work')
  const [timeLeft, setTimeLeft] = useState<number>(() => getDurationSeconds('work', settings))
  const [isRunning, setIsRunning] = useState(false)
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const [totalSessions, setTotalSessions] = useState(0)
  const [activeTask, setActiveTask] = useState<ActiveTaskInfo | null>(null)
  const [showCompletePrompt, setShowCompletePrompt] = useState(false)
  const [completedTaskCandidate, setCompletedTaskCandidate] = useState<ActiveTaskInfo | null>(null)
  const [isMuted, setIsMutedState] = useState(isAudioMuted())

  // Keep references for interval callback
  const sessionStartRef = useRef<Date | null>(null)
  const lastTickRef = useRef<number>(Date.now())
  const activeTaskRef = useRef<ActiveTaskInfo | null>(activeTask)
  const timerEndRef = useRef<number>(0)
  const timeLeftRef = useRef<number>(0)
  lastTickRef.current = Date.now()
  timeLeftRef.current = timeLeft
  activeTaskRef.current = activeTask

  const settingsRef = useRef<PomodoroSettings>(settings)
  settingsRef.current = settings

  const obsidianSettingsRef = useRef<ObsidianSettings>(obsidianSettings)
  obsidianSettingsRef.current = obsidianSettings

  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings }
      try {
        localStorage.setItem('pixel_pomodoro_settings', JSON.stringify(updated))
      } catch (e) {
        console.warn('Failed to save settings:', e)
      }
      return updated
    })
  }, [])

  const updateObsidianSettings = useCallback((newObsidian: Partial<ObsidianSettings>) => {
    setObsidianSettings(prev => {
      const updated = { ...prev, ...newObsidian }
      try {
        localStorage.setItem('pixel_obsidian_settings', JSON.stringify(updated))
      } catch (e) {
        console.warn('Failed to save obsidian settings:', e)
      }
      return updated
    })
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_POMODORO_SETTINGS)
    try {
      localStorage.setItem('pixel_pomodoro_settings', JSON.stringify(DEFAULT_POMODORO_SETTINGS))
    } catch {}
    setTimeLeft(getDurationSeconds(mode, DEFAULT_POMODORO_SETTINGS))
  }, [mode])

  // Sync timeLeft when idle if settings change duration for current mode
  useEffect(() => {
    if (!isRunning) {
      const targetDuration = getDurationSeconds(mode, settings)
      setTimeLeft(targetDuration)
    }
  }, [settings.workDuration, settings.shortBreakDuration, settings.longBreakDuration, mode, isRunning])

  const toggleMute = useCallback(() => {
    const next = toggleAudioMuted()
    setIsMutedState(next)
  }, [])

  const switchMode = useCallback((newMode: TimerMode) => {
    setModeState(newMode)
    setTimeLeft(getDurationSeconds(newMode, settingsRef.current))
    setIsRunning(false)
  }, [])

  const handleStart = useCallback(() => {
    if (!isRunning) {
      requestNotificationPermission()
      sessionStartRef.current = new Date()
      // Seed a wall-clock end time so the interval can count down exactly
      // one second per second (no drift / skipped ticks).
      timerEndRef.current = Date.now() + timeLeftRef.current * 1000
      lastTickRef.current = Date.now()
      setIsRunning(true)
      playBeep()
    }
  }, [isRunning])

  const handlePause = useCallback(() => {
    setIsRunning(false)
  }, [])

  const handleReset = useCallback(() => {
    setIsRunning(false)
    sessionStartRef.current = null
    setTimeLeft(getDurationSeconds(mode, settingsRef.current))
  }, [mode])

  const handleSkip = useCallback(() => {
    setIsRunning(false)
    if (mode === 'work') {
      switchMode('shortBreak')
    } else {
      switchMode('work')
    }
  }, [mode, switchMode])

  // Background timer interval
  useEffect(() => {
    let intervalId: number | null = null

    if (isRunning) {
      // Drive the countdown off the wall-clock end time. This updates the
      // remaining seconds exactly once per second regardless of interval
      // jitter or throttling — fixing the "moves slow / skips a beat" bug
      // where setInterval fired slightly early and a tick was skipped.
      intervalId = window.setInterval(() => {
        const remaining = Math.floor((timerEndRef.current - Date.now()) / 1000)
        setTimeLeft(prev => {
          if (prev <= 0) return 0
          return remaining <= 0 ? 0 : remaining
        })
      }, 250)
    }

    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId)
      }
    }
  }, [isRunning])

  // Completion handler
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      const now = new Date()
      setIsRunning(false)
      playComplete()

      const currentSettings = settingsRef.current
      const currentObsidian = obsidianSettingsRef.current

      if (mode === 'work') {
        const newSessions = sessionsCompleted + 1
        setSessionsCompleted(newSessions)
        setTotalSessions(prev => prev + 1)

        const currentTask = activeTaskRef.current

        if (currentTask) {
          incrementPomodoro(currentTask.categoryId, currentTask.task.id)
          setCompletedTaskCandidate(currentTask)
          setShowCompletePrompt(true)

          const cat = getCategory(currentTask.categoryId)
          const categoryName = cat?.name || 'Tasks'
          recordPomodoroFinished(currentTask.task.title, cat)
          recordPomodoroSession(now)

          // Only submit session to Obsidian if enabled
          if (currentObsidian.enabled && currentObsidian.vaultPath) {
            const startedAt = sessionStartRef.current || now
            const session: PomodoroSaleToObsidian = {
              taskId: currentTask.task.id,
              taskTitle: currentTask.task.title,
              startedAt: startedAt.toISOString(),
              finishedAt: now.toISOString(),
              duration: currentSettings.workDuration * 60,
            }
            autoLogSession(session, currentObsidian.vaultPath, currentObsidian.gatewayUrl)
            sendBrowserNotification('🍅 Focus Session Complete!', {
              body: `Finished session for "${currentTask.task.title}". Logged to Obsidian.`,
            })
          } else {
            sendBrowserNotification('🍅 Focus Session Complete!', {
              body: `Finished session for "${currentTask.task.title}"! Take a well-earned break.`,
            })
          }
        } else {
          sendBrowserNotification('🍅 Focus Session Complete!', {
            body: 'Great work! Take a break.',
          })
        }

        // Check if long break interval is reached
        const interval = Math.max(1, currentSettings.longBreakInterval || 4)
        if (newSessions % interval === 0) {
          switchMode('longBreak')
        } else {
          switchMode('shortBreak')
        }
      } else {
        sendBrowserNotification('⏰ Break Over!', {
          body: 'Ready to start another focus session?',
        })
        switchMode('work')
      }
    }
  }, [timeLeft, isRunning, mode, sessionsCompleted, switchMode, incrementPomodoro, getCategory])

  const confirmCompleteTask = useCallback(() => {
    if (completedTaskCandidate) {
      const task = completedTaskCandidate.task
      const categoryId = completedTaskCandidate.categoryId
      const cat = getCategory(categoryId)
      const liveTask = cat?.tasks.find(t => t.id === task.id)
      const wasCompleted = liveTask?.completed ?? false

      // "Mark done" means mark done. `toggleTask` flips the flag, so
      // calling it on a task that was already complete *unchecked* it — the
      // task vanished from the done column and the streak did not advance.
      // A task that is already complete needs no state change at all.
      if (!wasCompleted) {
        // `toggleTask` is the single writer for the task state *and* for
        // the report event. Recording the completion here as well wrote two
        // entries for one action, which double-counted the weekly report's
        // daily totals, its per-category list and its event total.
        toggleTask(categoryId, task.id)

        const currentObsidian = obsidianSettingsRef.current
        if (currentObsidian.enabled && currentObsidian.vaultPath) {
          const categoryName = cat?.name || 'Tasks'
          const entry: TaskLogEntry = {
            taskName: task.title,
            categoryName,
            frequency: task.frequency,
            completedAt: new Date().toISOString(),
            pomodoros: (task.pomodorosSpent || 0) + 1,
          }
          logTaskCompletion(entry, currentObsidian.vaultPath, currentObsidian.gatewayUrl)
        }
      }
    }
    setShowCompletePrompt(false)
    setCompletedTaskCandidate(null)
  }, [completedTaskCandidate, toggleTask, getCategory])

  const closeCompletePrompt = useCallback(() => {
    setShowCompletePrompt(false)
    setCompletedTaskCandidate(null)
  }, [])

  const currentDurationTotal = getDurationSeconds(mode, settings)
  const progress = currentDurationTotal > 0 ? 1 - timeLeft / currentDurationTotal : 0

  return (
    <PomodoroContext.Provider
      value={{
        mode,
        timeLeft,
        isRunning,
        sessionsCompleted,
        totalSessions,
        progress,
        settings,
        updateSettings,
        obsidianSettings,
        updateObsidianSettings,
        resetSettings,
        activeTask,
        showCompletePrompt,
        completedTaskCandidate,
        isMuted,
        setMode: switchMode,
        handleStart,
        handlePause,
        handleReset,
        handleSkip,
        setActiveTask,
        toggleMute,
        closeCompletePrompt,
        confirmCompleteTask,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  )
}

export function usePomodoroContext(): PomodoroContextType {
  const ctx = useContext(PomodoroContext)
  if (!ctx) throw new Error('usePomodoroContext must be used within a PomodoroProvider')
  return ctx
}

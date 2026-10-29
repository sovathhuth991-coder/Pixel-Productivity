// ─── Task Manager Types ─────────────────────────────────────────────

export type Frequency = 'once' | 'daily' | 'weekly'
export type Priority = 'low' | 'medium' | 'high'

export interface TaskReminder {
  enabled: boolean
  time: string
  date: string
  message?: string
}

export interface Task {
  id: string
  title: string
  description: string
  frequency: Frequency
  priority: Priority
  completed: boolean
  createdAt: string
  completedAt: string
  streak: number
  lastCompletedDate: string
  reminder: TaskReminder
  reminderFired?: boolean
  pomodorosSpent: number
}

export interface CategoryNotification {
  enabled: boolean
  time: string
  message: string
}

export interface Category {
  id: string
  name: string
  color: string
  tasks: Task[]
  notification?: CategoryNotification
}

export interface TaskData {
  categories: Category[]
}

export interface StreakData {
  current: number
  best: number
  lastDate: string | null
}

export interface ActivityItem {
  type: 'completed' | 'added' | 'deleted' | 'reminder_fired'
  text: string
  time: number
}

export interface FreqNotification {
  enabled: boolean
  time: string
  message: string
}

export interface FreqStats {
  total: number
  completed: number
  percent: number
}

export interface GlobalStats {
  total: number
  completed: number
  pending: number
  progress: number
}

export interface ActivityStats {
  total: number
  completed: number
  pending: number
  progress: number
}

export interface CategoryProgress {
  completed: number
  total: number
  percent: number
}

// ─── Bookmark Manager Types ─────────────────────────────────────────────

export interface Bookmark {
  id: string
  title: string
  url: string
  categoryId: string
  favicon: string
  description: string
  createdAt: number
  thumbnail?: string
}

export interface Folder {
  id: string
  name: string
  icon: string
  color: string
  tasks: Bookmark[]
  description: string
}
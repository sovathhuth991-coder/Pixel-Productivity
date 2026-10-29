// One definition of "a full backup", shared by Settings and the crash
// boundary. Keeping the key list in one place is what stops an export from
// quietly losing the part of the app someone adds next.

import { readBuffer, readPomodoroHistory, type ReportBuffer } from './weekly-report'
import { downloadTextFile } from './download'

export interface BackupFile {
  data: unknown
  streak: unknown
  settings: unknown
  obsidianSettings: unknown
  activity: unknown
  completionHistory: unknown
  bookmarks: unknown
  bookmarkFolders: unknown
  reportBuffer: ReportBuffer
  pomodoroHistory: Record<string, number>
  exportedAt: string
  version: string
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function collectBackup(): BackupFile {
  return {
    data: readJson('taskmanager_tasks', { categories: [] }),
    streak: readJson('taskmanager_streak', { current: 0, best: 0, lastDate: null }),
    settings: readJson('pixel_pomodoro_settings', {}),
    obsidianSettings: readJson('pixel_obsidian_settings', {}),
    activity: readJson('taskmanager_activity', []),
    completionHistory: readJson('taskmanager_completion_history', {}),
    bookmarks: readJson('pixel_bookmarks', []),
    bookmarkFolders: readJson('pixel_bookmark_folders', []),
    reportBuffer: readBuffer(),
    pomodoroHistory: readPomodoroHistory(),
    exportedAt: new Date().toISOString(),
    version: '1.2',
  }
}

export function backupFilename(now: Date = new Date()): string {
  return `pixel-productivity-backup-${now.toISOString().slice(0, 10)}.json`
}

export function downloadBackup(): void {
  downloadTextFile(
    backupFilename(),
    JSON.stringify(collectBackup(), null, 2),
    'application/json;charset=utf-8',
  )
}

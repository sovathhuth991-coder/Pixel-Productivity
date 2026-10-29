// Keys whose values are mirrored to Cloud Firestore.
//
// Two jobs, one list:
//
// 1. The migration list. `migrateLocalToCloud()` walks these keys and
//    pushes whatever is in localStorage for any of them that has no cloud
//    document yet. This is what carries a browser's history over to the
//    cloud on first sign-in.
//
// 2. The canonical list of synced keys. It is also what "Clear all data"
//    removes from Firestore, so a key that syncs but is missing here is a
//    key that survives a clear.
//
// Non-secrecy-scoped prefs (theme, animations, pomodoro durations, obsidian
// vault path) are intentionally NOT synced: they are device- or UI-specific.
export const SYNC_KEYS = [
  'taskmanager_tasks',
  'taskmanager_streak',
  'taskmanager_activity',
  'taskmanager_completion_history',
  // The weekly-report buffer, the pomodoro history and the save schedule.
  // These used to be local-only, which meant the .md could only be produced
  // on the device that recorded the activity and the Stats chart disagreed
  // between devices.
  'pixel_report_buffer',
  'pixel_pomodoro_daily',
  'pixel_weekly_report_settings',
  // Bookmarks are read through `useSyncedStorage`, so they reach the cloud
  // as soon as the Bookmarks page mounts. They still belong here: the page
  // is lazily loaded, so a user who signs in and never opens it would
  // otherwise leave their bookmarks on this device only.
  'pixel_bookmarks',
  'pixel_bookmark_folders',
] as const

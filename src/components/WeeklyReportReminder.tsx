import { useWeeklyReportReminder } from '../hooks/useWeeklyReportReminder'

// Thin mount wrapper so the app-wide weekly-report reminder can be dropped
// into App.tsx and survives route changes. It owns the schedule and the
// desktop notification; the visible banner lives in the Tasks screen
// (see WeeklyReportBanner).
export default function WeeklyReportReminder() {
  useWeeklyReportReminder()
  return null
}

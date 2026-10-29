import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWeeklyReportReminder } from '../hooks/useWeeklyReportReminder'
import { dateKey, getLastWeekDates } from '../utils/weekly-report'
import PixelEmoji from './ui/PixelEmoji'

const DISMISS_KEY_PREFIX = 'pixel_weekly_banner_dismissed_'

// The weekly-report reminder used to be invisible: the hook fired a desktop
// notification (only if permission happened to already be granted, which
// nothing in the app ever asked for) and the component rendered `null`.
//
// It now has an in-app presence on the Tasks screen: a banner when the save
// window is open and last week's report is still waiting, plus a way to grant
// notification permission from a real user gesture.
//
// The banner is sticky: dismissing it hides it for the rest of that report's
// week, and it comes back for the next one.
export default function WeeklyReportBanner() {
  const { reportPending, supported, granted, enableNotifications, autoSavedFile } =
    useWeeklyReportReminder()
  const [dismissed, setDismissed] = useState(false)

  // The dismissal is keyed by the week it belongs to.
  //
  // It used to be a single flag, and the effect that was meant to clear it
  // "for a fresh week" ran on mount — where `reportPending` is also true. So
  // the flag was erased and the banner came straight back on the next
  // render. Keying it by the week fixes both halves: the dismissal survives
  // a remount, and a new week gets a new key, so the banner returns.
  //
  // The key is recomputed on every render rather than memoised on mount: a
  // tab left open across the Sunday->Monday boundary would otherwise keep
  // last week's key and stay dismissed for the whole new week.
  const dismissKey = `${DISMISS_KEY_PREFIX}${dateKey(getLastWeekDates()[0])}`

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(dismissKey) === 'true')
    } catch {
      setDismissed(false)
    }
  }, [dismissKey])

  // The report was archived after it was dismissed — allow the banner to
  // show again for this week.
  useEffect(() => {
    if (reportPending || !autoSavedFile) return
    try {
      localStorage.removeItem(dismissKey)
      setDismissed(false)
    } catch {
      /* ignore */
    }
  }, [reportPending, autoSavedFile, dismissKey])

  if (!reportPending || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(dismissKey, 'true')
    } catch {
      /* storage unavailable — dismiss for this session only */
    }
  }

  return (
    <div
      role="status"
      className="border-4 border-accent bg-accent/10 p-3 pixel-border flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
    >
      <PixelEmoji name="rocket" size={18} />
      <div className="flex-1 min-w-0">
        <div className="font-pixel text-small text-accent">WEEKLY REPORT READY TO SAVE</div>
        <div className="font-pixel text-caption text-muted mt-1">
          LAST WEEK&apos;S ACTIVITY IS STILL WAITING TO BE ARCHIVED.
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <Link
          to="/weekly"
          className="font-pixel text-caption px-3 py-2 bg-accent text-on-accent border-2 border-accent-hot font-bold min-h-8 flex items-center hover:brightness-110"
        >
          OPEN REPORT
        </Link>
        {supported && !granted && (
          <button
            type="button"
            onClick={() => void enableNotifications()}
            className="font-pixel text-caption px-3 py-2 bg-surface border-2 border-line text-muted hover:text-ink min-h-8 flex items-center"
          >
            ENABLE REMINDERS
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss weekly report reminder"
          className="font-pixel text-caption px-2 py-2 text-muted hover:text-ink min-h-8 min-w-8 flex items-center justify-center"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

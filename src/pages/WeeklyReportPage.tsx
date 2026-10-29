import { useState, useEffect, useMemo, useCallback } from 'react'
import { useToast } from '../components/ui/Toast'
import PixelEmoji from '../components/ui/PixelEmoji'
import PixelIcon from '../components/ui/PixelIcon'
import ActionButton from '../components/ui/ActionButton'
import { playCoin, playClick } from '../utils/audio'
import {
  getReportSettings,
  saveReportSettings,
  isWeeklySaveWindowOpen,
  getWeekDates,
  getLastWeekDates,
  readWeekBuffer,
  reportFilename,
  generateWeeklyReport,
  isReportSaved,
  markReportSaved,
  type ReportEntry,
  type WeeklyReportSettings,
  dayName,
  dateKey,
} from '../utils/weekly-report'
import {
  pickVaultFolder,
  getVaultFolder,
  forgetVaultFolder,
  writeMarkdownToVault,
  hasVaultPermission,
} from '../utils/obsidian-archive'
import {
  isNotificationGranted,
  isNotificationSupported,
  requestNotificationPermission,
  sendBrowserNotification,
} from '../utils/notifications'
import {
  copyText,
  downloadTextFile,
  supportsFileSystemAccess,
} from '../utils/download'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function WeeklyReportPage() {
  const { showToast } = useToast()
  const [now, setNow] = useState(() => new Date())
  const [settings, setSettings] = useState<WeeklyReportSettings>(() => getReportSettings())
  const [hasFolder, setHasFolder] = useState<boolean>(false)
  const [saving, setSaving] = useState(false)
  const [pickingFolder, setPickingFolder] = useState(false)
  const [notifGranted, setNotifGranted] = useState<boolean>(() => isNotificationGranted())
  const [tick, setTick] = useState(0) // forces re-read of buffer
  const [selectedPastIndex, setSelectedPastIndex] = useState(0)
  const fsaSupported = supportsFileSystemAccess()

  // Tick once a minute so the "saves in X min" countdown updates.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  // Refresh the buffer read every 30s so live edits show up.
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  // Probe for an existing saved folder handle.
  useEffect(() => {
    let alive = true
    getVaultFolder().then(h => {
      if (alive) setHasFolder(!!h)
    })
    return () => {
      alive = false
    }
  }, [])

  const weekDates = useMemo(() => getWeekDates(now), [now])
  const lastWeekDates = useMemo(() => getLastWeekDates(now), [now])

  const currentWeekEntries: ReportEntry[] = useMemo(
    () => readWeekBuffer(weekDates),
    // tick is intentional dep so this re-runs on the interval
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekDates, tick],
  )
  // Every recent week that still has buffered events. Twelve weeks is well
  // inside the 16-week retention window, so a report missed on Sunday — or
  // for several weeks — can still be produced from this screen.
  const pastWeeks = useMemo(() => {
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const list: { label: string; dates: Date[]; entries: ReportEntry[]; saved: boolean }[] = []
    for (let offset = 1; offset <= 12; offset++) {
      const anchor = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset * 7)
      const dates = getWeekDates(anchor)
      const entries = readWeekBuffer(dates)
      if (entries.length === 0) continue
      list.push({
        label: `${fmt(dates[0])} – ${fmt(dates[6])}`,
        dates,
        entries,
        saved: isReportSaved(dates),
      })
    }
    if (list.length === 0) {
      list.push({
        label: 'No buffered weeks',
        dates: lastWeekDates,
        entries: [],
        saved: isReportSaved(lastWeekDates),
      })
    }
    return list
    // tick re-reads the buffer; now rolls the window forward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, tick, lastWeekDates])

  const selectedPast = pastWeeks[Math.min(selectedPastIndex, pastWeeks.length - 1)]
  const selectedPastEntries = selectedPast.entries

  const saveWindowOpen = useMemo(() => isWeeklySaveWindowOpen(now), [now, settings])

  // ─── Settings handlers ──────────────────────────────────────────────
  const updateSetting = useCallback(<K extends keyof WeeklyReportSettings>(k: K, v: WeeklyReportSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [k]: v }
      saveReportSettings(next)
      return next
    })
  }, [])

  // ─── Folder handlers ────────────────────────────────────────────────
  const handlePickFolder = useCallback(async () => {
    playClick()
    if (!fsaSupported) {
      showToast('Folder saving is not supported in this browser. Use DOWNLOAD .MD.', 'error')
      return
    }
    setPickingFolder(true)
    try {
      const h = await pickVaultFolder()
      if (h) {
        setHasFolder(true)
        showToast(`Folder set: ${h.name}`, 'success')
      }
    } catch (e) {
      // user cancelled
    } finally {
      setPickingFolder(false)
    }
  }, [showToast, fsaSupported])

  const handleForgetFolder = useCallback(async () => {
    playClick()
    await forgetVaultFolder()
    setHasFolder(false)
    showToast('Folder cleared. Pick again on next save.', 'info')
  }, [showToast])

  // Permission can be revoked by the browser between sessions, so the
  // auto-save needs to know whether the folder is still writable.
  useEffect(() => {
    let cancelled = false
    void hasVaultPermission().then(ok => {
      if (!cancelled) setHasFolder(ok)
    })
    return () => {
      cancelled = true
    }
  }, [tick])

  // Ask for notification permission and immediately prove it works, so the
  // user can trust the Sunday reminder before it matters.
  const handleTestNotification = useCallback(async () => {
    playClick()
    if (!isNotificationSupported()) {
      showToast('This browser cannot show notifications.', 'error')
      return
    }
    let ok = isNotificationGranted()
    if (!ok) {
      ok = await requestNotificationPermission()
    }
    if (!ok) {
      showToast('Notification permission was refused.', 'error')
      return
    }
    setNotifGranted(true)
    await sendBrowserNotification('🗓️ Weekly report reminder armed', {
      body: `Your weekly report will be ready on ${DAY_LABELS[settings.weeklySaveDay]} at ${settings.weeklySaveTime}.`,
      tag: 'pp-weekly-report-test',
    })
    showToast('Test notification sent.', 'success')
  }, [showToast, settings.weeklySaveDay, settings.weeklySaveTime])

  // ─── Export handlers (work on every browser) ────────────────────────
  const handleDownload = useCallback(
    (dates: Date[], entries: ReportEntry[], label: string) => {
      if (entries.length === 0) {
        showToast('No activity in this week yet.', 'info')
        return
      }
      const fname = reportFilename(dates[6])
      downloadTextFile(fname, generateWeeklyReport(dates))
      playCoin()
      showToast(`Downloaded ${fname} (${label})`, 'success')
    },
    [showToast],
  )

  const handleCopy = useCallback(
    async (dates: Date[], entries: ReportEntry[]) => {
      if (entries.length === 0) {
        showToast('No activity in this week yet.', 'info')
        return
      }
      const ok = await copyText(generateWeeklyReport(dates))
      showToast(
        ok ? 'Weekly report copied as Markdown.' : 'Copy failed — use DOWNLOAD .MD.',
        ok ? 'success' : 'error',
      )
    },
    [showToast],
  )

  // ─── Save handlers ──────────────────────────────────────────────────
  const handleSaveCurrentWeek = useCallback(async () => {
    playClick()
    if (!saveWindowOpen) {
      showToast('Save window has not opened yet.', 'error')
      return
    }
    if (currentWeekEntries.length === 0) {
      showToast('No activity in this week yet.', 'info')
      return
    }
    // Safari/Firefox have no File System Access API. The download path is
    // the same report, just delivered as a file instead of into the vault.
    if (!fsaSupported) {
      handleDownload(weekDates, currentWeekEntries, 'current week')
      return
    }
    setSaving(true)
    try {
      let folder = await getVaultFolder()
      if (!folder) {
        folder = await pickVaultFolder()
        if (!folder) {
          setSaving(false)
          return
        }
        setHasFolder(true)
      }
      const md = generateWeeklyReport(weekDates)
      const fname = reportFilename(new Date())
      const res = await writeMarkdownToVault(fname, md)
      if (res.ok) {
        playCoin()
        markReportSaved(weekDates)
        showToast(`Wrote ${fname} to ${folder.name}`, 'success')
      } else if (res.error === 'PERMISSION_DENIED') {
        showToast('Folder permission denied. Pick again.', 'error')
        setHasFolder(false)
      } else {
        showToast(`Save failed: ${res.error}`, 'error')
      }
    } catch (e) {
      showToast(`Save error: ${e instanceof Error ? e.message : 'unknown'}`, 'error')
    } finally {
      setSaving(false)
    }
  }, [saveWindowOpen, currentWeekEntries, weekDates, showToast, fsaSupported, handleDownload])

  const handleSavePastWeek = useCallback(async () => {
    playClick()
    if (selectedPastEntries.length === 0) {
      showToast('No buffered activity for that week.', 'info')
      return
    }
    if (!fsaSupported) {
      handleDownload(selectedPast.dates, selectedPastEntries, selectedPast.label)
      return
    }
    setSaving(true)
    try {
      let folder = await getVaultFolder()
      if (!folder) {
        folder = await pickVaultFolder()
        if (!folder) {
          setSaving(false)
          return
        }
        setHasFolder(true)
      }
      const md = generateWeeklyReport(selectedPast.dates)
      const fname = reportFilename(selectedPast.dates[6])
      const res = await writeMarkdownToVault(fname, md)
      if (res.ok) {
        playCoin()
        markReportSaved(selectedPast.dates)
        showToast(`Wrote ${fname} (${selectedPast.label}) to ${folder.name}`, 'success')
      } else {
        showToast(`Save failed: ${res.error}`, 'error')
      }
    } catch (e) {
      showToast(`Save error: ${e instanceof Error ? e.message : 'unknown'}`, 'error')
    } finally {
      setSaving(false)
    }
  }, [selectedPast, selectedPastEntries, fsaSupported, handleDownload, showToast])

  // ─── Render helpers ─────────────────────────────────────────────────
  const renderEntry = (e: ReportEntry) => {
    const time = new Date(e.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
    const verb =
      e.action === 'task_completed'
        ? '✅ completed'
        : e.action === 'task_uncompleted'
        ? '↩️ uncompleted'
        : e.action === 'task_added'
        ? '➕ added'
        : e.action === 'task_deleted'
        ? '🗑️ deleted'
        : '🍅 pomodoro'
    return (
      <div
        key={e.id}
        className="flex items-center justify-between p-2 bg-app-deep border border-line font-pixel text-label"
      >
        <span className="text-ink">
          <span className="text-accent-2 mr-1">{verb}</span> {e.taskTitle}
        </span>
        <span className="text-dim shrink-0 ml-2">{time}</span>
      </div>
    )
  }

  const renderDayBlock = (dayIdx: number) => {
    const d = weekDates[dayIdx]
    const k = dateKey(d)
    const dayEntries = currentWeekEntries
      .filter(e => dateKey(new Date(e.timestamp)) === k)
      .sort((a, b) => a.timestamp - b.timestamp)
    return (
      <div key={k} className="space-y-1">
        <h4 className="font-pixel text-small text-heading flex items-center gap-1.5">
          <span>Day {dayIdx + 1}</span>
          <span className="text-muted">({DAY_LABELS[d.getDay()]}, {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</span>
          <span className="ml-auto text-dim">{dayEntries.length}</span>
        </h4>
        {dayEntries.length === 0 ? (
          <div className="text-dim text-label italic p-2 border border-dashed border-line font-pixel">
            no activity
          </div>
        ) : (
          <div className="space-y-1">{dayEntries.map(renderEntry)}</div>
        )}
      </div>
    )
  }

  // Group current week entries by category for the live preview
  const currentByCategory = useMemo(() => {
    const m = new Map<string, ReportEntry[]>()
    currentWeekEntries.forEach(e => {
      if (!m.has(e.categoryName)) m.set(e.categoryName, [])
      m.get(e.categoryName)!.push(e)
    })
    return m
  }, [currentWeekEntries])

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-5 pb-20">
      {/* Header */}
      <div className="border-b-4 border-line pb-3">
        <h1 className="font-pixel text-base md:text-xl text-accent pixel-shadow flex items-center gap-2.5 min-w-0">
          <PixelEmoji name="paperclip" size={26} className="shrink-0" />
          <span className="min-w-0 break-words">WEEKLY ACTIVITY REPORT</span>
        </h1>
        <p className="font-pixel text-caption text-muted mt-1.5">
          DAILY SNAPSHOTS · CATEGORY BREAKDOWN · DIRECT WRITE TO OBSIDIAN VAULT
        </p>
      </div>

      {/* Save Configuration */}
      <div className="bg-surface border-4 border-line p-4 pixel-border space-y-3">
        <h2 className="font-pixel text-body text-heading flex items-center gap-2">
          <PixelIcon name="gear" size={16} />
          <span>SAVE SCHEDULE</span>
        </h2>
        <p className="font-pixel text-label text-muted leading-relaxed">
          Pick which day + time the weekly save button unlocks. Activity is
          captured automatically as you work — no daily save needed.
        </p>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <label htmlFor="weekly-save-day" className="font-pixel text-caption text-muted whitespace-nowrap">DAY:</label>
            <select
              id="weekly-save-day"
              value={settings.weeklySaveDay}
              onChange={e => {
                updateSetting('weeklySaveDay', parseInt(e.target.value, 10))
                playClick()
              }}
              className="flex-1 bg-app-deep border-2 border-line focus:border-accent px-2.5 py-2 font-pixel text-caption text-ink outline-none cursor-pointer"
            >
              {DAY_LABELS.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <label htmlFor="weekly-save-time" className="font-pixel text-caption text-muted whitespace-nowrap">TIME:</label>
            <input
              id="weekly-save-time"
              type="time"
              value={settings.weeklySaveTime}
              onChange={e => {
                updateSetting('weeklySaveTime', e.target.value)
                playClick()
              }}
              className="flex-1 bg-app-deep border-2 border-line focus:border-accent px-2.5 py-2 font-pixel text-caption text-ink outline-none"
            />
          </div>
        </div>
        <div
          className={`font-pixel text-caption p-2 border ${
            saveWindowOpen
              ? 'bg-accent-2/10 border-accent-2 text-accent-2'
              : 'bg-app-deep border-line text-muted'
          }`}
        >
          {saveWindowOpen
            ? `✅ Save window is OPEN (until next ${DAY_LABELS[(settings.weeklySaveDay + 1) % 7]} 12:00 AM)`
            : `🔒 Save window locked. Opens ${DAY_LABELS[settings.weeklySaveDay]} at ${settings.weeklySaveTime}.`}
        </div>

        {/* Auto-save: write last week's .md the moment the window opens.
            It needs a vault folder that the browser still has permission
            for — pick one below, then this switch is enough. */}
        <label
          htmlFor="weekly-auto-save"
          className="flex items-start gap-2 cursor-pointer font-pixel text-caption text-muted"
        >
          <input
            id="weekly-auto-save"
            type="checkbox"
            checked={!!settings.autoSave}
            onChange={e => {
              updateSetting('autoSave', e.target.checked)
              playClick()
            }}
            className="mt-0.5 w-4 h-4 accent-[var(--accent)] shrink-0 cursor-pointer"
          />
          <span>
            AUTO-SAVE WEEKLY REPORT — WRITE LAST WEEK&apos;S .MD AS SOON AS THE WINDOW
            OPENS, WITHOUT A CLICK. NEEDS A PICKED FOLDER WITH PERMISSION.
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleTestNotification}
            className="font-pixel text-caption px-3 py-2 bg-surface border-2 border-line text-muted hover:text-ink min-h-8 flex items-center gap-1.5"
          >
            <PixelEmoji name="bell" size={12} />
            <span>SEND TEST NOTIFICATION</span>
          </button>
          <span className="font-pixel text-micro text-dim">
            {notifGranted
              ? 'REMINDERS ARMED'
              : 'PERMISSION IS ASKED FOR THE FIRST TIME YOU PRESS THIS'}
          </span>
        </div>
      </div>

      {saveWindowOpen && !isReportSaved(lastWeekDates) && (
        <div className="bg-warn/10 border-2 border-warn p-3 font-pixel text-caption text-warn flex items-center gap-2">
          <PixelEmoji name="bell" size={14} />
          <span>⏰ Save window OPEN — don't forget to save last week's report before it closes.</span>
        </div>
      )}

      {/* Vault Folder */}
      <div className="bg-surface border-4 border-line p-4 pixel-border space-y-3">
        <h2 className="font-pixel text-body text-heading flex items-center gap-2">
          <PixelIcon name="folder" size={18} />
          <span>OBSIDIAN VAULT FOLDER</span>
        </h2>
        <p className="font-pixel text-label text-muted leading-relaxed">
          Pick the folder once. Permission is remembered for future saves —
          no re-prompting each week.
        </p>
        {fsaSupported ? (
          <div className="flex items-center gap-2 flex-wrap">
            <ActionButton
              onClick={handlePickFolder}
              loading={pickingFolder}
              loadingLabel="PICKING…"
              className="retro-btn-accent font-pixel text-small px-3.5 py-2.5 flex items-center gap-1.5"
            >
              <PixelIcon name="folder" size={14} />
              <span>{hasFolder ? 'CHANGE FOLDER' : 'PICK VAULT FOLDER'}</span>
            </ActionButton>
            {hasFolder && (
              <button
                onClick={handleForgetFolder}
                className="font-pixel text-label px-3 py-2 border border-line text-muted hover:text-ink"
              >
                FORGET FOLDER
              </button>
            )}
            <span
              className={`font-pixel text-label px-2 py-1 border ${
                hasFolder
                  ? 'border-accent-2 text-accent-2 bg-accent-2/10'
                  : 'border-warn text-warn bg-warn/10'
              }`}
            >
              {hasFolder ? '✓ READY' : '⚠ NOT SET'}
            </span>
          </div>
        ) : (
          <p className="font-pixel text-label text-warn leading-relaxed">
            This browser cannot write directly into a folder (File System
            Access is Chromium-only). Use DOWNLOAD .MD below — on iPhone, the
            file opens in Files, where you can move it into your vault.
          </p>
        )}
      </div>

      {/* Save Buttons */}
      <div className="bg-surface pixel-frame p-4 pixel-border space-y-3">
        <h2 className="font-pixel text-body text-heading flex items-center gap-2">
          <PixelEmoji name="floppy" size={18} />
          <span>SAVE REPORT</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Current Week */}
          <div className="border-2 border-line p-3 space-y-2 bg-app-deep/60">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-small text-accent">CURRENT WEEK</span>
              <span className="font-pixel text-label text-dim">
                {currentWeekEntries.length} event{currentWeekEntries.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="font-pixel text-label text-muted">
              Sun {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – Sat {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            {fsaSupported ? (
              <ActionButton
                onClick={handleSaveCurrentWeek}
                loading={saving}
                loadingLabel="SAVING…"
                disabled={!saveWindowOpen || !hasFolder || currentWeekEntries.length === 0}
                className="w-full pixel-btn pixel-btn-red font-pixel text-small py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {!saveWindowOpen ? '🔒 LOCKED' : !hasFolder ? '⚠ PICK FOLDER' : `SAVE ${reportFilename(now)}`}
              </ActionButton>
            ) : (
              <p className="font-pixel text-micro text-warn leading-relaxed">
                Direct folder saving needs Chrome or Edge. Use DOWNLOAD .MD —
                it is the same report.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleDownload(weekDates, currentWeekEntries, 'current week')}
                disabled={currentWeekEntries.length === 0}
                className="font-pixel text-label px-2 py-1 border border-line text-muted hover:text-ink disabled:opacity-40"
              >
                DOWNLOAD .MD
              </button>
              <button
                type="button"
                onClick={() => void handleCopy(weekDates, currentWeekEntries)}
                disabled={currentWeekEntries.length === 0}
                className="font-pixel text-label px-2 py-1 border border-line text-muted hover:text-ink disabled:opacity-40"
              >
                COPY
              </button>
            </div>
          </div>

          {/* Past Week */}
          <div className="border-2 border-line p-3 space-y-2 bg-app-deep/60">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-small text-accent-2">PAST WEEK</span>
              <span className="font-pixel text-label text-dim">
                {selectedPastEntries.length} event{selectedPastEntries.length === 1 ? '' : 's'}
              </span>
            </div>
            <label htmlFor="past-week-select" className="sr-only">
              Choose a past week
            </label>
            <select
              id="past-week-select"
              value={Math.min(selectedPastIndex, pastWeeks.length - 1)}
              onChange={e => setSelectedPastIndex(Number(e.target.value))}
              className="w-full bg-app-deep border-2 border-line focus:border-accent px-2 py-1.5 font-pixel text-caption text-ink outline-none"
            >
              {pastWeeks.map((w, i) => (
                <option key={`${w.label}-${i}`} value={i}>
                  {w.saved ? '✓ ' : ''}{w.label}
                </option>
              ))}
            </select>
            {fsaSupported ? (
              <ActionButton
                onClick={handleSavePastWeek}
                loading={saving}
                loadingLabel="SAVING…"
                disabled={!hasFolder || selectedPastEntries.length === 0}
                className="w-full pixel-btn font-pixel text-small py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {!hasFolder ? '⚠ PICK FOLDER' : `SAVE ${reportFilename(selectedPast.dates[6])}`}
              </ActionButton>
            ) : (
              <p className="font-pixel text-micro text-warn leading-relaxed">
                Direct folder saving needs Chrome or Edge. Use DOWNLOAD .MD.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleDownload(selectedPast.dates, selectedPastEntries, selectedPast.label)}
                disabled={selectedPastEntries.length === 0}
                className="font-pixel text-label px-2 py-1 border border-line text-muted hover:text-ink disabled:opacity-40"
              >
                DOWNLOAD .MD
              </button>
              <button
                type="button"
                onClick={() => void handleCopy(selectedPast.dates, selectedPastEntries)}
                disabled={selectedPastEntries.length === 0}
                className="font-pixel text-label px-2 py-1 border border-line text-muted hover:text-ink disabled:opacity-40"
              >
                COPY
              </button>
            </div>
            <div className="font-pixel text-micro text-dim">
              Any of the last 12 buffered weeks — a missed Sunday is recoverable.
            </div>
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="bg-surface pixel-frame p-4 pixel-border space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-pixel text-body text-heading flex items-center gap-2">
            <PixelEmoji name="target" size={18} />
            <span>THIS WEEK ACTIVITY</span>
          </h2>
          <span className="font-pixel text-label text-dim">
            auto-refresh · 30s
          </span>
        </div>

        {currentWeekEntries.length === 0 ? (
          <div className="text-dim font-pixel text-caption p-6 text-center border border-dashed border-line">
            No activity recorded yet this week. Start checking off tasks and they will appear here.
          </div>
        ) : (
          <div className="space-y-4">
            {[...currentByCategory.entries()].map(([catName, list]) => (
              <div key={catName} className="space-y-2">
                <h3 className="font-pixel text-small text-heading border-b border-line pb-1">
                  {catName}
                </h3>
                {weekDates.map((_, idx) => {
                  const dayDate = weekDates[idx]
                  const dayKey = dateKey(dayDate)
                  const dayItems = list
                    .filter(e => dateKey(new Date(e.timestamp)) === dayKey)
                    .sort((a, b) => a.timestamp - b.timestamp)
                  if (dayItems.length === 0) return null
                  return (
                    <div key={`${catName}-${idx}`} className="pl-3 space-y-1">
                      <h4 className="font-pixel text-caption text-muted">
                        Day {idx + 1} ({dayName(dayDate.getDay())},{' '}
                        {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                      </h4>
                      <div className="space-y-1">{dayItems.map(renderEntry)}</div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Day grid (always visible) */}
      <div className="bg-surface border-4 border-line p-4 pixel-border space-y-3">
        <h2 className="font-pixel text-body text-heading flex items-center gap-2">
          <PixelEmoji name="calendar" size={18} />
          <span>DAY GRID — {currentWeekEntries.length} TOTAL EVENTS</span>
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {weekDates.map((_, idx) => (
            <div key={idx} className="bg-app-deep/60 border-2 border-line p-2">
              {renderDayBlock(idx)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

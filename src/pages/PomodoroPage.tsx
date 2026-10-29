import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import PixelTimer from '../components/PixelTimer'
import PixelTomato from '../components/PixelTomato'
import PixelScene from '../components/PixelScene'
import PixelStats from '../components/PixelStats'
import PixelDesk from '../components/PixelDesk'
import { usePomodoroContext } from '../context/PomodoroContext'
import { useTaskContext } from '../context/TaskContext'
import type { Task } from '../types/tasks'
import Modal from '../components/ui/Modal'
import PixelIcon from '../components/ui/PixelIcon'
import PixelEmoji from '../components/ui/PixelEmoji'
import { playStart, playClick } from '../utils/audio'

const MODE_LABELS = {
  work: 'FOCUS SESSION',
  shortBreak: 'SHORT BREAK',
  longBreak: 'LONG BREAK',
}

export default function PomodoroPage() {
  const location = useLocation()
  const { data, toggleTask } = useTaskContext()
  const [crtScanlines, setCrtScanlines] = useState(true)

  const {
    mode,
    timeLeft,
    isRunning,
    sessionsCompleted,
    totalSessions,
    progress,
    activeTask,
    settings,
    isMuted,
    toggleMute,
    showCompletePrompt,
    completedTaskCandidate,
    setMode,
    updateSettings,
    handleStart,
    handlePause,
    handleReset,
    handleSkip,
    setActiveTask,
    closeCompletePrompt,
    confirmCompleteTask,
  } = usePomodoroContext()

  // Sync with context when activeTask changes (from navigation)
  useEffect(() => {
    const state = location.state as { task?: { categoryId: string; task: Task } } | null
    if (state?.task) {
      setActiveTask(state.task)
    }
  }, [location, setActiveTask])

  // Get active task category info
  const activeTaskCategory = activeTask
    ? data.categories.find(c => c.id === activeTask.categoryId)
    : null
  const currentTaskInStore = activeTask
    ? activeTaskCategory?.tasks.find(t => t.id === activeTask.task.id) || activeTask.task
    : null

  const handleSelectTask = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (!val) {
      setActiveTask(null)
      return
    }
    const parts = val.split('::')
    if (parts.length !== 2) {
      console.warn('[PomodoroPage] handleSelectTask: invalid value format, expected "categoryId::taskId"')
      setActiveTask(null)
      return
    }
    const [catId, taskId] = parts
    const foundCat = data.categories.find(c => c.id === catId)
    const foundTask = foundCat?.tasks.find(t => t.id === taskId)
    if (foundCat && foundTask) {
      setActiveTask({ categoryId: foundCat.id, task: foundTask })
    }
  }

  // Segmented progress blocks (20 blocks)
  const TOTAL_SEGMENTS = 20
  const filledSegments = Math.round(progress * TOTAL_SEGMENTS)

  const handleQuickPreset = (workMins: number, breakMins: number) => {
    updateSettings({ workDuration: workMins, shortBreakDuration: breakMins })
    setMode('work')
    playClick()
  }

  return (
    // `dvh` (dynamic viewport height) instead of `vh`: on mobile, `vh` counts
    // the browser chrome that is not actually visible, so the page ended up
    // taller than the screen and the bottom nav covered its last row.
    <div className="flex-1 flex flex-col items-center justify-start p-4 md:p-8 min-h-[calc(100dvh-60px)] md:min-h-full overflow-y-auto relative pb-20">
      {/* Background Retro Pixel Stars */}
      <PixelScene />

      {/* Main Terminal Shell */}
      <div className="relative z-10 w-full max-w-xl mx-auto space-y-4">
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between gap-3 border-b-4 border-line pb-3 bg-surface/80 p-3 pixel-border">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <PixelEmoji name="tomato" size={24} className="shrink-0" />
            <div className="min-w-0">
              <h1 className="font-pixel text-xs md:text-sm text-accent pixel-shadow break-words">
                PIXEL FOCUS TERMINAL
              </h1>
              <p className="font-pixel text-label text-muted">
                POMODORO INTERVAL ENGINE &amp; DESK COMPANION
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* CRT Scanline Toggle */}
            <button
              onClick={() => setCrtScanlines(!crtScanlines)}
              className="font-pixel text-label px-2 py-1.5 bg-app-deep border border-line text-muted hover:text-ink transition-colors"
              title="Toggle retro CRT scanlines" aria-label="Toggle retro CRT scanlines"
            >
              CRT: {crtScanlines ? 'ON' : 'OFF'}
            </button>
            {/* Sound Toggle */}
            <button
              onClick={toggleMute}
              className="font-pixel text-label px-2 py-1.5 bg-app-deep border border-line text-muted hover:text-ink transition-colors flex items-center gap-1"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              <PixelIcon name={isMuted ? 'speaker-muted' : 'speaker'} size={12} />
              <span>{isMuted ? 'MUTED' : 'AUDIO'}</span>
            </button>
          </div>
        </div>

        {/* Active Target Task Bar */}
        <div className="bg-surface pixel-frame p-3 pixel-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <PixelEmoji name="target" size={18} />
            <div className="min-w-0 flex-1">
              <div className="font-pixel text-label text-muted">LOCKED TARGET:</div>
              {activeTask && currentTaskInStore ? (
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <span
                    className={`font-pixel text-small font-bold truncate max-w-[200px] ${
                      currentTaskInStore.completed ? 'line-through text-muted' : 'text-accent'
                    }`}
                  >
                    {currentTaskInStore.title}
                  </span>
                  {activeTaskCategory && (
                    <span
                      className="font-pixel text-micro px-1 py-0.5 border"
                      style={{
                        borderColor: activeTaskCategory.color,
                        color: activeTaskCategory.color,
                      }}
                    >
                      {activeTaskCategory.name}
                    </span>
                  )}
                  {currentTaskInStore.pomodorosSpent > 0 && (
                    <span className="font-pixel text-label text-purple flex items-center gap-0.5">
                      <PixelEmoji name="tomato" size={10} />
                      <span>{currentTaskInStore.pomodorosSpent}</span>
                    </span>
                  )}
                </div>
              ) : (
                <span className="font-pixel text-caption text-dim">No task selected (free focus)</span>
              )}
            </div>
          </div>

          {/* Quick Select & Mark Done Actions */}
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            {activeTask && currentTaskInStore && !currentTaskInStore.completed && (
              <button
                onClick={() => {
                  toggleTask(activeTask.categoryId, activeTask.task.id)
                  playStart()
                }}
                className="retro-btn-teal font-pixel text-label px-2 py-1 flex items-center gap-1"
                title="Mark this task completed right now" aria-label="Mark this task completed right now"
              >
                <PixelEmoji name="check_shield" size={10} />
                <span>DONE</span>
              </button>
            )}

            <select
              value={activeTask ? `${activeTask.categoryId}::${activeTask.task.id}` : ''}
              onChange={handleSelectTask}
              aria-label="Choose the task this focus session counts towards"
              className="bg-app-deep border-2 border-line text-accent-2 font-pixel text-label px-2 py-1.5 outline-none cursor-pointer max-w-[150px]"
            >
              <option value="">-- Switch Task --</option>
              {data.categories.map(cat => (
                <optgroup key={cat.id} label={cat.name}>
                  {cat.tasks.map(t => (
                    <option key={t.id} value={`${cat.id}::${t.id}`}>
                      {t.completed ? '✓ ' : ''}
                      {t.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {activeTask && (
              <button
                onClick={() => setActiveTask(null)}
                className="pixel-close"
                title="Clear selected task" aria-label="Clear selected task"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* CRT Arcade Screen Housing */}
        <div
          className={`bg-surface pixel-frame pixel-border p-5 text-center space-y-4 shadow-2xl relative ${
            crtScanlines ? 'retro-crt' : ''
          }`}
        >
          {/* Top Status HUD inside monitor.
              One fact, one colour: the state colour (running = success,
              paused = warn) belongs to the status, everything else on this
              line is muted so the line does not read as three unrelated
              things competing with the timer. */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full border border-black/40 ${
                  isRunning ? 'bg-success animate-ping' : 'bg-warn'
                }`}
              />
              <span
                className={`font-pixel text-label uppercase ${
                  isRunning ? 'text-success' : 'text-warn'
                }`}
              >
                {isRunning ? 'STATUS: RUNNING' : 'STATUS: PAUSED'}
              </span>
            </div>

            <div className="flex items-center gap-1 font-pixel text-label text-muted">
              <PixelEmoji
                name={mode === 'work' ? 'tomato' : mode === 'shortBreak' ? 'coffee' : 'palm'}
                size={14}
              />
              <span className="font-bold">{MODE_LABELS[mode]}</span>
            </div>

            <div className="font-pixel text-label text-muted">
              SET: {settings.workDuration}m / {settings.shortBreakDuration}m
            </div>
          </div>

          {/* Character & Desk Centerpiece */}
          <div className="relative py-2 flex flex-col items-center justify-center">
            <PixelTomato mode={mode} isRunning={isRunning} progress={progress} />
            <PixelDesk mode={mode} />
          </div>

          {/* Digital Timer Readout */}
          <div className="py-2">
            <PixelTimer timeLeft={timeLeft} mode={mode} />
          </div>

          {/* Segmented Pixel LED Progress Meter */}
          <div className="space-y-1 max-w-md mx-auto px-4">
            <div className="flex items-center justify-between font-pixel text-label text-muted">
              <span>PROGRESS</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="flex items-center gap-1 p-1 bg-app-deep border-2 border-line">
              {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => {
                const isFilled = i < filledSegments
                return (
                  <div
                    key={i}
                    className={`flex-1 h-3 border border-black/30 transition-all ${
                      isFilled
                        ? mode === 'work'
                          ? 'bg-accent shadow-xs'
                          : mode === 'shortBreak'
                          ? 'bg-accent-2 shadow-xs'
                          : 'bg-purple shadow-xs'
                        : 'bg-surface/60 opacity-30'
                    }`}
                  />
                )
              })}
            </div>
          </div>

          {/* Primary Hardware Controls Deck */}
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              onClick={() => {
                if (isRunning) {
                  handlePause()
                } else {
                  playStart()
                  handleStart()
                }
              }}
              className={`font-pixel text-small px-6 py-3 border-2 transition-all flex items-center gap-2 ${
                isRunning
                  ? 'pixel-btn pixel-btn-red text-warn'
                  : 'pixel-btn pixel-btn-red text-on-accent font-bold'
              }`}
            >
              <span>{isRunning ? '⏸ PAUSE' : '▶ START FOCUS'}</span>
            </button>

            <button
              onClick={() => {
                playClick()
                handleReset()
              }}
              className="pixel-btn font-pixel text-caption px-4 py-2 text-muted"
              title="Reset current interval [R]" aria-label="Reset current interval [R]"
            >
              ↺ RESET
            </button>

            <button
              onClick={() => {
                playClick()
                handleSkip()
              }}
              className="pixel-btn font-pixel text-caption px-4 py-2 text-muted"
              title="Skip to next interval [S]" aria-label="Skip to next interval [S]"
            >
              ⏭ SKIP
            </button>
          </div>
        </div>

        {/* Lower Control Deck: Mode Selectors & Presets */}
        <div className="bg-surface pixel-frame p-3 pixel-border space-y-3">
          <div className="flex items-center justify-between border-b-2 border-line pb-2 flex-wrap gap-2">
            <span className="font-pixel text-label text-muted">INTERVAL MODE:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => {
                  playClick()
                  setMode('work')
                }}
                className={`font-pixel text-label px-2.5 py-1.5 border transition-all flex items-center gap-1 ${
                  mode === 'work'
                    ? 'bg-accent/20 border-accent text-accent font-bold'
                    : 'bg-app-deep border-line text-muted hover:text-ink'
                }`}
              >
                <PixelEmoji name="tomato" size={10} />
                <span>WORK ({settings.workDuration}M)</span>
              </button>
              <button
                onClick={() => {
                  playClick()
                  setMode('shortBreak')
                }}
                className={`font-pixel text-label px-2.5 py-1.5 border transition-all flex items-center gap-1 ${
                  mode === 'shortBreak'
                    ? 'bg-accent-2/20 border-accent-2 text-accent-2 font-bold'
                    : 'bg-app-deep border-line text-muted hover:text-ink'
                }`}
              >
                <PixelEmoji name="coffee" size={10} />
                <span>SHORT ({settings.shortBreakDuration}M)</span>
              </button>
              <button
                onClick={() => {
                  playClick()
                  setMode('longBreak')
                }}
                className={`font-pixel text-label px-2.5 py-1.5 border transition-all flex items-center gap-1 ${
                  mode === 'longBreak'
                    ? 'bg-purple/20 border-purple text-purple font-bold'
                    : 'bg-app-deep border-line text-muted hover:text-ink'
                }`}
              >
                <PixelEmoji name="palm" size={10} />
                <span>LONG ({settings.longBreakDuration}M)</span>
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-pixel text-label text-muted">PRESETS:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleQuickPreset(25, 5)}
                className="font-pixel text-label px-2 py-1 bg-app-deep hover:bg-hover-fill border border-line text-ink transition-colors"
              >
                25/5 Classic
              </button>
              <button
                onClick={() => handleQuickPreset(50, 10)}
                className="font-pixel text-label px-2 py-1 bg-app-deep hover:bg-hover-fill border border-line text-accent-2 transition-colors"
              >
                50/10 Deep
              </button>
              <button
                onClick={() => handleQuickPreset(15, 3)}
                className="font-pixel text-label px-2 py-1 bg-app-deep hover:bg-hover-fill border border-line text-accent transition-colors"
              >
                15/3 Sprint
              </button>
            </div>
          </div>
        </div>

        {/* Global Focus Stats Summary */}
        <PixelStats
          sessionsCompleted={sessionsCompleted}
          totalSessions={totalSessions}
          activeTask={activeTask}
        />

        {/* Keyboard Hints Bar */}
        <div className="text-center font-pixel text-label text-dim space-x-3 pt-1">
          <span>[SPACE] Play/Pause</span>
          <span>[R] Reset</span>
          <span>[S/→] Skip</span>
        </div>
      </div>

      {/* Session Complete Prompt Modal */}
      <Modal
        isOpen={showCompletePrompt}
        onClose={closeCompletePrompt}
        title={
          <div className="flex items-center gap-2">
            <PixelEmoji name="trophy" size={20} />
            <span>SESSION FINISHED!</span>
          </div>
        }
        footer={
          <div className="flex gap-2">
            <button
              onClick={closeCompletePrompt}
              className="font-pixel text-small px-3 py-2 border-2 border-line text-muted hover:text-ink"
            >
              NOT YET
            </button>
            <button
              onClick={confirmCompleteTask}
              className="retro-btn-teal font-pixel text-small px-4 py-2"
            >
              YES, MARK DONE ✓
            </button>
          </div>
        }
      >
        <div className="text-center space-y-3 py-2">
          <div className="flex justify-center">
            <PixelEmoji name="trophy" size={32} />
          </div>
          <p className="font-pixel text-small text-ink">
            Great work! Focus interval logged for:
          </p>
          <div className="p-3 bg-app-deep border-2 border-line">
            <p className="font-pixel text-body text-accent font-bold">
              {completedTaskCandidate?.task.title}
            </p>
            <p className="font-pixel text-label text-accent-2 mt-1 flex items-center justify-center gap-1">
              <PixelEmoji name="tomato" size={12} />
              <span>Pomodoro session counted!</span>
            </p>
          </div>
          <p className="font-pixel text-caption text-muted">
            Would you like to mark this task as completed?
          </p>
        </div>
      </Modal>
    </div>
  )
}

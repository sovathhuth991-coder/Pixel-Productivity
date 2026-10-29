import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTaskContext } from '../../context/TaskContext'
import { useCategoryWindowContext } from '../../context/CategoryWindowContext'
import { useDesignMode } from '../../context/DesignModeContext'
import { fireCelebration } from '../../utils/confetti'
import PixelEmoji, { type PixelEmojiName } from '../ui/PixelEmoji'
import { playBeep, playComplete, playCoin } from '../../utils/audio'
import type { Category, Task } from '../../types/tasks'
import TaskItem from './TaskItem'
import TaskModal from './TaskModal'

interface CategoryWindowProps {
  category: Category
  onClose: () => void
  isMinimized: boolean
}

interface CategoryActivityItem {
  id: string
  type: 'task_completed' | 'task_added' | 'timer_started' | 'timer_finished' | 'note_added'
  text: string
  timestamp: number
}

const WIN_W = 460
const WIN_H = 520
const MIN_POSITION = 10
const GRID_SIZE = 20 // pixel grid snap increment

// Snap a coordinate to the nearest grid line
function snapToGrid(val: number): number {
  return Math.round(val / GRID_SIZE) * GRID_SIZE
}

// Check if two rectangles overlap
function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

// Given a candidate position, if it overlaps any sibling window,
// push it to the nearest non-overlapping grid slot.
function resolveOverlap(
  x: number,
  y: number,
  siblings: { x: number; y: number; w: number; h: number }[],
): { x: number; y: number } {
  const maxX = window.innerWidth - WIN_W - 20
  const maxY = window.innerHeight - WIN_H - 20

  // If no overlap, return as-is
  const hasOverlap = siblings.some(s =>
    rectsOverlap(x, y, WIN_W, WIN_H, s.x, s.y, s.w, s.h)
  )
  if (!hasOverlap) return { x, y }

  // Try shifting in each cardinal direction by GRID_SIZE increments
  // until we find a non-overlapping slot (BFS-style spiral)
  for (let dist = GRID_SIZE; dist < 800; dist += GRID_SIZE) {
    const candidates = [
      { x: x + dist, y },       // right
      { x: x - dist, y },       // left
      { x, y: y + dist },       // down
      { x, y: y - dist },       // up
      { x: x + dist, y: y + dist }, // diagonal
      { x: x - dist, y: y + dist },
      { x: x + dist, y: y - dist },
      { x: x - dist, y: y - dist },
    ]

    for (const c of candidates) {
      const cx = Math.max(MIN_POSITION, Math.min(snapToGrid(c.x), maxX))
      const cy = Math.max(MIN_POSITION, Math.min(snapToGrid(c.y), maxY))
      const ok = !siblings.some(s =>
        rectsOverlap(cx, cy, WIN_W, WIN_H, s.x, s.y, s.w, s.h)
      )
      if (ok) return { x: cx, y: cy }
    }
  }

  return { x, y } // fallback: keep overlapping
}

export default function CategoryWindow({
  category: initialCategory,
  onClose,
  isMinimized,
}: CategoryWindowProps) {
  const { data, addTask } = useTaskContext()
  const { updatePosition, minimizeWindow, getOtherWindowRects } = useCategoryWindowContext()
  const { mode, animationsEnabled } = useDesignMode()
  const [editingTask, setEditingTask] = useState<{ categoryId: string; task: Task } | null>(null)

  const [activeTab, setActiveTab] = useState<'tasks' | 'countdown' | 'notes' | 'log'>('tasks')
  const [categoryTasks, setCategoryTasks] = useState<Task[]>([])
  const [activity, setActivity] = useState<CategoryActivityItem[]>([])
  const [quickInput, setQuickInput] = useState('')
  const [notes, setNotes] = useState('')
  const [isDragging, setIsDragging] = useState(false)


  // Countdown timer state
  const [countdown, setCountdown] = useState<number | null>(null)
  const [countdownInput, setCountdownInput] = useState('15')
  const [isCountdownRunning, setIsCountdownRunning] = useState(false)

  // Drag handling with direct DOM manipulation for performance
  const [position, setPosition] = useState({ x: 120, y: 120 })
  const windowRef = useRef<HTMLDivElement>(null)
  const positionRef = useRef({ x: 120, y: 120 })
  const draggingRef = useRef(false)
  const dragStartRef = useRef({ clientX: 0, clientY: 0, windowX: 120, windowY: 120 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    positionRef.current = position
  }, [position])

  const windowId = `category_window_${initialCategory.id}`

  // Load saved position
  useEffect(() => {
    const saved = localStorage.getItem(windowId)
    if (saved) {
      try {
        const pos = JSON.parse(saved)
        setPosition({
          x: Math.max(MIN_POSITION, Math.min(window.innerWidth - WIN_W - 20, pos.x)),
          y: Math.max(MIN_POSITION, Math.min(window.innerHeight - WIN_H - 20, pos.y)),
        })
      } catch {}
    }
  }, [windowId])

  // Load category tasks from context
  useEffect(() => {
    const cat = data.categories.find(c => c.id === initialCategory.id)
    if (cat) {
      setCategoryTasks(cat.tasks || [])
    }
  }, [data.categories, initialCategory.id])

  // Load category activity and notes from localStorage
  useEffect(() => {
    const storedActivity = localStorage.getItem(`cat_activity_${initialCategory.id}`)
    if (storedActivity) {
      try {
        setActivity(JSON.parse(storedActivity))
      } catch {}
    }
    const storedNotes = localStorage.getItem(`cat_notes_${initialCategory.id}`)
    if (storedNotes) {
      setNotes(storedNotes)
    }
  }, [initialCategory.id])

  // Save activity
  useEffect(() => {
    if (activity.length > 0) {
      localStorage.setItem(`cat_activity_${initialCategory.id}`, JSON.stringify(activity))
    }
  }, [activity, initialCategory.id])

  // Save notes
  const handleNotesChange = (val: string) => {
    setNotes(val)
    localStorage.setItem(`cat_notes_${initialCategory.id}`, val)
  }

  // Countdown timer interval
  useEffect(() => {
    if (isCountdownRunning && countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => (prev !== null ? prev - 1 : null))
      }, 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0 && isCountdownRunning) {
      setIsCountdownRunning(false)
      playComplete()
      fireCelebration(mode, animationsEnabled, {
        particleCount: 35,
        spread: 60,
        origin: { y: 0.6 },
      })
      setActivity(prev => [
        {
          id: Date.now().toString(),
          type: 'timer_finished',
          text: 'Countdown alarm reached 0:00!',
          timestamp: Date.now(),
        },
        ...prev.slice(0, 30),
      ])
    }
  }, [countdown, isCountdownRunning, mode, animationsEnabled])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const startCountdown = () => {
    const mins = parseInt(countdownInput, 10) || 5
    setCountdown(mins * 60)
    setIsCountdownRunning(true)
    playBeep()
    setActivity(prev => [
      {
        id: Date.now().toString(),
        type: 'timer_started',
        text: `Started ${mins}m countdown timer`,
        timestamp: Date.now(),
      },
      ...prev.slice(0, 30),
    ])
  }


  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    draggingRef.current = true
    setIsDragging(true)
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      windowX: positionRef.current.x,
      windowY: positionRef.current.y,
    }
    // Disable pointer events on children during drag
    if (windowRef.current) {
      windowRef.current.style.pointerEvents = 'none'
      windowRef.current.style.willChange = 'transform'
    }
    // Visual drag feedback
    if (windowRef.current) {
      windowRef.current.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.5)'
      windowRef.current.style.opacity = '0.95'
    }
    document.body.style.cursor = 'grabbing'
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current) return

    // Cancel any pending rAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      const deltaX = e.clientX - dragStartRef.current.clientX
      const deltaY = e.clientY - dragStartRef.current.clientY

      let newX = dragStartRef.current.windowX + deltaX
      let newY = dragStartRef.current.windowY + deltaY

      const maxX = window.innerWidth - WIN_W - 20
      const maxY = window.innerHeight - WIN_H - 20

      // Snap to pixel grid
      newX = snapToGrid(Math.max(MIN_POSITION, Math.min(newX, maxX)))
      newY = snapToGrid(Math.max(MIN_POSITION, Math.min(newY, maxY)))

      positionRef.current = { x: newX, y: newY }
      if (windowRef.current) {
        windowRef.current.style.left = `${newX}px`
        windowRef.current.style.top = `${newY}px`
      }
    })
  }, [])

  const handleDragEnd = useCallback(() => {
    draggingRef.current = false
    setIsDragging(false)
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }

    // Snap final position to grid
    let finalPos = {
      x: snapToGrid(positionRef.current.x),
      y: snapToGrid(positionRef.current.y),
    }

    // Prevent overlap with sibling windows
    const siblings = getOtherWindowRects(initialCategory.id, WIN_W, WIN_H)
    finalPos = resolveOverlap(finalPos.x, finalPos.y, siblings)

    positionRef.current = finalPos
    setPosition(finalPos)
    localStorage.setItem(windowId, JSON.stringify(finalPos))
    updatePosition(initialCategory.id, finalPos)

    // Sync visual position after overlap resolution
    if (windowRef.current) {
      windowRef.current.style.left = `${finalPos.x}px`
      windowRef.current.style.top = `${finalPos.y}px`
    }

    // Reset pointer events and visual styles
    if (windowRef.current) {
      windowRef.current.style.pointerEvents = ''
      windowRef.current.style.willChange = ''
      windowRef.current.style.boxShadow = ''
      windowRef.current.style.opacity = ''
    }

    // Reset cursor
    document.body.style.cursor = ''
  }, [updatePosition, initialCategory.id, windowId, getOtherWindowRects])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleDragEnd)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleDragEnd)
    }
  }, [handleMouseMove, handleDragEnd])

  const completedCount = categoryTasks.filter(t => t.completed).length
  const totalCount = categoryTasks.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickInput.trim()) return
    addTask(initialCategory.id, {
      title: quickInput.trim(),
      frequency: 'daily',
      priority: 'medium',
      completed: false,
      streak: 0,
      pomodorosSpent: 0,
    })
    setQuickInput('')
    playCoin()
    setActivity(prev => [
      {
        id: Date.now().toString(),
        type: 'task_added',
        text: `Created task: ${quickInput.trim()}`,
        timestamp: Date.now(),
      },
      ...prev.slice(0, 30),
    ])
  }

  if (isMinimized) return null

  return (
    <AnimatePresence>
      <motion.div
        ref={windowRef}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed z-50 flex flex-col bg-surface pixel-frame pixel-border shadow-2xl overflow-hidden"
        style={{
          width: WIN_W,
          maxWidth: '92vw',
          maxHeight: '80vh',
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {/* Retro 90s OS Window Titlebar */}
        <div
          onMouseDown={handleDragStart}
          className="retro-window-header p-2 flex items-center justify-between cursor-move select-none border-b-2 border-line"
          style={{ borderTop: `4px solid ${initialCategory.color}` }}
        >
          {/* Left Title with Drag Texture & Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-pixel text-small text-muted tracking-tighter">≡≡≡</span>
            <div
              className="w-2.5 h-2.5 shrink-0 border border-ink/40"
              style={{ backgroundColor: initialCategory.color }}
            />
            <h3 className="font-pixel text-small text-ink truncate font-bold uppercase">
              {initialCategory.name}
            </h3>
            <span className="font-pixel text-label px-1.5 py-0.5 bg-app-deep text-muted border border-line">
              {completedCount}/{totalCount}
            </span>
            {isDragging && (
              <span className="font-pixel text-micro px-1 py-0.5 bg-accent-2/20 text-accent-2 border border-accent-2/40 animate-pulse">
                GRID {GRID_SIZE}px
              </span>
            )}
          </div>

          {/* Window Controls */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
            {countdown !== null && (
              <span className="font-pixel text-label text-accent-2 bg-accent-2/10 px-1.5 py-0.5 border border-accent-2 animate-pulse">
                ⏱ {formatTime(countdown)}
              </span>
            )}
            {/* Minimize */}
            <button
              onClick={() => minimizeWindow(initialCategory.id)}
              className="w-8 h-8 bg-app-deep hover:bg-hover-fill border border-line text-muted hover:text-ink font-pixel text-small flex items-center justify-center transition-colors"
              title="Minimize to Bottom Dock" aria-label="Minimize to Bottom Dock"
            >
              _
            </button>
            {/* Close */}
            <button
              onClick={onClose}
              className="pixel-close"
              title="Close Window" aria-label="Close Window"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress Strip */}
        <div className="h-1.5 bg-app-deep w-full relative">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${Math.max(progressPercent, 2)}%`,
              backgroundColor: initialCategory.color,
            }}
          />
        </div>

        {/* Window Tabs Bar */}
        <div className="flex items-center gap-1 p-1 bg-app-deep border-b-2 border-line font-pixel text-label flex-wrap">
          {(
            [
              { id: 'tasks', label: 'TASKS', emoji: 'clipboard' },
              { id: 'countdown', label: 'TIMER', emoji: 'hourglass' },
              { id: 'notes', label: 'SCRATCHPAD', emoji: 'book' },
              { id: 'log', label: 'ACTIVITY', emoji: 'target' },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2.5 py-1.5 border transition-all flex items-center gap-1 ${
                activeTab === tab.id
                  ? 'bg-surface border-accent-2 text-accent-2 font-bold shadow-xs'
                  : 'bg-app-deep border-transparent text-muted hover:text-ink hover:bg-hover-fill'
              }`}
            >
              <PixelEmoji name={tab.emoji as PixelEmojiName} size={10} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[300px] max-h-[480px]">
          {/* TASKS TAB */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              {/* Quick Add */}
              <form onSubmit={handleQuickAdd} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={quickInput}
                  onChange={e => setQuickInput(e.target.value)}
                  placeholder={`+ Quick add task to ${initialCategory.name}... [Enter]`}
                  className="flex-1 bg-app-deep border-2 border-line focus:border-accent p-2 font-pixel text-caption text-ink outline-none"
                />
                <button
                  type="submit"
                  className="retro-btn-accent px-3 py-2 font-pixel text-caption"
                >
                  ADD
                </button>
              </form>

              {/* Tasks List */}
              <div className="space-y-2">
                {categoryTasks.length === 0 ? (
                  <div className="p-8 text-center text-dim font-pixel text-caption space-y-2">
                    <PixelEmoji name="gem" size={24} />
                    <div>NO TASKS IN THIS CATEGORY YET</div>
                  </div>
                ) : (
                  categoryTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      categoryId={initialCategory.id}
                      task={task}
                      onEdit={t => setEditingTask({ categoryId: initialCategory.id, task: t })}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* COUNTDOWN TIMER TAB */}
          {activeTab === 'countdown' && (
            <div className="p-4 bg-app-deep border-2 border-line text-center space-y-4 font-pixel">
              <div className="flex justify-center">
                <PixelEmoji name="hourglass" size={32} />
              </div>
              <h4 className="text-body text-heading">CATEGORY ALARM / COUNTDOWN</h4>
              <div className="text-2xl md:text-3xl text-accent font-bold tracking-widest py-2 bg-surface border border-line">
                {countdown !== null ? formatTime(countdown) : `${countdownInput}:00`}
              </div>

              <div className="flex items-center justify-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={countdownInput}
                  onChange={e => setCountdownInput(e.target.value)}
                  disabled={isCountdownRunning}
                  className="w-16 bg-surface border-2 border-line text-ink p-1.5 text-center text-body outline-none"
                />
                <span className="text-caption text-muted">MINUTES</span>
              </div>

              <div className="flex justify-center gap-2">
                {!isCountdownRunning ? (
                  <button onClick={startCountdown} className="retro-btn-accent px-4 py-2 text-caption">
                    START TIMER
                  </button>
                ) : (
                  <button
                    onClick={() => setIsCountdownRunning(false)}
                    className="retro-btn px-4 py-2 text-caption text-warn border-warn"
                  >
                    PAUSE
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsCountdownRunning(false)
                    setCountdown(null)
                  }}
                  className="retro-btn px-3 py-2 text-caption text-muted hover:text-ink"
                >
                  RESET
                </button>
              </div>
            </div>
          )}

          {/* NOTES / SCRATCHPAD TAB */}
          {activeTab === 'notes' && (
            <div className="space-y-2 font-pixel">
              <div className="flex items-center justify-between text-label text-muted">
                <span>CATEGORY QUICK SCRATCHPAD (AUTO-SAVED)</span>
                <span>{notes.length} CHARS</span>
              </div>
              <textarea
                value={notes}
                onChange={e => handleNotesChange(e.target.value)}
                placeholder="Jot down quick reminders, links, or notes for this category..."
                rows={10}
                className="w-full bg-app-deep border-2 border-line focus:border-accent p-2.5 text-ink text-caption font-pixel outline-none resize-none leading-relaxed"
              />
            </div>
          )}

          {/* ACTIVITY LOG TAB */}
          {activeTab === 'log' && (
            <div className="space-y-2 font-pixel">
              <div className="text-label text-muted">RECENT ACTIONS IN THIS CATEGORY</div>
              {activity.length === 0 ? (
                <div className="p-8 text-center text-dim text-caption">NO ACTIVITY LOGGED YET</div>
              ) : (
                <div className="space-y-1.5">
                  {activity.map(item => (
                    <div
                      key={item.id}
                      className="p-2 bg-app-deep border border-line text-label flex items-center justify-between gap-2"
                    >
                      <span className="text-ink">{item.text}</span>
                      <span className="text-dim shrink-0">
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Editing a task from inside the pop-out window */}
      <TaskModal
        isOpen={editingTask !== null}
        onClose={() => setEditingTask(null)}
        defaultCategoryId={initialCategory.id}
        taskToEdit={editingTask}
      />
    </AnimatePresence>
  )
}

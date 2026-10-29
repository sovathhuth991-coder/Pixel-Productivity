import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { useTaskContext } from '../context/TaskContext'
import { useCategoryWindowContext } from '../context/CategoryWindowContext'
import StatsCards from '../components/tasks/StatsCards'
import WeeklyReportBanner from '../components/WeeklyReportBanner'
import CategoryCard from '../components/tasks/CategoryCard'
import TaskModal from '../components/tasks/TaskModal'
import CategoryModal from '../components/tasks/CategoryModal'
import ActivityFeed from '../components/tasks/ActivityFeed'
import HeatmapGrid from '../components/tasks/HeatmapGrid'
// The completion chart is built on a charting library that weighs ~400 KB.
// Loading it eagerly put that weight in the very first download on a phone —
// before the user had even seen their to-do list. It now arrives on its own,
// after the page has already painted.
const WeeklyCompletionChart = lazy(() => import('../components/tasks/WeeklyCompletionChart'))
import CategoryWindow from '../components/tasks/CategoryWindow'
import RetroWindowDock from '../components/tasks/RetroWindowDock'
import PixelIcon from '../components/ui/PixelIcon'
import PixelEmoji from '../components/ui/PixelEmoji'
import { playCoin, playClick } from '../utils/audio'
import {
  OPEN_TASK_MODAL_EVENT,
  consumeOpenTaskModalRequest,
} from '../utils/taskModalRequests'
import type { Task, Category, Priority } from '../types/tasks'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { motion } from 'framer-motion'

export default function DashboardPage() {
  const { data, addTask } = useTaskContext()
  const { windows, toggleWindow, closeWindow, minimizeWindow, openWindow } = useCategoryWindowContext()
  const { openShortcutsHelp } = useKeyboardShortcuts()

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFrequency, setActiveFrequency] = useState<'all' | 'daily' | 'weekly' | 'once'>('all')

  // View Mode: 'slide' (horizontal snap carousel) vs 'grid' (classic multi-column)
  const [viewMode, setViewMode] = useState<'slide' | 'grid'>(() => {
    return (localStorage.getItem('dashboard_category_view_mode') as 'slide' | 'grid') || 'slide'
  })
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)
  const isDraggingTrack = useRef(false)
  const dragStartX = useRef(0)
  const dragScrollLeft = useRef(0)

  // Quick Command Bar State
  const [quickTitle, setQuickTitle] = useState('')
  const [quickCatId, setQuickCatId] = useState(data.categories[0]?.id || '')
  const [quickPriority, setQuickPriority] = useState<Priority>('medium')

  // Modals State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>()
  const [taskToEdit, setTaskToEdit] = useState<{ categoryId: string; task: Task } | null>(null)
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null)

  // Carousel scroll listener to update active slide index
  const handleCarouselScroll = useCallback(() => {
    if (!carouselRef.current) return
    const el = carouselRef.current
    const cards = Array.from(el.querySelectorAll<HTMLDivElement>('[data-category-card]'))
    if (cards.length === 0) return

    const scrollCenter = el.scrollLeft + el.clientWidth / 2
    let closestIndex = 0
    let minDiff = Infinity

    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2
      const diff = Math.abs(scrollCenter - cardCenter)
      if (diff < minDiff) {
        minDiff = diff
        closestIndex = index
      }
    })

    setActiveSlideIndex(closestIndex)
  }, [])

  // Animation state for smooth transitions
  const [slideDirection, setSlideDirection] = useState<'prev' | 'next' | null>(null)

  const scrollToSlide = useCallback((index: number, direction: 'prev' | 'next' = 'next') => {
    if (!carouselRef.current) return
    const el = carouselRef.current
    const cards = Array.from(el.querySelectorAll<HTMLDivElement>('[data-category-card]'))
    if (cards[index]) {
      setSlideDirection(direction)
      cards[index].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      setActiveSlideIndex(index)
      playClick()
      // Clear direction after animation
      setTimeout(() => setSlideDirection(null), 400)
    }
  }, [])

  const slidePrev = () => {
    if (activeSlideIndex > 0) {
      scrollToSlide(activeSlideIndex - 1, 'prev')
    }
  }

  const slideNext = () => {
    if (activeSlideIndex < data.categories.length - 1) {
      scrollToSlide(activeSlideIndex + 1, 'next')
    }
  }

  // Mouse grab-to-slide
  const handleMouseDownCarousel = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('button, input, select, textarea, a, .cursor-pointer')) return

    isDraggingTrack.current = true
    dragStartX.current = e.pageX - (carouselRef.current?.offsetLeft || 0)
    dragScrollLeft.current = carouselRef.current?.scrollLeft || 0
  }

  const handleMouseMoveCarousel = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingTrack.current || !carouselRef.current) return
    e.preventDefault()
    const x = e.pageX - (carouselRef.current?.offsetLeft || 0)
    const walk = (x - dragStartX.current) * 1.4
    carouselRef.current.scrollLeft = dragScrollLeft.current - walk
  }

  const handleMouseUpOrLeaveCarousel = () => {
    isDraggingTrack.current = false
  }

  // Ensure quickCatId is valid
  useEffect(() => {
    if (!quickCatId && data.categories.length > 0) {
      setQuickCatId(data.categories[0].id)
    }
  }, [data.categories, quickCatId])

  const handleOpenAddTask = (catId?: string) => {
    setSelectedCategoryId(catId || data.categories[0]?.id)
    setTaskToEdit(null)
    setIsTaskModalOpen(true)
  }

  // The global "N" shortcut asks the Dashboard to open the new-task dialog.
  // It may arrive before this page mounted, so check for a parked request too.
  useEffect(() => {
    const onRequest = () => handleOpenAddTask()
    window.addEventListener(OPEN_TASK_MODAL_EVENT, onRequest)
    if (consumeOpenTaskModalRequest()) onRequest()
    return () => window.removeEventListener(OPEN_TASK_MODAL_EVENT, onRequest)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.categories])

  const handleOpenAddCategory = () => {
    setCategoryToEdit(null)
    setIsCategoryModalOpen(true)
  }

  const handleOpenEditTask = (categoryId: string, task: Task) => {
    setTaskToEdit({ categoryId, task })
    setIsTaskModalOpen(true)
  }

  const handleOpenEditCategory = (category: Category) => {
    setCategoryToEdit(category)
    setIsCategoryModalOpen(true)
  }

  const handleToggleWindow = (category: Category) => {
    toggleWindow(category.id, category)
  }

  const getWindowState = (categoryId: string) => {
    return windows.find(w => w.categoryId === categoryId)
  }

  const activeWindows = windows.filter(w => !w.minimized)

  // Global Quick Add handler
  const handleGlobalQuickAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickTitle.trim()) return
    const targetCatId = quickCatId || data.categories[0]?.id
    if (!targetCatId) return

    addTask(targetCatId, {
      title: quickTitle.trim(),
      frequency: 'daily',
      priority: quickPriority,
      completed: false,
      streak: 0,
      pomodorosSpent: 0,
    })
    setQuickTitle('')
    playCoin()
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-4 border-line pb-4">
        <div>
          <h1 className="font-pixel text-base md:text-xl text-accent pixel-shadow flex items-center gap-2.5">
            <PixelEmoji name="clipboard" size={26} />
            <span>TASK COMMAND CENTER {activeWindows.length > 0 && `(${activeWindows.length} OPEN)`}</span>
          </h1>
          <p className="font-pixel text-caption text-muted mt-1.5">
            DAILY HABITS, WEEKLY TARGETS & MILESTONES
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openShortcutsHelp}
            className="font-pixel text-caption px-2.5 py-2 bg-surface hover:bg-hover-fill border-2 border-line text-muted hover:text-ink transition-colors flex items-center gap-1 pixel-border"
            title="View keyboard commands" aria-label="View keyboard commands"
          >
            <span>[?]</span>
            <span className="hidden sm:inline">KEYS</span>
          </button>
          <button
            onClick={() => handleOpenAddTask()}
            className="retro-btn-accent font-pixel text-small px-3.5 py-2.5 flex items-center gap-1.5"
          >
            <PixelIcon name="plus" size={11} className="shrink-0" />
            <span>NEW TASK</span>
          </button>
          <button
            onClick={handleOpenAddCategory}
            className="retro-btn font-pixel text-small px-3.5 py-2.5 flex items-center gap-1.5"
          >
            <PixelIcon name="folder" size={14} className="shrink-0" />
            <span>+ CATEGORY</span>
          </button>
        </div>
      </div>

      {/* The weekly-report reminder finally has an in-app presence */}
      <WeeklyReportBanner />

      {/* Global Stats Row */}
      <StatsCards />

      {/* Quick Task Command Bar */}
      {data.categories.length > 0 && (
        <form
          onSubmit={handleGlobalQuickAdd}
          className="bg-surface border-4 border-line p-2.5 pixel-border flex flex-col md:flex-row items-stretch md:items-center gap-2"
        >
          <div className="flex items-center gap-2 px-2 text-accent">
            <PixelEmoji name="target" size={16} />
            <span className="font-pixel text-caption hidden sm:inline whitespace-nowrap">QUICK TASK:</span>
          </div>

          <input
            type="text"
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            placeholder="Type task title and hit Enter..."
            className="flex-1 min-w-0 bg-app-deep border-2 border-line focus:border-accent px-3 py-2 text-ink font-pixel text-caption outline-none"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={quickCatId}
              onChange={e => setQuickCatId(e.target.value)}
              className="bg-app-deep border-2 border-line focus:border-accent px-2.5 py-2 font-pixel text-caption text-ink outline-none cursor-pointer flex-1 min-w-0 sm:flex-none sm:max-w-[140px]"
            >
              {data.categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={quickPriority}
              onChange={e => setQuickPriority(e.target.value as Priority)}
              className="bg-app-deep border-2 border-line focus:border-accent px-2 py-2 font-pixel text-caption text-ink outline-none cursor-pointer flex-1 min-w-0 sm:flex-none"
            >
              <option value="low">PRIORITY: LOW</option>
              <option value="medium">PRIORITY: MED</option>
              <option value="high">PRIORITY: HIGH</option>
            </select>

            <button
              type="submit"
              disabled={!quickTitle.trim()}
              className="retro-btn-accent font-pixel text-caption px-3.5 py-2 disabled:opacity-50 shrink-0"
            >
              + ADD
            </button>
          </div>
        </form>
      )}

      {/* Search & Frequency Tabs Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface border-4 border-line p-3 pixel-border">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-muted">
            <PixelIcon name="search" size={14} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter tasks by title or notes..."
            className="w-full pl-8 pr-3 py-2 bg-app-deep border-2 border-line focus:border-accent text-ink font-pixel text-caption outline-none"
          />
        </div>

        {/* Frequency Filter Tabs & View Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'daily', 'weekly', 'once'] as const).map(freq => (
              <button
                key={freq}
                onClick={() => setActiveFrequency(freq)}
                className={`font-pixel text-caption px-3 py-2 border-2 transition-all ${
                  activeFrequency === freq
                    ? 'bg-accent border-accent-hot text-on-accent font-bold shadow-xs'
                    : 'bg-app-deep border-line text-muted hover:text-ink hover:border-accent-2'
                }`}
              >
                {freq.toUpperCase()}
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-app-deep p-1 border-2 border-line ml-auto">
            <button
              type="button"
              onClick={() => {
                setViewMode('slide')
                localStorage.setItem('dashboard_category_view_mode', 'slide')
                playClick()
              }}
              className={`font-pixel text-caption px-2.5 py-1.5 transition-all flex items-center gap-1 ${
                viewMode === 'slide'
                  ? 'bg-accent-2 text-on-accent-2 font-bold shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
              title="Slideable horizontal window carousel with snap rule" aria-label="Slideable horizontal window carousel with snap rule"
            >
              <span>↔ SLIDE VIEW</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('grid')
                localStorage.setItem('dashboard_category_view_mode', 'grid')
                playClick()
              }}
              className={`font-pixel text-caption px-2.5 py-1.5 transition-all flex items-center gap-1 ${
                viewMode === 'grid'
                  ? 'bg-accent-2 text-on-accent-2 font-bold shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
              title="Classic multi-column grid layout" aria-label="Classic multi-column grid layout"
            >
              <span>⊞ GRID</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Categories Section */}
      {data.categories.length === 0 ? (
        <div className="bg-surface border-4 border-line p-12 text-center pixel-border space-y-3">
          <div className="flex justify-center">
            <PixelEmoji name="gem" size={48} />
          </div>
          <h2 className="font-pixel text-lead text-ink font-bold">
            NO CATEGORIES FOUND
          </h2>
          <p className="font-pixel text-caption text-muted">
            Create your first category to start organizing your daily tasks!
          </p>
          <button
            onClick={handleOpenAddCategory}
            className="retro-btn-teal font-pixel text-small px-4 py-2.5"
          >
            CREATE FIRST CATEGORY
          </button>
        </div>
      ) : viewMode === 'slide' ? (
        /* Slideable Category Carousel View */
        <div className="space-y-3">
          {/* Slide Navigation Header Bar */}
          <div className="bg-surface border-4 border-line p-3 pixel-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="font-pixel text-caption text-accent-2 flex items-center gap-1 shrink-0">
                <PixelEmoji name="target" size={14} />
                <span>SLIDE {activeSlideIndex + 1}/{data.categories.length}:</span>
              </span>
              <motion.span
                key={activeSlideIndex}
                initial={{ opacity: 0, x: slideDirection === 'prev' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: slideDirection === 'prev' ? -20 : 20 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="font-pixel text-small px-2 py-0.5 border truncate max-w-[150px]"
                style={{
                  borderColor: data.categories[activeSlideIndex]?.color || 'var(--line)',
                  backgroundColor: `${data.categories[activeSlideIndex]?.color || '#166b56'}20`,
                  color: data.categories[activeSlideIndex]?.color || 'var(--ink)',
                }}
              >
                {data.categories[activeSlideIndex]?.name || 'Category'}
              </motion.span>
              <span className="font-pixel text-label text-muted border border-line px-1.5 py-0.5 bg-app-deep shrink-0">
                RULE: 1-CARD SNAP
              </span>
            </div>

            {/* Category Quick Selector Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5 scrollbar-none">
              {data.categories.map((cat, idx) => (
                <motion.button
                  key={cat.id}
                  onClick={() => scrollToSlide(idx)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    backgroundColor: activeSlideIndex === idx ? cat.color : 'var(--app-deep)',
                    color: activeSlideIndex === idx ? 'var(--on-accent-2)' : 'var(--muted)',
                    borderColor: activeSlideIndex === idx ? cat.color : 'var(--line)',
                  }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="font-pixel text-label px-2 py-1 border transition-all flex items-center gap-1 whitespace-nowrap shrink-0"
                  title={`Jump to ${cat.name}`}
                >
                  <span
                    className="w-1.5 h-1.5 shrink-0"
                    style={{ backgroundColor: cat.color || '#b53823' }}
                  />
                  <span className="max-w-[70px] truncate">{cat.name}</span>
                </motion.button>
              ))}
            </div>

            {/* Previous & Next Slide Arrow Buttons */}
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              <motion.button
                onClick={slidePrev}
                disabled={activeSlideIndex === 0}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={slideDirection === 'prev' ? { x: [-8, 0] } : {}}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="font-pixel text-caption px-3 py-1.5 bg-app-deep border-2 border-line hover:border-accent-2 disabled:opacity-40 disabled:hover:border-line text-ink transition-colors flex items-center gap-1"
                title="Slide to previous category (Left)"
                aria-label="Show previous category"
              >
                <span className="font-pixel text-base">◀</span>
                <span className="hidden sm:inline">PREV</span>
              </motion.button>
              <motion.button
                onClick={slideNext}
                disabled={activeSlideIndex >= data.categories.length - 1}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={slideDirection === 'next' ? { x: [8, 0] } : {}}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="font-pixel text-caption px-3 py-1.5 bg-app-deep border-2 border-line hover:border-accent-2 disabled:opacity-40 disabled:hover:border-line text-ink transition-colors flex items-center gap-1"
                title="Slide to next category (Right)"
                aria-label="Show next category"
              >
                <span className="hidden sm:inline">NEXT</span>
                <span className="font-pixel text-base">▶</span>
              </motion.button>
            </div>
          </div>

          {/* Slide Progress Indicator Bar */}
          <div className="w-full h-1 bg-app-deep mt-2 overflow-hidden border-2 border-line/40">
            <motion.div
              style={{
                width: `${((activeSlideIndex + 1) / data.categories.length) * 100}%`,
                backgroundColor: data.categories[activeSlideIndex]?.color || '#166b56',
              }}
              animate={{ width: `${((activeSlideIndex + 1) / data.categories.length) * 100}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="h-full"
            />
          </div>

          {/* Slideable Category Track */}
          <div
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            onMouseDown={handleMouseDownCarousel}
            onMouseMove={handleMouseMoveCarousel}
            onMouseUp={handleMouseUpOrLeaveCarousel}
            onMouseLeave={handleMouseUpOrLeaveCarousel}
            className="retro-snap-carousel flex gap-4 overflow-x-auto py-2 px-1 focus:outline-none cursor-grab active:cursor-grabbing"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {data.categories.map(cat => (
              <div
                key={cat.id}
                data-category-card
                className="shrink-0 w-[92vw] sm:w-[500px] md:w-[600px] max-w-full snap-center select-text"
              >
                <CategoryCard
                  category={cat}
                  searchQuery={searchQuery}
                  activeFrequency={activeFrequency}
                  onAddTask={handleOpenAddTask}
                  onEditTask={handleOpenEditTask}
                  onEditCategory={handleOpenEditCategory}
                  onWindowToggle={handleToggleWindow}
                  windowMinimized={getWindowState(cat.id)?.minimized ?? false}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Classic Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.categories.map(cat => (
            <CategoryCard
              key={cat.id}
              category={cat}
              searchQuery={searchQuery}
              activeFrequency={activeFrequency}
              onAddTask={handleOpenAddTask}
              onEditTask={handleOpenEditTask}
              onEditCategory={handleOpenEditCategory}
              onWindowToggle={handleToggleWindow}
              windowMinimized={getWindowState(cat.id)?.minimized ?? false}
            />
          ))}
        </div>
      )}

      {/* 7-Day Completion Velocity Chart */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-10 border-4 border-line bg-surface/20">
            <span className="font-pixel text-caption text-muted">LOADING CHART…</span>
          </div>
        }
      >
        <WeeklyCompletionChart />
      </Suspense>

      {/* Bottom Analytics & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
        <HeatmapGrid />
        <ActivityFeed />
      </div>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        defaultCategoryId={selectedCategoryId}
        taskToEdit={taskToEdit}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categoryToEdit={categoryToEdit}
      />

      {/* Draggable Category Windows */}
      {windows.map(windowState => {
        const category = data.categories.find(c => c.id === windowState.categoryId)
        if (!category) return null
        return (
          <CategoryWindow
            key={windowState.id}
            category={category}
            onClose={() => closeWindow(category.id)}
            isMinimized={windowState.minimized}
          />
        )
      })}

      {/* Retro Desktop Window Dock */}
      <RetroWindowDock />
    </div>
  )
}

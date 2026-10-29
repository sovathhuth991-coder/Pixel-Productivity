import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTaskContext } from '../context/TaskContext'
import { usePomodoroContext } from '../context/PomodoroContext'
import { useToast } from '../components/ui/Toast'
import PixelIcon from '../components/ui/PixelIcon'
import PixelEmoji, { type PixelEmojiName } from '../components/ui/PixelEmoji'
import TaskModal from '../components/tasks/TaskModal'
import { playComplete, playStart, playCoin, playClick } from '../utils/audio'
import type { Task, Priority } from '../types/tasks'

interface TaskWithCategory {
  categoryId: string
  categoryName: string
  categoryColor: string
  task: Task
}

const PRIORITY_BADGES: Record<Priority, { label: string; color: string; border: string; emoji: PixelEmojiName }> = {
  low: { label: 'LOW', color: 'text-success', border: 'border-success', emoji: 'gem' },
  medium: { label: 'MED', color: 'text-warn', border: 'border-warn', emoji: 'warning' },
  high: { label: 'HIGH', color: 'text-danger', border: 'border-danger', emoji: 'skull' },
}

export default function BoardPage() {
  const navigate = useNavigate()
  const { data, toggleTask, deleteTask, restoreTask, updateTask, addTask } = useTaskContext()
  const { setActiveTask } = usePomodoroContext()
  const { showToast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // Inline column add states
  const [colInputs, setColInputs] = useState<Record<string, string>>({
    todo: '',
    inprogress: '',
    done: '',
  })

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>()
  const [taskToEdit, setTaskToEdit] = useState<{ categoryId: string; task: Task } | null>(null)

  // Flatten tasks with category metadata
  const allTasks: TaskWithCategory[] = []
  data.categories.forEach(cat => {
    cat.tasks.forEach(task => {
      allTasks.push({
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color,
        task,
      })
    })
  })

  // Filter tasks
  const filteredTasks = allTasks.filter(item => {
    const matchesSearch =
      item.task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.task.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === 'all' || item.categoryId === filterCategory
    return matchesSearch && matchesCategory
  })

  // Group into columns
  const todoTasks = filteredTasks.filter(item => !item.task.completed && item.task.pomodorosSpent === 0)
  const inProgressTasks = filteredTasks.filter(item => !item.task.completed && item.task.pomodorosSpent > 0)
  const doneTasks = filteredTasks.filter(item => item.task.completed)

  const handleOpenAddTask = (targetCol?: 'todo' | 'inprogress' | 'done') => {
    setTaskToEdit(null)
    const catId = filterCategory !== 'all' ? filterCategory : data.categories[0]?.id
    setSelectedCategoryId(catId)
    setIsTaskModalOpen(true)
  }

  const handleEditTask = (item: TaskWithCategory) => {
    setTaskToEdit({ categoryId: item.categoryId, task: item.task })
    setIsTaskModalOpen(true)
  }

  const handleFocusTask = (item: TaskWithCategory) => {
    setActiveTask({ categoryId: item.categoryId, task: item.task })
    showToast(`Locked target: "${item.task.title}" 🍅`, 'info')
    navigate('/pomodoro', { state: { task: { categoryId: item.categoryId, task: item.task } } })
  }

  const handleToggleDone = (item: TaskWithCategory) => {
    toggleTask(item.categoryId, item.task.id)
    if (!item.task.completed) {
      playComplete()
      showToast('Task marked completed! 🏆', 'success')
    } else {
      playClick()
      showToast('Task reopened', 'info')
    }
  }

  // Promote task to next column
  const handlePromote = (item: TaskWithCategory, currentColumn: 'todo' | 'inprogress') => {
    if (currentColumn === 'todo') {
      // Move to in progress
      updateTask(item.categoryId, item.task.id, { pomodorosSpent: Math.max(1, item.task.pomodorosSpent || 1) })
      playStart()
      showToast('Promoted to IN PROGRESS', 'info')
    } else if (currentColumn === 'inprogress') {
      // Complete task
      toggleTask(item.categoryId, item.task.id)
      playComplete()
      showToast('Promoted to COMPLETED! 🏆', 'success')
    }
  }

  // Demote task to previous column
  const handleDemote = (item: TaskWithCategory, currentColumn: 'inprogress' | 'done') => {
    if (currentColumn === 'inprogress') {
      // Revert to TO DO
      updateTask(item.categoryId, item.task.id, { pomodorosSpent: 0 })
      playClick()
      showToast('Moved back to TO DO', 'info')
    } else if (currentColumn === 'done') {
      // Reopen to IN PROGRESS
      toggleTask(item.categoryId, item.task.id)
      updateTask(item.categoryId, item.task.id, { pomodorosSpent: Math.max(1, item.task.pomodorosSpent || 1) })
      playClick()
      showToast('Reopened in IN PROGRESS', 'info')
    }
  }

  const handleDeleteTask = (item: TaskWithCategory) => {
    const siblingTasks = data.categories.find(c => c.id === item.categoryId)?.tasks
    const index = siblingTasks ? siblingTasks.findIndex(t => t.id === item.task.id) : -1
    deleteTask(item.categoryId, item.task.id)
    showToast(`"${item.task.title}" deleted`, 'warn', {
      label: 'UNDO',
      onClick: () => restoreTask(item.categoryId, item.task, index >= 0 ? index : undefined),
    })
  }

  // Column inline task add
  const handleColumnQuickAdd = (colId: 'todo' | 'inprogress' | 'done', e: React.FormEvent) => {
    e.preventDefault()
    const text = colInputs[colId]?.trim()
    if (!text) return
    const targetCatId = filterCategory !== 'all' ? filterCategory : data.categories[0]?.id
    if (!targetCatId) return

    addTask(targetCatId, {
      title: text,
      frequency: 'daily',
      priority: 'medium',
      completed: colId === 'done',
      streak: 0,
      pomodorosSpent: colId === 'inprogress' ? 1 : 0,
    })

    setColInputs(prev => ({ ...prev, [colId]: '' }))
    playCoin()
    showToast(`Added task to ${colId.toUpperCase()}`, 'success')
  }

  const columns = [
    {
      id: 'todo' as const,
      title: 'TO DO',
      count: todoTasks.length,
      emoji: 'hourglass' as PixelEmojiName,
      color: 'border-accent text-accent',
      accentColor: 'var(--accent)',
      tasks: todoTasks,
      emptyText: 'No pending tasks in TO DO',
    },
    {
      id: 'inprogress' as const,
      title: 'IN PROGRESS',
      count: inProgressTasks.length,
      emoji: 'gear' as PixelEmojiName,
      color: 'border-accent-2 text-accent-2',
      accentColor: 'var(--accent-2)',
      tasks: inProgressTasks,
      emptyText: 'No tasks currently underway',
    },
    {
      id: 'done' as const,
      title: 'COMPLETED',
      count: doneTasks.length,
      emoji: 'trophy' as PixelEmojiName,
      color: 'border-purple text-purple',
      accentColor: 'var(--purple)',
      tasks: doneTasks,
      emptyText: 'No completed tasks yet',
    },
  ]

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 min-h-full overflow-x-auto pb-20">
      {/* Top Header Bar */}
      <div className="w-full max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-line pb-4">
        <div>
          <h1 className="font-pixel text-base md:text-xl text-accent pixel-shadow flex items-center gap-2.5">
            <PixelEmoji name="board" size={26} />
            <span>PIXEL KANBAN BOARD</span>
          </h1>
          <p className="font-pixel text-caption text-muted mt-1.5">
            DRAG, MOVE & ACCELERATE YOUR FOCUS PIPELINE
          </p>
        </div>

        <button
          onClick={() => handleOpenAddTask()}
          className="retro-btn-accent font-pixel text-small px-3.5 py-2.5 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <PixelIcon name="plus" size={11} />
          <span>NEW TASK</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="w-full max-w-7xl mx-auto mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface border-4 border-line p-3 pixel-border">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-muted">
            <PixelIcon name="search" size={14} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search board tasks..."
            className="w-full pl-8 pr-3 py-2 bg-app-deep border-2 border-line focus:border-accent text-ink font-pixel text-caption outline-none"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterCategory('all')}
            className={`font-pixel text-label px-2.5 py-2 border transition-all ${
              filterCategory === 'all'
                ? 'bg-accent border-accent-hot text-on-accent font-bold'
                : 'bg-app-deep border-line text-muted hover:text-ink'
            }`}
          >
            ALL ({allTasks.length})
          </button>
          {data.categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`font-pixel text-label px-2.5 py-2 border transition-all flex items-center gap-1 ${
                filterCategory === cat.id
                  ? 'border-accent-2 text-accent-2 bg-accent-2/15 font-bold'
                  : 'bg-app-deep border-line text-muted hover:text-ink'
              }`}
            >
              <div
                className="w-1.5 h-1.5 shrink-0 border border-ink/40"
                style={{ backgroundColor: cat.color }}
              />
              <span>{cat.name}</span>
              <span>({cat.tasks.length})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Columns Grid */}
      <div className="w-full max-w-7xl mx-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {columns.map(col => (
          <div
            key={col.id}
            className="bg-surface border-4 border-line pixel-border flex flex-col h-full min-h-[540px] shadow-lg"
          >
            {/* Column Header */}
            <div className="p-3 border-b-4 border-line bg-surface flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PixelEmoji name={col.emoji} size={18} />
                <span className={`font-pixel text-body ${col.color} font-bold`}>
                  {col.title}
                </span>
                <span className="font-pixel text-caption px-1.5 py-0.5 bg-app-deep border border-line text-muted">
                  {col.count}
                </span>
              </div>

              <button
                onClick={() => handleOpenAddTask(col.id)}
                className="font-pixel text-body w-8 h-8 bg-app-deep hover:bg-hover-fill border border-line text-muted hover:text-ink flex items-center justify-center transition-colors"
                title={`Open modal to add to ${col.title}`}
              >
                +
              </button>
            </div>

            {/* Quick Add Input inside column */}
            <form
              onSubmit={e => handleColumnQuickAdd(col.id, e)}
              className="p-2 border-b border-line bg-app-deep/50 flex items-center gap-1.5"
            >
              <input
                type="text"
                value={colInputs[col.id]}
                onChange={e =>
                  setColInputs(prev => ({ ...prev, [col.id]: e.target.value }))
                }
                placeholder={`+ Add to ${col.title}... [Enter]`}
                className="flex-1 bg-app-deep border border-line focus:border-accent px-2 py-1.5 font-pixel text-caption text-ink outline-none"
              />
              {colInputs[col.id]?.trim() && (
                <button
                  type="submit"
                  className="font-pixel text-label px-2 py-1.5 bg-accent-2 border border-accent-2-hot text-on-accent-2 font-bold"
                >
                  ADD
                </button>
              )}
            </form>

            {/* Cards Container */}
            <div className="flex-1 p-2 space-y-3 overflow-y-auto max-h-[640px]">
              {col.tasks.length === 0 ? (
                <div className="p-10 text-center text-dim font-pixel text-caption space-y-2">
                  <div className="flex justify-center opacity-60">
                    <PixelEmoji name={col.emoji} size={28} />
                  </div>
                  <div>{col.emptyText}</div>
                </div>
              ) : (
                col.tasks.map(item => {
                  const priorityMeta =
                    PRIORITY_BADGES[item.task.priority] || PRIORITY_BADGES.medium

                  return (
                    <div
                      key={item.task.id}
                      className="bg-app-deep border-2 border-line hover:border-accent-2 transition-all p-3 space-y-2.5 pixel-border group relative shadow-xs"
                    >
                      {/* Top Bar: Category Pill & Edit Actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="font-pixel text-micro px-1.5 py-0.5 border"
                            style={{
                              borderColor: item.categoryColor,
                              color: item.categoryColor,
                            }}
                          >
                            {item.categoryName}
                          </span>
                          <span
                            className={`font-pixel text-micro px-1 py-0.5 border flex items-center gap-1 ${priorityMeta.border} ${priorityMeta.color}`}
                          >
                            <PixelEmoji name={priorityMeta.emoji} size={10} />
                            <span>{priorityMeta.label}</span>
                          </span>
                          <span className="font-pixel text-micro px-1 py-0.5 bg-surface border border-line text-muted capitalize">
                            {item.task.frequency}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditTask(item)}
                            className="text-muted hover:text-ink font-pixel text-small p-0.5 w-8 h-8 flex items-center justify-center"
                            title="Edit task" aria-label="Edit task"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDeleteTask(item)}
                            className="text-muted hover:text-danger font-pixel text-small p-0.5 w-8 h-8 flex items-center justify-center"
                            title="Delete task" aria-label="Delete task"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Task Title & Checkbox */}
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => handleToggleDone(item)}
                          className="w-8 h-8 -m-1 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                          title={item.task.completed ? 'Mark uncompleted' : 'Mark completed'}
                          aria-label={item.task.completed ? `Mark ${item.task.title} as not done` : `Mark ${item.task.title} as done`}
                        >
                          <span
                            className={`w-4 h-4 border-2 flex items-center justify-center ${
                              item.task.completed
                                ? 'bg-success border-success text-on-accent-2 font-bold'
                                : 'bg-surface border-line hover:border-success'
                            }`}
                          >
                            {item.task.completed && <span className="font-bold text-small">✓</span>}
                          </span>
                        </button>

                        <div className="flex-1 min-w-0">
                          <h3>
                            <button
                              type="button"
                              onClick={() => handleEditTask(item)}
                              title="Edit task" aria-label="Edit task"
                              className={`font-pixel text-small text-left cursor-pointer hover:text-accent transition-colors leading-relaxed break-words ${
                                item.task.completed ? 'line-through text-muted' : 'text-ink'
                              }`}
                            >
                              {item.task.title}
                            </button>
                          </h3>
                          {item.task.description && (
                            <p className="font-pixel text-label text-muted mt-1 line-clamp-2 leading-normal">
                              {item.task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Movement Controls & Focus */}
                      <div className="pt-2 border-t border-line flex items-center justify-between gap-1.5 flex-wrap">
                        {/* Stats Badges */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-pixel text-label flex items-center gap-1 ${
                              item.task.pomodorosSpent > 0 ? 'text-accent' : 'text-dim'
                            }`}
                          >
                            <PixelEmoji name="tomato" size={12} />
                            <span>{item.task.pomodorosSpent}</span>
                          </span>
                          {item.task.streak > 0 && (
                            <span className="font-pixel text-label text-warn flex items-center gap-1">
                              <PixelEmoji name="flame" size={12} />
                              <span>{item.task.streak}</span>
                            </span>
                          )}
                        </div>

                        {/* Direct Action Pipeline */}
                        <div className="flex items-center gap-1">
                          {/* Move backwards */}
                          {col.id === 'inprogress' && (
                            <button
                              onClick={() => handleDemote(item, 'inprogress')}
                              className="font-pixel text-micro px-1.5 py-1 min-h-8 bg-surface hover:bg-hover-fill border border-line text-muted hover:text-ink transition-colors"
                              title="Revert to TO DO" aria-label="Revert to TO DO"
                            >
                              ◀ TO DO
                            </button>
                          )}
                          {col.id === 'done' && (
                            <button
                              onClick={() => handleDemote(item, 'done')}
                              className="font-pixel text-micro px-1.5 py-1 min-h-8 bg-surface hover:bg-hover-fill border border-line text-muted hover:text-ink transition-colors"
                              title="Reopen in IN PROGRESS" aria-label="Reopen in IN PROGRESS"
                            >
                              ◀ REOPEN
                            </button>
                          )}

                          {/* Move forward */}
                          {col.id === 'todo' && (
                            <button
                              onClick={() => handlePromote(item, 'todo')}
                              className="font-pixel text-micro px-1.5 py-1 min-h-8 bg-surface hover:bg-accent-2/20 border border-line hover:border-accent-2 text-accent-2 transition-colors flex items-center gap-1"
                              title="Start working (promote to In Progress)" aria-label="Start working (promote to In Progress)"
                            >
                              <PixelEmoji name="lightning" size={8} />
                              <span>START ▶</span>
                            </button>
                          )}
                          {col.id === 'inprogress' && (
                            <button
                              onClick={() => handlePromote(item, 'inprogress')}
                              className="font-pixel text-micro px-1.5 py-1 min-h-8 bg-success/20 hover:bg-success border border-success text-success hover:text-on-accent-2 transition-colors flex items-center gap-1"
                              title="Complete this task" aria-label="Complete this task"
                            >
                              <span>DONE ▶</span>
                            </button>
                          )}

                          {/* Focus Button */}
                          <button
                            onClick={() => handleFocusTask(item)}
                            className="font-pixel text-micro px-1.5 py-1 min-h-8 bg-accent/20 hover:bg-accent text-accent hover:text-on-accent border border-accent transition-colors flex items-center gap-1"
                            title="Open timer with this task" aria-label="Open timer with this task"
                          >
                            <span>FOCUS</span>
                            <PixelEmoji name="tomato" size={8} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        defaultCategoryId={selectedCategoryId}
        taskToEdit={taskToEdit}
      />
    </div>
  )
}

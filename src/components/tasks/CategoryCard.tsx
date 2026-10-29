import { useState, useRef } from 'react'
import type { Category, Task } from '../../types/tasks'
import { useTaskContext } from '../../context/TaskContext'
import TaskItem from './TaskItem'
import PixelIcon from '../ui/PixelIcon'
import PixelEmoji from '../ui/PixelEmoji'
import Dialog from '../ui/Dialog'
import { playCoin } from '../../utils/audio'

interface CategoryCardProps {
  category: Category
  searchQuery: string
  activeFrequency: string
  onAddTask: (categoryId: string) => void
  onEditTask: (categoryId: string, task: Task) => void
  onEditCategory: (category: Category) => void
  onWindowToggle: (category: Category) => void
  windowMinimized: boolean
}

export default function CategoryCard({
  category,
  searchQuery,
  activeFrequency,
  onAddTask,
  onEditTask,
  onEditCategory,
  onWindowToggle,
  windowMinimized,
}: CategoryCardProps) {
  const { addTask, deleteCategory } = useTaskContext()
  const [collapsed, setCollapsed] = useState(false)
  const [quickInput, setQuickInput] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter tasks based on search and frequency
  const filteredTasks = category.tasks.filter(task => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesFreq =
      activeFrequency === 'all' || task.frequency === activeFrequency

    return matchesSearch && matchesFreq
  })

  const totalCount = category.tasks.length
  const completedCount = category.tasks.filter(t => t.completed).length
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickInput.trim()) return
    addTask(category.id, {
      title: quickInput.trim(),
      frequency: 'daily',
      priority: 'medium',
      completed: false,
      streak: 0,
      pomodorosSpent: 0,
    })
    setQuickInput('')
    playCoin()
  }

  return (
    <div className="bg-surface border-4 border-line pixel-border flex flex-col overflow-hidden transition-all duration-150 hover:border-accent-2/60">
      {/* Category Header */}
      <div
        className="p-3 border-b-4 border-line flex items-center justify-between select-none"
        style={{ borderTop: `4px solid ${category.color || '#b53823'}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="font-pixel text-small text-muted hover:text-ink w-4 text-center"
            title={collapsed ? 'Expand' : 'Collapse'}
            aria-expanded={!collapsed}
          >
            {collapsed ? '▶' : '▼'}
          </button>
          <div
            className="w-2.5 h-2.5 shrink-0 border border-ink/40"
            style={{ backgroundColor: category.color }}
          />
          <h2 className="min-w-0">
            <button
              type="button"
              onClick={() => onEditCategory(category)}
              title="Rename category" aria-label="Rename category"
              className="font-pixel text-body text-ink truncate font-bold hover:text-accent-2 transition-colors text-left"
            >
              {category.name}
            </button>
          </h2>
          <span className="font-pixel text-label px-1.5 py-0.5 bg-app-deep text-muted border border-line">
            {completedCount}/{totalCount}
          </span>
          {windowMinimized && (
            <span
              className="inline-flex items-center gap-1 font-pixel text-micro text-warn bg-warn/15 border border-warn/40 px-1 py-0.2 animate-pulse"
              title="Window is minimized to bottom dock"
            >
              <PixelIcon name="bell" size={8} />
              <span>DOCK</span>
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Pop out to draggable window */}
          <button
            onClick={() => onWindowToggle(category)}
            className="font-pixel text-label px-2 py-1 bg-surface hover:bg-hover-fill border border-line text-muted hover:text-accent-2 transition-colors flex items-center gap-1"
            title="Pop out to floating desktop window" aria-label="Pop out to floating desktop window"
          >
            <span>⧉</span>
            <span className="hidden sm:inline">WINDOW</span>
          </button>
          <button
            onClick={() => onAddTask(category.id)}
            className="font-pixel text-label px-2 py-1 bg-accent-2/20 border border-accent-2 text-accent-2 hover:bg-accent-2 hover:text-on-accent-2 transition-colors"
            title="Create Task with details" aria-label="Create Task with details"
          >
            + TASK
          </button>
          <button
            onClick={() => onEditCategory(category)}
            title="Edit Category Name & Color" aria-label="Edit Category Name & Color"
            className="font-pixel text-caption p-1 text-muted hover:text-ink"
          >
            ✎
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            title="Delete Category" aria-label="Delete Category"
            className="font-pixel text-caption p-1 text-danger/80 hover:text-danger w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Retro Segmented Progress Bar */}
      <div className="h-2 bg-app-deep w-full relative overflow-hidden flex items-center px-1 border-b border-line/40">
        <div
          className="h-1 transition-all duration-300"
          style={{
            // No fake minimum: a category with nothing completed renders an
            // empty track, not 3% of imaginary progress.
            width: `${percent}%`,
            backgroundColor: category.color || '#166b56',
          }}
        />
        {percent > 0 && (
          <span className="absolute right-2 font-pixel text-micro text-muted">
            {percent}%
          </span>
        )}
      </div>

      {/* Task List & Quick Add Input */}
      {!collapsed && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Inline Quick Add Input */}
          <form
            onSubmit={handleQuickAdd}
            className="p-2 border-b border-line/60 bg-app-deep/40 flex items-center gap-1.5"
          >
            <input
              ref={inputRef}
              type="text"
              value={quickInput}
              onChange={e => setQuickInput(e.target.value)}
              placeholder={`+ Quick add to ${category.name}... [Enter]`}
              className="flex-1 bg-app-deep border border-line focus:border-accent px-2 py-1.5 font-pixel text-caption text-ink outline-none"
            />
            {quickInput.trim() && (
              <button
                type="submit"
                className="font-pixel text-label px-2 py-1.5 bg-accent-2 border border-accent-2-hot text-on-accent-2 font-bold shrink-0"
              >
                ADD
              </button>
            )}
          </form>

          {/* Tasks Container */}
          <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[380px]">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-6 font-pixel text-caption text-dim space-y-2">
                <div className="flex justify-center">
                  <PixelEmoji name="gem" size={24} />
                </div>
                <div>
                  {category.tasks.length === 0
                    ? 'NO TASKS YET. TYPE ABOVE OR CLICK + TASK'
                    : 'NO MATCHING TASKS FOUND'}
                </div>
              </div>
            ) : (
              filteredTasks.map(task => (
                <TaskItem
                  key={task.id}
                  categoryId={category.id}
                  task={task}
                  onEdit={t => onEditTask(category.id, t)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Delete Category Confirmation — the app's own dialog, not a native
          confirm() that ignores the theme and blocks the whole UI. */}
      <Dialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        labelledBy={`delete-category-title-${category.id}`}
        panelClassName="bg-surface border-4 border-line pixel-border w-full max-w-md p-4 space-y-4"
      >
        <h3
          id={`delete-category-title-${category.id}`}
          className="font-pixel text-body text-danger flex items-center gap-2"
        >
          <PixelEmoji name="warning" size={16} />
          <span>DELETE CATEGORY?</span>
        </h3>
        <p className="font-pixel text-caption text-muted leading-relaxed">
          &quot;{category.name}&quot; AND ALL {category.tasks.length} OF ITS TASKS WILL BE REMOVED.
        </p>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="font-pixel text-caption px-3 py-2 border-2 border-line text-muted hover:text-ink min-h-8"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmDelete(false)
              deleteCategory(category.id)
            }}
            className="font-pixel text-caption px-3 py-2 bg-danger text-on-danger border-2 border-danger font-bold min-h-8 hover:brightness-110"
          >
            DELETE
          </button>
        </div>
      </Dialog>
    </div>
  )
}

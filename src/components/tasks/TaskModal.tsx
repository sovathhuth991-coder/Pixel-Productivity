import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import { useTaskContext } from '../../context/TaskContext'
import type { Task, Frequency, Priority } from '../../types/tasks'
import { useToast } from '../ui/Toast'
import PixelEmoji from '../ui/PixelEmoji'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  defaultCategoryId?: string
  taskToEdit?: { categoryId: string; task: Task } | null
}

export default function TaskModal({
  isOpen,
  onClose,
  defaultCategoryId,
  taskToEdit,
}: TaskModalProps) {
  const { data, addTask, updateTask } = useTaskContext()
  const { showToast } = useToast()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('daily')
  const [priority, setPriority] = useState<Priority>('medium')

  // Key the form off the edited task's ID, not the object identity.
  // `data.categories` gets a new array identity on every task mutation, so
  // depending on it re-ran this effect and wiped whatever the user was
  // typing whenever any task anywhere in the app was completed.
  const editingTaskId = taskToEdit?.task.id ?? null
  const firstCategoryId = data.categories[0]?.id ?? ''

  useEffect(() => {
    if (!isOpen) return
    if (taskToEdit) {
      setTitle(taskToEdit.task.title)
      setDescription(taskToEdit.task.description || '')
      setCategoryId(taskToEdit.categoryId)
      setFrequency(taskToEdit.task.frequency)
      setPriority(taskToEdit.task.priority)
    } else {
      setTitle('')
      setDescription('')
      setCategoryId(defaultCategoryId || firstCategoryId)
      setFrequency('daily')
      setPriority('medium')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingTaskId, defaultCategoryId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      showToast('Please enter a task title', 'error')
      return
    }

    if (taskToEdit) {
      updateTask(taskToEdit.categoryId, taskToEdit.task.id, {
        title: title.trim(),
        description: description.trim(),
        frequency,
        priority,
      })
      showToast('Task updated!', 'success')
    } else {
      if (!categoryId) {
        showToast('Please select a category', 'error')
        return
      }
      addTask(categoryId, {
        title: title.trim(),
        description: description.trim(),
        frequency,
        priority,
      })
      showToast('Task created!', 'success')
    }

    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <PixelEmoji name={taskToEdit ? 'gear' : 'target'} size={18} />
          <span>{taskToEdit ? 'EDIT TASK' : 'NEW TASK'}</span>
        </div>
      }
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="font-pixel text-caption px-3 py-2 border-2 border-ink/20 text-muted hover:text-ink hover:border-ink/40"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="font-pixel text-caption px-3 py-2 bg-accent border-2 border-accent-hot text-ink hover:brightness-110"
          >
            {taskToEdit ? 'SAVE CHANGES' : 'CREATE TASK'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="task-title" className="block font-pixel text-caption text-muted mb-1.5">
            TASK TITLE *
          </label>
          <input
            id="task-title"
            type="text"
            required
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Complete math exercises"
            className="w-full bg-app-deep border-2 border-line focus:border-accent p-2 text-ink font-pixel text-small outline-none"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="task-category" className="block font-pixel text-caption text-muted mb-1.5">
            CATEGORY
          </label>
          <select
            id="task-category"
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="w-full bg-app-deep border-2 border-line focus:border-accent p-2 text-ink font-pixel text-caption outline-none"
          >
            {data.categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Frequency & Priority Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="task-frequency" className="block font-pixel text-caption text-muted mb-1.5">
              FREQUENCY
            </label>
            <select
              id="task-frequency"
              value={frequency}
              onChange={e => setFrequency(e.target.value as Frequency)}
              className="w-full bg-app-deep border-2 border-line focus:border-accent p-2 text-ink font-pixel text-caption outline-none"
            >
              <option value="daily">Daily ☀️</option>
              <option value="weekly">Weekly 📅</option>
              <option value="once">Once 🎯</option>
            </select>
          </div>

          <div>
            <label htmlFor="task-priority" className="block font-pixel text-caption text-muted mb-1.5">
              PRIORITY
            </label>
            <select
              id="task-priority"
              value={priority}
              onChange={e => setPriority(e.target.value as Priority)}
              className="w-full bg-app-deep border-2 border-line focus:border-accent p-2 text-ink font-pixel text-caption outline-none"
            >
              <option value="low">Low (🟢)</option>
              <option value="medium">Medium (🟡)</option>
              <option value="high">High (🔴)</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="task-notes" className="block font-pixel text-caption text-muted mb-1.5">
            NOTES / DESCRIPTION (OPTIONAL)
          </label>
          <textarea
            id="task-notes"
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add extra context or checklist details..."
            className="w-full bg-app-deep border-2 border-line focus:border-accent p-2 text-ink font-pixel text-caption outline-none resize-none"
          />
        </div>
      </form>
    </Modal>
  )
}

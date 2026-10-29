import { useNavigate } from 'react-router-dom'
import type { Task, Frequency } from '../../types/tasks'
import { useTaskContext } from '../../context/TaskContext'
import { useDesignMode } from '../../context/DesignModeContext'
import { playComplete, playBeep } from '../../utils/audio'
import { fireCelebration } from '../../utils/confetti'
import { useToast } from '../ui/Toast'
import PixelEmoji, { type PixelEmojiName } from '../ui/PixelEmoji'

interface TaskItemProps {
  categoryId: string
  task: Task
  onEdit: (task: Task) => void
}

export default function TaskItem({ categoryId, task, onEdit }: TaskItemProps) {
  const { toggleTask, deleteTask, restoreTask, data } = useTaskContext()
  const { mode, animationsEnabled } = useDesignMode()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const handleToggle = () => {
    toggleTask(categoryId, task.id)
    if (!task.completed) {
      playComplete()
      fireCelebration(mode, animationsEnabled, {
        particleCount: 25,
        spread: 45,
        origin: { y: 0.8 },
      })
    } else {
      playBeep()
    }
  }

  const handleDelete = () => {
    // Remember where the task sat so UNDO can put it back in the same spot.
    const siblingTasks = data.categories.find(c => c.id === categoryId)?.tasks
    const index = siblingTasks ? siblingTasks.findIndex(t => t.id === task.id) : -1
    deleteTask(categoryId, task.id)
    showToast(`"${task.title}" deleted`, 'warn', {
      label: 'UNDO',
      onClick: () => restoreTask(categoryId, task, index >= 0 ? index : undefined),
    })
  }

  const handleFocus = () => {
    navigate('/pomodoro', { state: { task: { categoryId, task } } })
  }

  const priorityColors: Record<string, string> = {
    high: 'text-danger border-danger bg-danger/10',
    medium: 'text-warn border-warn bg-warn/10',
    low: 'text-success border-success bg-success/10',
  }

  const freqEmojis: Record<Frequency, PixelEmojiName> = {
    daily: 'sun',
    weekly: 'calendar',
    once: 'target',
  }

  return (
    <div
      className={`group flex items-start gap-2.5 p-2.5 bg-app-deep/80 border-2 transition-all ${
        task.completed
          ? 'border-line opacity-60 bg-app-deep'
          : 'border-line hover:border-accent/60 hover:bg-surface'
      }`}
    >
      {/* Pixel Checkbox */}
      <button
        onClick={handleToggle}
        className="w-8 h-8 -m-1.5 mt-0.5 shrink-0 flex items-center justify-center transition-colors"
        title={task.completed ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
        aria-label={task.completed ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
      >
        <span
          className={`w-5 h-5 border-2 flex items-center justify-center ${
            task.completed
              ? 'bg-success border-success text-on-accent-2 font-bold'
              : 'border-accent-2 bg-app-deep hover:border-success'
          }`}
        >
          {task.completed && <span className="font-pixel text-small">✓</span>}
        </span>
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-pixel text-small leading-relaxed break-words ${
              task.completed ? 'line-through text-dim' : 'text-ink'
            }`}
          >
            {task.title}
          </span>

          {/* Priority Badge */}
          <span
            className={`font-pixel text-micro px-1.5 py-0.5 border flex items-center gap-1 ${
              priorityColors[task.priority] || priorityColors.medium
            }`}
          >
            <PixelEmoji
              name={task.priority === 'high' ? 'skull' : task.priority === 'medium' ? 'warning' : 'gem'}
              size={10}
            />
            <span>{task.priority?.toUpperCase()}</span>
          </span>

          {/* Frequency Badge */}
          <span className="font-pixel text-micro px-1.5 py-0.5 border border-ink/20 text-muted bg-ink/5 flex items-center gap-1">
            <PixelEmoji name={freqEmojis[task.frequency] || 'target'} size={10} />
            <span className="capitalize">{task.frequency}</span>
          </span>

          {/* Streak Badge */}
          {task.streak > 0 && (
            <span className="font-pixel text-micro px-1.5 py-0.5 border border-danger/40 text-danger bg-danger/10 flex items-center gap-1">
              <PixelEmoji name="flame" size={10} />
              <span>{task.streak}d</span>
            </span>
          )}

          {/* Pomodoro Badge */}
          {task.pomodorosSpent > 0 && (
            <span className="font-pixel text-micro px-1.5 py-0.5 border border-purple/40 text-purple bg-purple/10 flex items-center gap-1">
              <PixelEmoji name="tomato" size={10} />
              <span>{task.pomodorosSpent}</span>
            </span>
          )}
        </div>

        {task.description && (
          <p className="font-pixel text-label text-muted mt-1 break-words">
            {task.description}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
        {/* Focus Button */}
        <button
          onClick={handleFocus}
          title="Focus on this task in Pomodoro" aria-label="Focus on this task in Pomodoro"
          className="p-1 hover:bg-accent/20 border border-transparent hover:border-accent flex items-center justify-center transition-colors"
        >
          <PixelEmoji name="tomato" size={14} />
        </button>

        {/* Edit Button */}
        <button
          onClick={() => onEdit(task)}
          title="Edit Task" aria-label="Edit Task"
          className="font-pixel text-caption p-1 text-accent-2 hover:bg-accent-2/20 border border-transparent hover:border-accent-2"
        >
          ✎
        </button>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          title="Delete Task" aria-label="Delete Task"
          className="font-pixel text-caption p-1 text-danger hover:bg-danger/20 border border-transparent hover:border-danger"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

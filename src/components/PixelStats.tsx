import PixelEmoji from './ui/PixelEmoji'
import type { Task } from '../types/tasks'

interface PixelStatsProps {
  sessionsCompleted: number
  totalSessions: number
  activeTask?: { categoryId: string; task: Task } | null
}

export default function PixelStats({
  sessionsCompleted,
  totalSessions,
  activeTask,
}: PixelStatsProps) {
  const currentCycle = sessionsCompleted % 4

  return (
    <div className="bg-surface border-4 border-line px-4 py-3 pixel-border flex flex-wrap items-center justify-between gap-3">
      {/* Current cycle progress (4 dots before long break) */}
      <div className="flex items-center gap-2">
        <span className="font-pixel text-caption text-muted">INTERVAL:</span>
        <div className="flex gap-1.5 items-center">
          {[...Array(4)].map((_, i) => (
            <span
              key={i}
              className={`w-3.5 h-3.5 border-2 transition-all ${
                i < currentCycle
                  ? 'bg-accent border-accent-hot shadow-xs'
                  : i === currentCycle
                  ? 'border-accent bg-accent/20 animate-pulse'
                  : 'border-line bg-app-deep'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Total sessions count */}
      <div className="flex items-center gap-2 font-pixel">
        <span className="text-caption text-muted">TOTAL SESSIONS:</span>
        <span className="text-lead text-accent-hot font-bold">
          {totalSessions}
        </span>
        <PixelEmoji name="tomato" size={14} />
      </div>

      {/* Active task pomodoros if available */}
      {activeTask && (
        <div className="flex items-center gap-1.5 font-pixel text-caption text-accent-2">
          <span>TASK FOCUS:</span>
          <span className="font-bold">{activeTask.task.pomodorosSpent || 0}</span>
          <PixelEmoji name="flame" size={12} />
        </div>
      )}
    </div>
  )
}

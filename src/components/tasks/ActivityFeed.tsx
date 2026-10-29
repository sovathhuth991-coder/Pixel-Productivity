import { useTaskContext } from '../../context/TaskContext'
import PixelEmoji from '../ui/PixelEmoji'

export default function ActivityFeed() {
  const { activity } = useTaskContext()

  const getEmoji = (type: string) => {
    switch (type) {
      case 'completed':
        return <PixelEmoji name="check_shield" size={12} />
      case 'added':
        return <PixelEmoji name="target" size={12} />
      case 'deleted':
        return <PixelEmoji name="warning" size={12} />
      default:
        return <PixelEmoji name="book" size={12} />
    }
  }

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div className="bg-surface pixel-frame p-3 pixel-border">
      <h3 className="font-pixel text-small text-accent-2 mb-3 flex items-center gap-2">
        <PixelEmoji name="book" size={16} />
        <span>RECENT ACTIVITY LOG</span>
      </h3>

      {activity.length === 0 ? (
        <div className="text-center py-4 font-pixel text-label text-dim">
          NO ACTIVITY LOGGED YET
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {activity.slice(0, 15).map((item, idx) => (
            <div
              key={`${item.time}-${idx}`}
              className="flex items-center justify-between text-label font-pixel p-1.5 bg-app-deep/60 border border-ink/5"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <span className="shrink-0">{getEmoji(item.type)}</span>
                <span className="text-muted truncate">{item.text}</span>
              </div>
              <span className="text-dim shrink-0">{formatTime(item.time)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

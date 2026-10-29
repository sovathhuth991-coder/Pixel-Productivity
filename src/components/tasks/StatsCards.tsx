import { useTaskContext } from '../../context/TaskContext'
import PixelEmoji, { type PixelEmojiName } from '../ui/PixelEmoji'

export default function StatsCards() {
  const { getStats, streak } = useTaskContext()
  const stats = getStats()

  // One primary metric (PROGRESS, in the accent), the colours that carry
  // meaning (success = done, warn = waiting), and a neutral card for the
  // plain count. STREAK used to wear --danger — the same red the app uses
  // for destructive actions — for a positive metric.
  const cards: {
    label: string
    value: string | number
    sub?: string
    emoji: PixelEmojiName
    color: string
    bg: string
  }[] = [
    {
      label: 'TOTAL',
      value: stats.total,
      emoji: 'gem',
      color: 'border-line text-ink',
      bg: 'bg-app-deep/50',
    },
    {
      label: 'COMPLETED',
      value: stats.completed,
      emoji: 'trophy',
      color: 'border-success text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'PENDING',
      value: stats.pending,
      emoji: 'hourglass',
      color: 'border-warn text-warn',
      bg: 'bg-warn/10',
    },
    {
      label: 'PROGRESS',
      value: `${stats.progress}%`,
      emoji: 'target',
      color: 'border-accent text-accent',
      bg: 'bg-accent/10',
    },
    {
      label: 'STREAK',
      value: `${streak.current}d`,
      sub: `BEST: ${streak.best}d`,
      emoji: 'flame',
      color: 'border-accent-2 text-accent-2',
      bg: 'bg-accent-2/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(card => (
        <div
          key={card.label}
          className={`border-4 ${card.color} ${card.bg} p-3 pixel-border flex flex-col justify-between group hover:scale-[1.02] transition-transform`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-pixel text-caption text-muted">{card.label}</span>
            <PixelEmoji name={card.emoji} size={20} />
          </div>
          <div>
            <div className="font-pixel text-base md:text-lg text-ink font-bold">
              {card.value}
            </div>
            {card.sub && (
              <div className="font-pixel text-label text-muted mt-0.5">
                {card.sub}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

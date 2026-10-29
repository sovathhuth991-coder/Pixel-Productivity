import { useTaskContext } from '../../context/TaskContext'
import PixelEmoji from '../ui/PixelEmoji'
import { dateKey } from '../../utils/weekly-report'

export default function HeatmapGrid() {
  const { completionHistory } = useTaskContext()

  // Generate last 28 days (4 weeks)
  const days: { dateStr: string; count: number; dayName: string }[] = []
  const today = new Date()

  for (let i = 27; i >= 0; i--) {
    const d = new Date()
    d.setDate(today.getDate() - i)
    // Local date, matching the keys the completion history is written with.
    const dateStr = dateKey(d)
    const count = completionHistory[dateStr] || 0
    const dayName = d.toLocaleDateString('en-US', { weekday: 'narrow' })
    days.push({ dateStr, count, dayName })
  }

  const getColor = (count: number) => {
    if (count === 0) return 'bg-app-deep border-line'
    if (count <= 2) return 'bg-[#0e4429] border-[#006d32]'
    if (count <= 4) return 'bg-[#006d32] border-[#26a641]'
    return 'bg-success border-accent-2-hot'
  }

  return (
    <div className="bg-surface pixel-frame p-3 pixel-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-pixel text-small text-accent-2 flex items-center gap-2">
          <PixelEmoji name="calendar" size={16} />
          <span>CONSISTENCY HEATMAP (28 DAYS)</span>
        </h3>
        <span className="font-pixel text-label text-muted">
          DAILY COMPLETIONS
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => (
          <div
            key={day.dateStr}
            title={`${day.dateStr}: ${day.count} completed`}
            className={`h-7 border-2 ${getColor(day.count)} flex flex-col items-center justify-center transition-transform hover:scale-110 cursor-pointer`}
          >
            <span className="font-pixel text-micro text-ink/50">
              {day.dayName}
            </span>
            {day.count > 0 && (
              <span className="font-pixel text-label text-ink font-bold">
                {day.count}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-1.5 mt-2.5 font-pixel text-micro text-dim">
        <span>LESS</span>
        <span className="w-2.5 h-2.5 bg-app-deep border border-line" />
        <span className="w-2.5 h-2.5 bg-[#0e4429] border border-[#006d32]" />
        <span className="w-2.5 h-2.5 bg-[#006d32] border border-[#26a641]" />
        <span className="w-2.5 h-2.5 bg-success border border-accent-2-hot" />
        <span>MORE</span>
      </div>
    </div>
  )
}

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts'
import { useTaskContext } from '../../context/TaskContext'
import { useDesignMode } from '../../context/DesignModeContext'
import { dateKey } from '../../utils/weekly-report'
import PixelIcon from '../ui/PixelIcon'
import PixelEmoji, { type PixelEmojiName } from '../ui/PixelEmoji'

interface DayData {
  dateStr: string
  dayName: string
  shortDate: string
  completed: number
  isToday: boolean
}

export default function WeeklyCompletionChart() {
  const { completionHistory, data, streak } = useTaskContext()
  // Recharts animates every bar in from zero height. The "stop animations"
  // toggle used to leave that running, and on a slow phone the bars were
  // still growing when the user looked at them. Honour the setting.
  const { animationsEnabled } = useDesignMode()

  // Generate data for the past 7 days (including today)
  const chartData: DayData[] = useMemo(() => {
    const result: DayData[] = []
    const now = new Date()

    // Also look at completedAt across all current tasks to supplement history if available
    const taskCompletedDates: Record<string, number> = {}
    data.categories.forEach(cat => {
      cat.tasks.forEach(task => {
        if (task.completed && task.completedAt) {
          // Local day, matching the rest of the completion history.
          const dStr = dateKey(new Date(task.completedAt))
          taskCompletedDates[dStr] = (taskCompletedDates[dStr] || 0) + 1
        }
      })
    })

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(now.getDate() - i)
      const dateStr = dateKey(d)

      // Count from completionHistory, with fallback to current task completedAt counts
      const historyCount = completionHistory[dateStr] || 0
      const currentTaskCount = taskCompletedDates[dateStr] || 0
      const count = Math.max(historyCount, currentTaskCount)

      const isToday = i === 0
      const dayName = isToday
        ? 'TODAY'
        : d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
      const shortDate = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })

      result.push({
        dateStr,
        dayName,
        shortDate,
        completed: count,
        isToday,
      })
    }
    return result
  }, [completionHistory, data])

  // Calculate weekly stats
  const totalCompleted7Days = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.completed, 0)
  }, [chartData])

  const bestDay = useMemo(() => {
    return chartData.reduce((max, curr) => (curr.completed > max.completed ? curr : max), chartData[0])
  }, [chartData])

  const averagePerDay = (totalCompleted7Days / 7).toFixed(1)

  // Motivational badge text
  const motivationalMessage = useMemo(() => {
    if (totalCompleted7Days >= 20) {
      return '⚡ LEGENDARY VELOCITY! You are dominating your goals!'
    }
    if (totalCompleted7Days >= 10) {
      return '🔥 UNSTOPPABLE STREAK! Remarkable focus this week!'
    }
    if (totalCompleted7Days >= 5) {
      return '🚀 GREAT MOMENTUM! Keep stacking daily wins!'
    }
    if (totalCompleted7Days > 0) {
      return '🌟 STRONG START! Every completed task builds consistency!'
    }
    return '🎯 READY FOR ACTION! Complete your first task to light up the board!'
  }, [totalCompleted7Days])

  return (
    <div className="bg-surface pixel-frame p-4 pixel-border space-y-4">
      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-line/60 pb-3">
        <div>
          <h2 className="font-pixel text-body md:text-lead text-accent flex items-center gap-2">
            <PixelIcon name="chart" size={16} className="text-accent" />
            <span>7-DAY COMPLETION VELOCITY</span>
          </h2>
          <p className="font-pixel text-label text-muted mt-1">
            DAILY COMPLETED TASKS OVER THE PAST 7 DAYS
          </p>
        </div>

        {/* Quick KPI badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-app-deep border border-line px-2.5 py-1.5 flex items-center gap-1.5 font-pixel text-label">
            <span className="text-muted">7-DAY TOTAL:</span>
            <span className="text-success font-bold text-caption">{totalCompleted7Days}</span>
            <PixelEmoji name="trophy" size={14} />
          </div>

          <div className="bg-app-deep border border-line px-2.5 py-1.5 flex items-center gap-1.5 font-pixel text-label">
            <span className="text-muted">AVG / DAY:</span>
            <span className="text-accent-2 font-bold text-caption">{averagePerDay}</span>
            <PixelEmoji name="gem" size={13} />
          </div>

          {streak.current > 0 && (
            <div className="bg-app-deep border border-line px-2.5 py-1.5 flex items-center gap-1.5 font-pixel text-label">
              <PixelEmoji name="flame" size={14} />
              <span className="text-warn">{streak.current}D STREAK</span>
            </div>
          )}
        </div>
      </div>

      {/* Motivational Banner */}
      <div className="bg-app-deep/70 border-2 border-line p-2.5 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <PixelEmoji
            name={
              totalCompleted7Days >= 20
                ? 'lightning'
                : totalCompleted7Days >= 10
                ? 'flame'
                : totalCompleted7Days >= 5
                ? 'rocket'
                : totalCompleted7Days > 0
                ? 'star'
                : 'target'
            }
            size={18}
          />
          <span className="font-pixel text-caption text-ink leading-relaxed">
            {motivationalMessage}
          </span>
        </div>
        {bestDay && bestDay.completed > 0 && (
          <div className="font-pixel text-label text-accent-2 flex items-center gap-1">
            <PixelEmoji name="star" size={12} />
            <span>PEAK: {bestDay.dayName} ({bestDay.completed} {bestDay.completed === 1 ? 'task' : 'tasks'})</span>
          </div>
        )}
      </div>

      {/* Recharts Bar Chart */}
      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="2 2"
              vertical={false}
              stroke="color-mix(in srgb, var(--ink) 12%, transparent)"
            />
            <XAxis
              dataKey="dayName"
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.15)' }}
              tick={({ x, y, payload }) => {
                const isToday = payload.value === 'TODAY'
                return (
                  <text
                    x={x}
                    y={y + 12}
                    textAnchor="middle"
                    fill={isToday ? 'var(--accent)' : 'var(--muted)'}
                    fontSize={10}
                    fontFamily="'Press Start 2P', monospace"
                    fontWeight={isToday ? 'bold' : 'normal'}
                  >
                    {payload.value}
                  </text>
                )
              }}
            />
            <YAxis
              allowDecimals={false}
              axisLine={{ stroke: 'color-mix(in srgb, var(--ink) 20%, transparent)' }}
              tickLine={false}
              tick={{
                fill: 'var(--muted)',
                fontSize: 11,
                fontFamily: "'Press Start 2P', monospace",
              }}
            />
            <Tooltip
              cursor={{ fill: 'color-mix(in srgb, var(--ink) 6%, transparent)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as DayData
                  return (
                    <div className="bg-app-deep border-2 border-line p-2 pixel-border font-pixel text-caption space-y-1 shadow-lg">
                      <div className="text-accent font-bold">
                        {item.dayName} ({item.shortDate})
                      </div>
                      <div className="text-ink flex items-center gap-1.5">
                        <span className="text-success font-bold">{item.completed}</span>
                        <span>{item.completed === 1 ? 'task completed' : 'tasks completed'}</span>
                      </div>
                      {item.isToday && (
                        <div className="text-label text-accent-2 mt-0.5">
                          ⭐ ACTIVE DAY
                        </div>
                      )}
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="completed" radius={[2, 2, 0, 0]} isAnimationActive={animationsEnabled} animationDuration={600}>
              {chartData.map((entry) => {
                // Two series only, matching the legend exactly:
                // today = accent, every other day = accent-2.
                let fillColor = 'var(--accent-2)'
                if (entry.isToday) {
                  fillColor = 'var(--accent)'
                } else if (entry.completed === 0) {
                  fillColor = 'color-mix(in srgb, var(--ink) 12%, transparent)'
                }

                return (
                  <Cell
                    key={`cell-${entry.dateStr}`}
                    fill={fillColor}
                    stroke={entry.isToday ? 'var(--accent-hot)' : 'transparent'}
                    strokeWidth={entry.isToday ? 2 : 0}
                  />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend & Insights Footer */}
      <div className="flex items-center justify-between border-t border-line/60 pt-2 font-pixel text-label text-muted flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-accent border border-accent-hot inline-block" />
            <span className="text-ink">TODAY</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-accent-2 inline-block" />
            <span>PAST DAYS</span>
          </div>
        </div>

        <div className="text-dim">
          UPDATES LIVE AS TASKS ARE COMPLETED ✓
        </div>
      </div>
    </div>
  )
}

import { useMemo, type CSSProperties, type ReactNode } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useTaskContext } from '../context/TaskContext'
import { useDesignMode } from '../context/DesignModeContext'
import PixelEmoji from '../components/ui/PixelEmoji'
import type { PixelEmojiName } from '../components/ui/PixelEmoji'
import { dateKey, readPomodoroHistory } from '../utils/weekly-report'
import type { Category, Task } from '../types/tasks'

// ─── Date helpers (Sunday-start weeks, matching weekly-report.ts) ────────
function lastNDays(n: number): Date[] {
  const days: Date[] = []
  const end = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    days.push(d)
  }
  return days
}

function weekSundays(n: number): Date[] {
  const today = new Date()
  const sun = new Date(today)
  sun.setHours(0, 0, 0, 0)
  sun.setDate(sun.getDate() - sun.getDay()) // back to this Sunday
  const out: Date[] = []
  for (let i = n - 1; i >= 0; i--) {
    const s = new Date(sun)
    s.setDate(s.getDate() - i * 7)
    out.push(s)
  }
  return out
}

// Chart palette — every value is contrast-checked against the card surface
// it is drawn on, in each skin. (Pixel Center is the default skin.)
interface ChartPalette {
  teal: string
  coral: string
  amber: string
  purple: string
  green: string
  gray: string
  mute: string
  surface: string
  ink: string
  line: string
}

const COMMANDER_PALETTE: ChartPalette = {
  teal: '#4ecdc4',
  coral: '#e94560',
  amber: '#f59e0b',
  purple: '#6c63ff',
  green: '#22c55e',
  gray: '#475467',
  mute: '#94a3b8',
  surface: '#16213e',
  ink: '#ffffff',
  line: '#0f3460',
}

const PIXEL_CENTER_PALETTE: ChartPalette = {
  teal: '#166b56',
  coral: '#b53823',
  amber: '#9a5b06',
  purple: '#7c3aed',
  green: '#1f7a3d',
  gray: '#5d5670',
  mute: '#6b6478',
  surface: '#ffffff',
  ink: '#1a1625',
  line: '#231f32',
}

const CHART_FONT = "'VT323', monospace"

function useChartPalette(): ChartPalette {
  const { mode } = useDesignMode()
  return mode === 'pixel-center' ? PIXEL_CENTER_PALETTE : COMMANDER_PALETTE
}

/**
 * Recharts animates every bar and pie slice in from nothing. The "stop
 * animations" toggle used to leave that running — so a user who asked for
 * reduced motion still got a chart that grew in front of them, and on a
 * slow phone the bars were still at zero height when the user looked.
 */
function useChartAnimation(): boolean {
  const { animationsEnabled } = useDesignMode()
  return animationsEnabled
}

function tooltipStyle(p: ChartPalette): CSSProperties {
  return {
    backgroundColor: p.surface,
    border: `1px solid ${p.line}`,
    color: p.ink,
    fontFamily: CHART_FONT,
  }
}

interface CardProps {
  title: string
  icon?: PixelEmojiName
  children: ReactNode
}

function Card({ title, icon, children }: CardProps) {
  return (
    <div className="bg-surface pixel-frame p-4 pixel-border space-y-3">
      <div className="flex items-center gap-2">
        {icon ? <PixelEmoji name={icon} size={16} /> : null}
        <h2 className="font-pixel text-body text-accent">{title}</h2>
      </div>
      {children}
    </div>
  )
}

interface StatProps {
  title: string
  value: string | number
  sub?: string
}

function StatCard({ title, value, sub }: StatProps) {
  return (
    <div className="bg-surface border-4 border-line p-4 pixel-border text-center space-y-1">
      <div className="font-pixel text-caption text-muted">{title}</div>
      <div className="font-pixel text-2xl text-accent-2">{value}</div>
      {sub ? <div className="font-pixel text-label text-dim">{sub}</div> : null}
    </div>
  )
}

export default function StatsPage() {
  const { data, streak, completionHistory } = useTaskContext()
  const P = useChartPalette()
  const chartAnimates = useChartAnimation()

  // Daily series (last 30 days)
  const dailySeries = useMemo(() => {
    const days = lastNDays(30)
    const pomo = readPomodoroHistory()
    return days.map(d => {
      const k = dateKey(d)
      return {
        // The axis label is deliberately short: on a 375px phone the full
        // "Wed, Sep 23" overlapped its neighbour. The full date is kept for
        // the tooltip.
        day: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        dayFull: d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
        completed: completionHistory[k] || 0,
        pomodoros: pomo[k] || 0,
      }
    })
  }, [completionHistory])

  // Count of daily-frequency tasks (used for weekly completion %)
  const dailyTaskCount = useMemo(
    () =>
      data.categories.reduce(
        (acc: number, c: Category) =>
          acc + c.tasks.filter((t: Task) => t.frequency === 'daily').length,
        0,
      ),
    [data.categories],
  )

  // Weekly trend (last 6 Sunday-start weeks)
  const weeklySeries = useMemo(() => {
    const sunds = weekSundays(6)
    return sunds.map(s => {
      let comps = 0
      for (let i = 0; i < 7; i++) {
        const d = new Date(s)
        d.setDate(s.getDate() + i)
        comps += completionHistory[dateKey(d)] || 0
      }
      const target = Math.max(1, dailyTaskCount) * 7
      const pct = target ? Math.min(100, Math.round((comps / target) * 100)) : 0
      return {
        week: s.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        completions: comps,
        pct,
      }
    })
  }, [completionHistory, dailyTaskCount])

  // Category breakdown
  const categorySeries = useMemo(
    () =>
      data.categories.map((c: Category) => ({
        name: c.name,
        completed: c.tasks.filter((t: Task) => t.completed).length,
        total: c.tasks.length,
      })),
    [data.categories],
  )

  const completedTotal = categorySeries.reduce((a, c) => a + c.completed, 0)
  const totalTotal = categorySeries.reduce((a, c) => a + c.total, 0)
  const overallPct = totalTotal ? Math.round((completedTotal / totalTotal) * 100) : 0

  const todayKey = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return dateKey(d)
  }, [])
  const todayCompleted = completionHistory[todayKey] || 0
  const todayPomo = useMemo(() => readPomodoroHistory()[todayKey] || 0, [todayKey])

  const pieData = [
    { name: 'Completed', value: completedTotal },
    { name: 'Pending', value: Math.max(0, totalTotal - completedTotal) },
  ]

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="border-b-4 border-line pb-3">
        <h1 className="font-pixel text-xl text-accent pixel-shadow flex items-center gap-2.5">
          <PixelEmoji name="gem" size={26} />
          <span>STATISTICS</span>
        </h1>
        <p className="font-pixel text-caption text-muted mt-1.5">
          PRODUCTIVITY TRENDS · DAILY ACTIVITY · WEEKLY PROGRESS · CATEGORY BREAKDOWN
        </p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="CURRENT STREAK" value={streak.current} sub={`best ${streak.best}`} />
        <StatCard title="TODAY COMPLETED" value={todayCompleted} />
        <StatCard title="TODAY POMODOROS" value={todayPomo} />
        <StatCard title="OVERALL" value={`${overallPct}%`} sub={`${completedTotal}/${totalTotal} tasks`} />
      </div>

      {/* Daily activity: completions + pomodoros (30 days) */}
      <Card title="DAILY ACTIVITY (30D)" icon="tomato">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dailySeries} barGap={2} barSize={12}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: P.mute, fontSize: 11, fontFamily: CHART_FONT }}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: P.mute, fontSize: 11, fontFamily: CHART_FONT }} />
            <Tooltip
              contentStyle={tooltipStyle(P)}
              itemStyle={{ color: P.ink, fontFamily: CHART_FONT }}
              labelFormatter={(label, payload) =>
                (payload && payload[0] && payload[0].payload && payload[0].payload.dayFull) || label
              }
            />
            <Legend wrapperStyle={{ color: P.mute, fontSize: 12, fontFamily: CHART_FONT }} />
            <Bar dataKey="completed" name="tasks done" fill={P.teal} radius={[3, 3, 0, 0]} isAnimationActive={chartAnimates} animationDuration={600} />
            <Bar dataKey="pomodoros" name="pomodoros" fill={P.coral} radius={[3, 3, 0, 0]} isAnimationActive={chartAnimates} animationDuration={600} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Weekly completion % trend */}
      <Card title="WEEKLY COMPLETION % (6 WEEKS)" icon="flame">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklySeries} barSize={14}>
            <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: P.mute, fontSize: 11, fontFamily: CHART_FONT }} />
            <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: P.mute, fontSize: 11, fontFamily: CHART_FONT }} />
            <Tooltip
              contentStyle={tooltipStyle(P)}
              formatter={(v: number) => [`${v}%`, 'completion %']}
            />
            <Bar dataKey="pct" name="completion %" fill={P.coral} radius={[3, 3, 0, 0]} isAnimationActive={chartAnimates} animationDuration={600} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Category breakdown */}
      <Card title="CATEGORY BREAKDOWN" icon="check_shield">
        <div className="space-y-3">
          {categorySeries.map((c, i) => {
            const pct = c.total ? Math.round((c.completed / c.total) * 100) : 0
            const hues = [P.teal, P.coral, P.purple, P.green, P.amber]
            const hue = hues[i % hues.length]
            return (
              <div key={c.name} className="space-y-1">
                <div className="flex justify-between font-pixel text-caption">
                  <span className="text-ink">{c.name}</span>
                  <span className="text-muted">{pct}% ({c.completed}/{c.total})</span>
                </div>
                <div className="h-4 bg-app-deep border-2 border-line pixel-border overflow-hidden">
                  <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: hue }} />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-2 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip contentStyle={tooltipStyle(P)} />
              <Legend wrapperStyle={{ color: P.mute, fontSize: 12, fontFamily: CHART_FONT }} />
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={44} outerRadius={72} paddingAngle={2} isAnimationActive={chartAnimates} animationDuration={600}>
                {pieData.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={i === 0 ? P.green : P.gray} stroke={P.surface} strokeWidth={2} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

import { useMemo, useState } from 'react'
import type { HeatmapDay } from '../lib/api'

interface Props {
  days: HeatmapDay[]
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_LABELS  = ['', 'Mon', '', 'Wed', '', 'Fri', '']

// 0 = no activity, 1 = low, 2 = medium, 3 = high
const LEVEL_COLORS = ['#1a2a1d', '#064e3b', '#047857', '#10b981']

function intensity(day: HeatmapDay | undefined): number {
  if (!day) return 0
  return (day.has_pr ? 1 : 0) + (day.has_commit ? 1 : 0) + (day.has_review ? 1 : 0)
}

function buildTooltipText(date: Date, day: HeatmapDay | undefined): string {
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (!day || (!day.has_pr && !day.has_commit && !day.has_review)) return `No activity · ${dateStr}`
  const parts: string[] = []
  if (day.has_pr) parts.push('Merged PR')
  if (day.has_commit) parts.push('Committed')
  if (day.has_review) parts.push('Reviewed')
  return `${dateStr} · ${parts.join(', ')}`
}

export function ContributionHeatmap({ days }: Props) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  const { weeks, monthLabels, dayMap, totalActive } = useMemo(() => {
    const dayMap = new Map<string, HeatmapDay>()
    let totalActive = 0
    for (const d of days) {
      const key = d.day.slice(0, 10)
      dayMap.set(key, d)
      if (d.has_pr || d.has_commit || d.has_review) totalActive++
    }

    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

    // Rewind to the Sunday that starts the current week
    const currentWeekSun = new Date(today)
    currentWeekSun.setUTCDate(today.getUTCDate() - today.getUTCDay())

    // Start 52 weeks before that Sunday
    const startDate = new Date(currentWeekSun)
    startDate.setUTCDate(currentWeekSun.getUTCDate() - 52 * 7)

    const weeks: { date: Date; key: string; future: boolean }[][] = []
    const monthLabels: { col: number; label: string }[] = []
    let lastMonth = -1
    const cursor = new Date(startDate)

    for (let w = 0; w < 53; w++) {
      const week: { date: Date; key: string; future: boolean }[] = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(cursor)
        week.push({ date, key: cursor.toISOString().slice(0, 10), future: date > today })
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      }
      weeks.push(week)

      const m = week[0].date.getUTCMonth()
      if (m !== lastMonth) {
        monthLabels.push({ col: w, label: MONTH_NAMES[m] })
        lastMonth = m
      }
    }

    return { weeks, monthLabels, dayMap, totalActive }
  }, [days])

  const CELL = 11
  const GAP  = 2
  const LABEL_W = 28
  const LABEL_H = 16

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-white font-bold text-xs uppercase tracking-widest">Contribution Activity</p>
        <span className="text-white/30 text-xs">{totalActive} active {totalActive === 1 ? 'day' : 'days'} in the last year</span>
      </div>

      {/* Grid — horizontally scrollable on narrow screens */}
      <div className="overflow-x-auto pb-1" style={{ position: 'relative' }}>
        {/* Fixed-positioned tooltip renders above viewport scroll */}
        {tooltip && (
          <div
            style={{
              position: 'fixed',
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, -100%)',
              zIndex: 9999,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                background: '#0c1a0f',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: 10,
                padding: '3px 8px',
                borderRadius: 6,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              {tooltip.text}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: GAP, minWidth: 'max-content' }}>
          {/* Day-of-week label column */}
          <div style={{ width: LABEL_W, flexShrink: 0, paddingTop: LABEL_H + GAP }}>
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                style={{
                  height: CELL,
                  marginBottom: i < 6 ? GAP : 0,
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.22)',
                  lineHeight: `${CELL}px`,
                  textAlign: 'right',
                  paddingRight: 6,
                  fontFamily: 'monospace',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Week columns */}
          {weeks.map((week, wi) => {
            const monthLabel = monthLabels.find((m) => m.col === wi)
            return (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                {/* Month label row */}
                <div
                  style={{
                    height: LABEL_H,
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.28)',
                    lineHeight: `${LABEL_H}px`,
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                  }}
                >
                  {monthLabel?.label ?? ''}
                </div>

                {/* Day cells */}
                {week.map(({ date, key, future }) => {
                  const dayData = dayMap.get(key)
                  const level = future ? -1 : intensity(dayData)
                  return (
                    <div
                      key={key}
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRadius: 2,
                        backgroundColor: future ? 'transparent' : LEVEL_COLORS[level],
                        cursor: future ? 'default' : 'crosshair',
                        flexShrink: 0,
                      }}
                      onMouseEnter={future ? undefined : (e) => {
                        setTooltip({
                          text: buildTooltipText(date, dayData),
                          x: e.clientX,
                          y: e.clientY - 6,
                        })
                      }}
                      onMouseLeave={future ? undefined : () => setTooltip(null)}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>Less</span>
        {LEVEL_COLORS.map((color, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
        ))}
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>More</span>
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import type { MonthlyCount } from '../lib/api'

interface Props {
  months: MonthlyCount[]
}

export function VelocityChart({ months }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const { max, total } = useMemo(() => {
    const max = Math.max(...months.map((m) => m.count), 1)
    const total = months.reduce((s, m) => s + m.count, 0)
    return { max, total }
  }, [months])

  if (!months.length) return null

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <p className="text-white font-bold text-xs uppercase tracking-widest">PR Velocity</p>
        <span className="text-white/30 text-xs">{total} PRs in the last 13 months</span>
      </div>

      {/* Bar chart — scrollable on mobile */}
      <div className="overflow-x-auto pb-1">
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 6,
            minWidth: 'max-content',
            height: 96,
          }}
        >
          {months.map((m, i) => {
            const pct = max > 0 ? (m.count / max) * 100 : 0
            const isHovered = hovered === i
            return (
              <div
                key={i}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 32 }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Count label */}
                <span
                  style={{
                    fontSize: 9,
                    color: isHovered ? 'rgba(52,211,153,0.9)' : 'rgba(255,255,255,0)',
                    fontFamily: 'monospace',
                    transition: 'color 0.15s',
                    minHeight: 12,
                  }}
                >
                  {m.count > 0 ? m.count : ''}
                </span>

                {/* Bar */}
                <div
                  style={{
                    width: 32,
                    height: 72,
                    display: 'flex',
                    alignItems: 'flex-end',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    cursor: 'default',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${pct}%`,
                      background: isHovered
                        ? 'linear-gradient(to top, #34d399, #06b6d4)'
                        : 'linear-gradient(to top, #10b981, #059669)',
                      borderRadius: 4,
                      transition: 'height 0.4s ease, background 0.15s',
                    }}
                  />
                </div>

                {/* Month label */}
                <span
                  style={{
                    fontSize: 9,
                    color: isHovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.15s',
                  }}
                >
                  {m.month}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

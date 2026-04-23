import { useState } from 'react'
import { toPng } from 'html-to-image'
import { getBadge, getNextBadge, BADGE_TIERS } from '../lib/badges'

interface BadgeCardProps {
  score: number
  login: string
  compact?: boolean
}

export function BadgeCard({ score, login, compact = false }: BadgeCardProps) {
  const [downloading, setDownloading] = useState(false)
  const badge = getBadge(score)
  const next = getNextBadge(score)
  const pct = Math.min((score / 1000) * 100, 100)
  const id = `badge-card-${login}`

  async function handleDownload() {
    setDownloading(true)
    try {
      const node = document.getElementById(id)
      if (!node) return
      const url = await toPng(node, { pixelRatio: 3, backgroundColor: badge.colors.bg })
      const a = document.createElement('a')
      a.download = `gitpulse-badge-${login}.png`
      a.href = url
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  if (compact) {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl border p-3"
        style={{
          background: badge.colors.gradient,
          borderColor: badge.colors.accent + '30',
          boxShadow: `0 0 20px ${badge.colors.glow}`,
        }}
      >
        <span className="text-3xl leading-none">{badge.emoji}</span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: badge.colors.accent }}>
            {badge.name}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: badge.colors.text + 'aa' }}>{badge.tagline}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Card */}
      <div
        id={id}
        className="relative rounded-3xl overflow-hidden mx-auto"
        style={{ maxWidth: 320, background: badge.colors.bg }}
      >
        {/* Glow blobs */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 blur-[60px] pointer-events-none"
          style={{ background: badge.colors.glow }}
        />
        <div
          className="absolute bottom-0 right-0 w-32 h-32 blur-[60px] pointer-events-none opacity-50"
          style={{ background: badge.colors.glow }}
        />

        <div
          className="relative border rounded-3xl p-6 text-center"
          style={{
            background: badge.colors.gradient,
            borderColor: badge.colors.accent + '28',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center text-black text-[9px] font-black"
                style={{ background: badge.colors.accent }}>G</div>
              <span className="text-[10px] font-bold text-white/40 tracking-wider">GitPulse</span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.25em] font-semibold" style={{ color: badge.colors.accent + '80' }}>
              Achievement
            </span>
          </div>

          {/* Emoji + divider */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 border"
            style={{
              background: badge.colors.glow,
              borderColor: badge.colors.accent + '30',
              boxShadow: `0 0 30px ${badge.colors.glow}`,
            }}
          >
            <span style={{ fontSize: 40 }}>{badge.emoji}</span>
          </div>

          <p className="text-lg font-black tracking-tight mb-0.5" style={{ color: badge.colors.accent }}>
            {badge.name}
          </p>
          <p className="text-[11px] mb-6" style={{ color: badge.colors.text + '80' }}>{badge.tagline}</p>

          {/* Score */}
          <div className="bg-black/20 rounded-2xl p-4 mb-4 border" style={{ borderColor: badge.colors.accent + '15' }}>
            <p className="text-[9px] uppercase tracking-[0.25em] mb-2" style={{ color: badge.colors.accent + '70' }}>Impact Score</p>
            <p className="text-4xl font-black" style={{ color: badge.colors.accent }}>{score}</p>
            <div className="mt-3 h-1.5 bg-black/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${badge.colors.accent}, ${badge.colors.text})`,
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-white/20">0</span>
              <span className="text-[8px] text-white/20">1000</span>
            </div>
          </div>

          {/* Tiers progress */}
          <div className="flex justify-center gap-1 mb-4">
            {BADGE_TIERS.map((t) => (
              <div
                key={t.id}
                className="w-6 h-1.5 rounded-full"
                title={t.name}
                style={{
                  background: score >= t.minScore ? badge.colors.accent : '#ffffff15',
                }}
              />
            ))}
          </div>

          {next && (
            <p className="text-[9px] text-white/25">
              {next.minScore - score} pts to unlock <span style={{ color: badge.colors.accent + 'aa' }}>{next.name}</span>
            </p>
          )}

          {/* Footer */}
          <div className="mt-5 pt-4 border-t flex items-center justify-between" style={{ borderColor: badge.colors.accent + '15' }}>
            <span className="text-[10px] text-white/30">@{login}</span>
            <span className="text-[9px] uppercase tracking-widest" style={{ color: badge.colors.accent + '50' }}>gitpulse.dev</span>
          </div>
        </div>
      </div>

      {/* Download */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 text-sm font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
        style={{
          background: badge.colors.accent + '18',
          color: badge.colors.accent,
          border: `1px solid ${badge.colors.accent}30`,
        }}
      >
        {downloading ? '⏳ Generating…' : '↓ Download Badge'}
      </button>
    </div>
  )
}

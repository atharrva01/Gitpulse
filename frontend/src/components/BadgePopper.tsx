import { useEffect, useState, useRef } from 'react'
import { getBadge, getNextBadge, BADGE_TIERS } from '../lib/badges'
import { toPng } from 'html-to-image'

interface BadgePopperProps {
  score: number
  login: string
  year: number
  onClose: () => void
}

function Particle({ color }: { color: string }) {
  const style: React.CSSProperties = {
    position: 'absolute',
    width: Math.random() * 8 + 4,
    height: Math.random() * 8 + 4,
    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
    background: color,
    left: `${Math.random() * 100}%`,
    top: `-${Math.random() * 20 + 10}px`,
    opacity: 0,
    animation: `fall ${Math.random() * 1.5 + 1.5}s ease-in ${Math.random() * 1.2}s forwards`,
  }
  return <div style={style} />
}

export function BadgePopper({ score, login, year, onClose }: BadgePopperProps) {
  const [phase, setPhase] = useState<'surprise' | 'reveal'>('surprise')
  const [downloading, setDownloading] = useState(false)
  const badge = getBadge(score)
  const next = getNextBadge(score)
  const pct = Math.min((score / 1000) * 100, 100)
  const cardId = `popper-badge-${login}`
  const colors = ['#34d399', '#06b6d4', badge.colors.accent, '#ffffff', badge.colors.text]

  useEffect(() => {
    const t = setTimeout(() => setPhase('reveal'), 1400)
    return () => clearTimeout(t)
  }, [])

  async function handleDownload() {
    setDownloading(true)
    try {
      const node = document.getElementById(cardId)
      if (!node) return
      const url = await toPng(node, { pixelRatio: 3, backgroundColor: badge.colors.bg })
      const a = document.createElement('a')
      a.download = `gitpulse-badge-${login}-${year}.png`
      a.href = url
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(420px) rotate(${Math.random() > 0.5 ? '' : '-'}${Math.floor(Math.random()*360)}deg); opacity: 0; }
        }
        @keyframes popIn {
          0% { transform: scale(0.5) translateY(40px); opacity: 0; }
          60% { transform: scale(1.04) translateY(-4px); opacity: 1; }
          80% { transform: scale(0.98) translateY(0); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 30px var(--glow), 0 0 60px var(--glow); }
          50% { box-shadow: 0 0 50px var(--glow), 0 0 100px var(--glow); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes surprisePulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: 'rgba(6,10,6,0.92)', backdropFilter: 'blur(16px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        {/* Confetti particles */}
        {phase === 'reveal' && (
          <div className="absolute inset-x-0 top-0 pointer-events-none overflow-hidden" style={{ height: 460 }}>
            {Array.from({ length: 28 }).map((_, i) => (
              <Particle key={i} color={colors[i % colors.length]} />
            ))}
          </div>
        )}

        {phase === 'surprise' ? (
          <div className="text-center" style={{ animation: 'surprisePulse 1.2s ease-in-out infinite' }}>
            <p className="text-5xl mb-4">✨</p>
            <p className="text-white text-xl font-black tracking-tight">There's a surprise...</p>
          </div>
        ) : (
          <div
            className="relative w-full max-w-sm"
            style={{ animation: 'popIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
          >
            {/* Card */}
            <div
              id={cardId}
              className="relative rounded-3xl overflow-hidden"
              style={{
                background: badge.colors.bg,
                ['--glow' as string]: badge.colors.glow,
                animation: 'pulse-glow 2.5s ease-in-out infinite',
                border: `1px solid ${badge.colors.accent}30`,
              }}
            >
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 blur-[60px] pointer-events-none"
                style={{ background: badge.colors.glow }}
              />

              <div className="relative p-6">
                {/* GitPulse logo */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-black text-[9px] font-black"
                      style={{ background: badge.colors.accent }}>G</div>
                    <span className="text-[10px] font-bold text-white/40 tracking-wider">GitPulse</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-[0.25em] font-semibold" style={{ color: badge.colors.accent + '80' }}>
                    {year} Achievement
                  </span>
                </div>

                {/* Emoji */}
                <div className="text-center mb-4">
                  <div
                    className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto border"
                    style={{
                      background: badge.colors.gradient,
                      borderColor: badge.colors.accent + '35',
                      boxShadow: `0 0 40px ${badge.colors.glow}`,
                    }}
                  >
                    <span style={{ fontSize: 52 }}>{badge.emoji}</span>
                  </div>
                </div>

                {/* Congrats text */}
                <div className="text-center mb-4" style={{ animation: 'fadeSlideUp 0.4s ease 0.2s both' }}>
                  <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Congratulations!</p>
                  <p className="text-2xl font-black" style={{ color: badge.colors.accent }}>
                    {badge.name}
                  </p>
                  <p className="text-xs mt-1" style={{ color: badge.colors.text + '80' }}>{badge.tagline}</p>
                </div>

                {/* Score */}
                <div
                  className="rounded-2xl p-4 mb-4 text-center border"
                  style={{ background: 'rgba(0,0,0,0.2)', borderColor: badge.colors.accent + '15' }}
                >
                  <p className="text-[9px] uppercase tracking-[0.25em] mb-1" style={{ color: badge.colors.accent + '70' }}>
                    Impact Score
                  </p>
                  <p className="text-4xl font-black" style={{ color: badge.colors.accent }}>{score}</p>
                  <div className="mt-3 h-1.5 rounded-full bg-black/30 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${badge.colors.accent}, ${badge.colors.text})`,
                        transition: 'width 1s ease 0.4s',
                      }}
                    />
                  </div>
                </div>

                {/* Tier progress dots */}
                <div className="flex justify-center gap-1.5 mb-3">
                  {BADGE_TIERS.map((t) => (
                    <div
                      key={t.id}
                      className="w-5 h-1.5 rounded-full"
                      title={`${t.name} (${t.minScore}+)`}
                      style={{ background: score >= t.minScore ? badge.colors.accent : 'rgba(255,255,255,0.08)' }}
                    />
                  ))}
                </div>

                {next ? (
                  <p className="text-center text-[10px] text-white/25 mb-2">
                    Contribute <span style={{ color: badge.colors.accent + 'bb' }}>{next.minScore - score} more points</span> to unlock{' '}
                    <span style={{ color: badge.colors.text }}>{next.emoji} {next.name}</span>
                  </p>
                ) : (
                  <p className="text-center text-[10px] mb-2" style={{ color: badge.colors.accent }}>
                    🎉 Maximum tier achieved!
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: badge.colors.accent + '15' }}>
                  <span className="text-[9px] text-white/25">@{login}</span>
                  <span className="text-[8px] uppercase tracking-widest" style={{ color: badge.colors.accent + '40' }}>gitpulse.dev</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-3 flex gap-2" style={{ animation: 'fadeSlideUp 0.4s ease 0.5s both', opacity: 0 }}>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex-1 text-sm font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
                style={{
                  background: badge.colors.accent,
                  color: '#000',
                }}
              >
                {downloading ? '⏳' : '↓ Download Badge'}
              </button>
              <button
                onClick={onClose}
                className="px-4 text-sm rounded-xl text-white/40 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

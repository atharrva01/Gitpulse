interface ImpactScoreProps {
  score: number
  size?: 'sm' | 'lg'
}

function tier(score: number): { label: string; color: string } {
  if (score >= 800) return { label: 'OSS Legend', color: 'from-amber-300 to-yellow-400' }
  if (score >= 600) return { label: 'Making Moves', color: 'from-emerald-300 to-cyan-400' }
  if (score >= 400) return { label: 'Shipping Real Things', color: 'from-emerald-400 to-teal-400' }
  if (score >= 200) return { label: 'In The Game', color: 'from-emerald-300 to-emerald-500' }
  return { label: 'Just Getting Started', color: 'from-slate-300 to-slate-500' }
}

export function ImpactScore({ score, size = 'sm' }: ImpactScoreProps) {
  const { label, color } = tier(score)
  const pct = Math.min((score / 1000) * 100, 100)

  if (size === 'lg') {
    return (
      <div className="text-center">
        <div className={`text-7xl sm:text-8xl font-black tracking-tighter bg-gradient-to-br ${color} bg-clip-text text-transparent`}>
          {score}
        </div>
        <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-sm font-semibold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
          {label}
        </div>
        <div className="mt-4 h-1.5 bg-white/[0.06] rounded-full w-48 sm:w-56 mx-auto overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-white/20 mt-2 font-medium">{score} / 1000</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-baseline gap-2.5">
        <span className={`text-4xl font-black tracking-tighter bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
          {score}
        </span>
        <span className="text-xs font-semibold text-white/30 uppercase tracking-widest">{label}</span>
      </div>
      <div className="mt-2 h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

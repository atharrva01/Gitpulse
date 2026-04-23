interface ImpactScoreProps {
  score: number
  size?: 'sm' | 'lg'
}

function tier(score: number): { label: string; color: string } {
  if (score >= 800) return { label: 'Elite', color: 'text-yellow-400' }
  if (score >= 600) return { label: 'Advanced', color: 'text-purple-400' }
  if (score >= 400) return { label: 'Intermediate', color: 'text-blue-400' }
  if (score >= 200) return { label: 'Active', color: 'text-green-400' }
  return { label: 'Rising', color: 'text-gray-400' }
}

export function ImpactScore({ score, size = 'sm' }: ImpactScoreProps) {
  const { label, color } = tier(score)
  const pct = Math.min((score / 1000) * 100, 100)

  if (size === 'lg') {
    return (
      <div className="text-center">
        <div className="text-7xl font-black text-white mb-2">{score}</div>
        <div className={`text-lg font-semibold ${color}`}>{label}</div>
        <div className="mt-3 h-2 bg-gray-700 rounded-full w-48 mx-auto overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">{score} / 1000</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className={`text-sm font-medium ${color}`}>{label}</span>
      </div>
      <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

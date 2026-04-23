import { useRepos, useReviewLatency, useMe } from '../lib/hooks'
import { RepoTable } from '../components/RepoTable'
import { Navbar } from '../components/Navbar'

function fmtHours(seconds: number): string {
  if (seconds === 0) return '—'
  const hours = seconds / 3600
  if (hours < 1) return `${Math.round(seconds / 60)}m`
  if (hours < 48) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

export function Repos() {
  const { data: me } = useMe()
  const { data: repos, isLoading } = useRepos()
  const { data: latency } = useReviewLatency()

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar user={me} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-2">Repository Breakdown</h1>
        <p className="text-gray-400 text-sm mb-8">All repositories you've contributed to, sorted by PR count.</p>

        {latency && latency.count > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-8">
            <h2 className="text-white font-semibold mb-4">Review Latency</h2>
            <p className="text-gray-400 text-sm mb-4">
              How quickly you respond to PRs as a reviewer ({latency.count} reviews analyzed)
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Median', value: fmtHours(latency.median) },
                { label: 'p75', value: fmtHours(latency.p75) },
                { label: 'p95', value: fmtHours(latency.p95) },
              ].map((s) => (
                <div key={s.label} className="text-center bg-gray-800 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold text-blue-400">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">All Repositories</h2>
          {isLoading ? (
            <p className="text-gray-500 text-sm animate-pulse">Loading...</p>
          ) : (
            <RepoTable repos={repos || []} />
          )}
        </div>
      </div>
    </div>
  )
}

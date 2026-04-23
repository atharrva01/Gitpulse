import { useDashboard, useSync } from '../lib/hooks'
import { StatCard } from '../components/StatCard'
import { PRList } from '../components/PRList'
import { ImpactScore } from '../components/ImpactScore'
import { Navbar } from '../components/Navbar'

function fmtLines(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function fmtDate(d: string | null): string {
  if (!d) return 'Never'
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function Dashboard() {
  const { data, isLoading, error } = useDashboard()
  const sync = useSync()
  const fullSync = useSync(true)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400 animate-pulse">Loading your dashboard...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400">Failed to load dashboard. Try refreshing.</div>
        </div>
      </div>
    )
  }

  const d = data!

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar user={d.user} />
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img src={d.user.avatar_url} alt={d.user.login} className="w-14 h-14 rounded-full border-2 border-purple-500" />
            <div>
              <h1 className="text-2xl font-bold text-white">{d.user.name || d.user.login}</h1>
              <p className="text-gray-400 text-sm">@{d.user.login}</p>
              {d.user.last_synced_at && (
                <p className="text-gray-500 text-xs">Last synced {fmtDate(d.user.last_synced_at)}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => sync.mutate()}
              disabled={sync.isPending || fullSync.isPending}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              title="Sync last 90 days"
            >
              {sync.isPending ? 'Syncing...' : '↻ Sync'}
            </button>
            <button
              onClick={() => fullSync.mutate()}
              disabled={sync.isPending || fullSync.isPending}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-400 text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
              title="Full historical sync — fetches all PRs ever"
            >
              {fullSync.isPending ? 'Syncing all...' : '↻ Full'}
            </button>
          </div>
        </div>

        {/* Impact Score */}
        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/20 border border-purple-500/30 rounded-xl p-8 mb-6 text-center">
          <p className="text-gray-400 text-sm mb-4 uppercase tracking-widest font-medium">Impact Score</p>
          <ImpactScore score={d.impact_score} size="lg" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Merged PRs" value={d.total_merged_prs} />
          <StatCard label="Lines Changed" value={fmtLines(d.total_additions + d.total_deletions)} sub={`+${fmtLines(d.total_additions)} -${fmtLines(d.total_deletions)}`} />
          <StatCard label="Repositories" value={d.unique_repos} />
          <StatCard label="🔥 Current Streak" value={`${d.current_streak}d`} sub={`Longest: ${d.longest_streak}d`} accent />
        </div>

        {/* Recent PRs */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">Recent Merged PRs</h2>
          <PRList prs={d.recent_prs} />
        </div>

        {/* Top repos */}
        {d.top_repos && d.top_repos.length > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">Top Repositories</h2>
            <div className="space-y-3">
              {d.top_repos.map((r) => (
                <div key={r.repo_full_name} className="flex items-center justify-between">
                  <a
                    href={`https://github.com/${r.repo_full_name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm font-mono"
                  >
                    {r.repo_full_name}
                  </a>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400">{r.pr_count} PRs</span>
                    <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${Math.min((r.pr_count / (d.top_repos[0]?.pr_count || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

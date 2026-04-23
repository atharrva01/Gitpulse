import { useDashboard, useSync, useMe } from '../lib/hooks'
import { StatCard } from '../components/StatCard'
import { PRList } from '../components/PRList'
import { ImpactScore } from '../components/ImpactScore'
import { Navbar } from '../components/Navbar'
import { BadgeCard } from '../components/BadgeCard'
import { Link } from 'react-router-dom'

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
  const { data: me } = useMe()
  const { data, isLoading, error } = useDashboard()
  const sync = useSync()
  const fullSync = useSync(true)

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar user={me} />
        <div className="flex items-center justify-center h-64">
          <div className="text-white/30 animate-pulse text-sm">Loading your dashboard...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Navbar user={me} />
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400/80 text-sm">Failed to load dashboard. Try refreshing.</div>
        </div>
      </div>
    )
  }

  const d = data!

  return (
    <div className="min-h-screen">
      <Navbar user={d.user} />

      <div className="w-full px-4 sm:px-6 lg:px-10 py-8 sm:py-10 max-w-screen-2xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <img src={d.user.avatar_url} alt={d.user.login} className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ring-1 ring-white/10" />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-emerald-500/20" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">{d.user.name || d.user.login}</h1>
              <p className="text-white/40 text-sm">@{d.user.login}</p>
              {d.user.last_synced_at && (
                <p className="text-white/20 text-xs mt-0.5">Synced {fmtDate(d.user.last_synced_at)}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/u/${d.user.login}`}
              className="text-xs text-white/40 hover:text-emerald-400 transition-colors px-3 py-2 rounded-lg hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06]"
            >
              View profile →
            </Link>
            <button
              onClick={() => sync.mutate()}
              disabled={sync.isPending || fullSync.isPending}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
            >
              {sync.isPending ? '⟳ Syncing...' : '⟳ Sync'}
            </button>
            <button
              onClick={() => fullSync.mutate()}
              disabled={sync.isPending || fullSync.isPending}
              className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-white/40 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
            >
              {fullSync.isPending ? 'Syncing all...' : 'Full sync'}
            </button>
          </div>
        </div>

        {/* Impact Score */}
        <div className="relative rounded-2xl border border-white/[0.06] bg-[#060a06] p-8 sm:p-10 mb-6 text-center overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: 'linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-emerald-500/10 blur-3xl pointer-events-none" />
          <p className="text-[10px] text-white/25 uppercase tracking-[0.3em] font-semibold mb-6">Impact Score</p>
          <ImpactScore score={d.impact_score} size="lg" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Merged PRs" value={d.total_merged_prs} icon="🔀" />
          <StatCard label="Lines Changed" value={fmtLines(d.total_additions + d.total_deletions)} sub={`+${fmtLines(d.total_additions)}  −${fmtLines(d.total_deletions)}`} icon="📝" />
          <StatCard label="Repositories" value={d.unique_repos} icon="📦" />
          <StatCard label="Current Streak" value={`${d.current_streak}d`} sub={`Longest: ${d.longest_streak}d`} accent icon="🔥" />
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent PRs */}
          <div className="xl:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-white font-bold text-xs uppercase tracking-widest">Recent Merged PRs</p>
              <Link to="/repos" className="text-xs text-white/30 hover:text-emerald-400 transition-colors">See all →</Link>
            </div>
            <PRList prs={d.recent_prs} />
          </div>

          {/* Sidebar: badge + top repos */}
          <div className="space-y-4">
            {/* Impact Badge */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-white font-bold text-xs uppercase tracking-widest">Your Badge</p>
                <Link to="/wrapped" className="text-xs text-white/30 hover:text-emerald-400 transition-colors">Full card →</Link>
              </div>
              <BadgeCard score={d.impact_score} login={d.user.login} compact />
            </div>

            {/* Top repos */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
              <p className="text-white font-bold text-xs uppercase tracking-widest mb-5">Top Repositories</p>
              {d.top_repos && d.top_repos.length > 0 ? (
                <div className="space-y-4">
                  {d.top_repos.map((r) => (
                    <div key={r.repo_full_name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <a
                          href={`https://github.com/${r.repo_full_name}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-white/40 hover:text-emerald-400 font-mono truncate transition-colors"
                        >
                          {r.repo_full_name}
                        </a>
                        <span className="text-xs text-white/30 font-semibold shrink-0 ml-2">{r.pr_count} PRs</span>
                      </div>
                      <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                          style={{ width: `${Math.min((r.pr_count / (d.top_repos[0]?.pr_count || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/20 text-xs">No repo data yet — sync to load.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

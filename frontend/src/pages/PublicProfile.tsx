import { useParams } from 'react-router-dom'
import { usePublicProfile, useMe } from '../lib/hooks'
import { StatCard } from '../components/StatCard'
import { PRList } from '../components/PRList'
import { ImpactScore } from '../components/ImpactScore'
import { BadgeCard } from '../components/BadgeCard'
import { Navbar } from '../components/Navbar'
import { isAuthenticated } from '../lib/auth'

function fmtLines(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function PublicProfile() {
  const { login } = useParams<{ login: string }>()
  const { data: me } = useMe()
  const { data, isLoading, error } = usePublicProfile(login || '')

  const badgeURL = `/badge/${login}`
  const profileURL = window.location.href

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar user={me} />
        <div className="flex items-center justify-center h-64">
          <div className="text-white/30 animate-pulse text-sm">Loading profile...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Navbar user={me} />
        <div className="flex items-center justify-center h-64 text-center px-4">
          <div>
            <p className="text-white font-bold text-xl mb-2">Profile not found</p>
            <p className="text-white/30 text-sm">@{login} hasn't joined GitPulse yet, or their profile is private.</p>
            {!isAuthenticated() && (
              <a href="/auth/github" className="inline-block mt-6 text-sm text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                Claim your own profile →
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  const d = data!

  return (
    <div className="min-h-screen">
      <Navbar user={me} />

      <div className="w-full px-4 sm:px-6 lg:px-10 py-8 sm:py-10 max-w-screen-xl mx-auto">

        {/* Profile hero */}
        <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden mb-6">
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage: 'linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl pointer-events-none" />

          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="relative shrink-0">
                <img src={d.user.avatar_url} alt={d.user.login} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ring-1 ring-white/10" />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-emerald-500/20" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{d.user.name || d.user.login}</h1>
                <p className="text-white/40 text-sm mt-0.5">@{d.user.login}</p>
                {d.user.bio && <p className="text-white/50 text-sm mt-3 leading-relaxed max-w-xl">{d.user.bio}</p>}
              </div>
              {!isAuthenticated() && (
                <a
                  href="/auth/github"
                  className="shrink-0 text-xs font-semibold text-black bg-emerald-400 hover:bg-emerald-300 px-4 py-2 rounded-lg transition-colors"
                >
                  Get your own →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Impact score */}
        <div className="relative rounded-2xl border border-white/[0.06] bg-[#060a06] p-8 sm:p-10 mb-6 text-center overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/10 blur-3xl pointer-events-none" />
          <p className="text-[10px] text-white/25 uppercase tracking-[0.3em] font-semibold mb-6">Impact Score</p>
          <ImpactScore score={d.impact_score} size="lg" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Merged PRs" value={d.total_merged_prs} icon="🔀" />
          <StatCard label="Lines Changed" value={fmtLines(d.total_additions + d.total_deletions)} icon="📝" />
          <StatCard label="Repositories" value={d.unique_repos} icon="📦" />
          <StatCard label="Streak" value={`${d.current_streak}d`} sub={`Longest: ${d.longest_streak}d`} accent icon="🔥" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent PRs */}
          <div className="xl:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
            <p className="text-white font-bold text-xs uppercase tracking-widest mb-4">Recent Merged PRs</p>
            <PRList prs={d.recent_prs} />
          </div>

          {/* Badge + README */}
          <div className="space-y-4">
            {/* Impact Badge */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
              <p className="text-white font-bold text-xs uppercase tracking-widest mb-5">Impact Badge</p>
              <BadgeCard score={d.impact_score} login={d.user.login} compact />
            </div>

            {/* README badge */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
              <p className="text-white font-bold text-xs uppercase tracking-widest mb-4">README Badge</p>
              <div className="mb-4 bg-black/30 rounded-xl p-3 flex items-center justify-center border border-white/[0.04]">
                <img src={badgeURL} alt="GitPulse badge" className="max-w-full" style={{ height: 44 }} />
              </div>
              <p className="text-[10px] text-white/30 mb-2 uppercase tracking-widest font-semibold">Markdown</p>
              <code className="block bg-black/40 text-emerald-400 text-xs p-3 rounded-xl font-mono overflow-x-auto border border-white/[0.04] leading-relaxed break-all">
                {`[![GitPulse](${window.location.origin}${badgeURL})](${profileURL})`}
              </code>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

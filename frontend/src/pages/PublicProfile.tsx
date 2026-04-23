import { useParams } from 'react-router-dom'
import { usePublicProfile } from '../lib/hooks'
import { StatCard } from '../components/StatCard'
import { PRList } from '../components/PRList'
import { ImpactScore } from '../components/ImpactScore'
import { Navbar } from '../components/Navbar'

function fmtLines(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function PublicProfile() {
  const { login } = useParams<{ login: string }>()
  const { data, isLoading, error } = usePublicProfile(login || '')

  const badgeURL = `/badge/${login}`
  const profileURL = window.location.href

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400 animate-pulse">Loading profile...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-400 text-xl mb-2">Profile not found</p>
            <p className="text-gray-600 text-sm">@{login} hasn't joined GitPulse yet, or their profile is private.</p>
          </div>
        </div>
      </div>
    )
  }

  const d = data!

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile header */}
        <div className="flex items-center gap-6 mb-8">
          <img src={d.user.avatar_url} alt={d.user.login} className="w-20 h-20 rounded-full border-2 border-purple-500" />
          <div>
            <h1 className="text-3xl font-bold text-white">{d.user.name || d.user.login}</h1>
            <p className="text-gray-400">@{d.user.login}</p>
            {d.user.bio && <p className="text-gray-400 text-sm mt-1 max-w-md">{d.user.bio}</p>}
          </div>
        </div>

        {/* Impact score */}
        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/20 border border-purple-500/30 rounded-xl p-8 mb-6 text-center">
          <p className="text-gray-400 text-sm mb-4 uppercase tracking-widest font-medium">Impact Score</p>
          <ImpactScore score={d.impact_score} size="lg" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Merged PRs" value={d.total_merged_prs} />
          <StatCard label="Lines Changed" value={fmtLines(d.total_additions + d.total_deletions)} />
          <StatCard label="Repositories" value={d.unique_repos} />
          <StatCard label="🔥 Streak" value={`${d.current_streak}d`} sub={`Longest: ${d.longest_streak}d`} accent />
        </div>

        {/* README badge embed */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-3">Embed in your README</h2>
          <div className="mb-3">
            <img src={badgeURL} alt="GitPulse badge" className="h-5" />
          </div>
          <code className="block bg-gray-800 text-green-400 text-xs p-3 rounded-md font-mono overflow-x-auto">
            {`[![GitPulse](${window.location.origin}${badgeURL})](${profileURL})`}
          </code>
        </div>

        {/* Recent PRs */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">Recent Merged PRs</h2>
          <PRList prs={d.recent_prs} />
        </div>
      </div>
    </div>
  )
}

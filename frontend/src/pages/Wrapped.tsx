import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { useMe } from '../lib/hooks'
import { isAuthenticated } from '../lib/auth'
import { Navbar } from '../components/Navbar'

interface WrappedStats {
  year: number
  login: string
  name: string
  avatar_url: string
  impact_score: number
  total_prs: number
  total_reviews: number
  total_additions: number
  total_deletions: number
  unique_repos: number
  longest_streak: number
  top_repo: string
  top_repo_prs: number
  most_active_month: string
  most_active_month_prs: number
  monthly_activity: { month: string; count: number }[]
  first_pr_title: string
  first_pr_repo: string
  last_pr_title: string
  last_pr_repo: string
}

function fmtLines(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function MonthBar({ month, count, max }: { month: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-gray-400">{count || ''}</span>
      <div className="w-6 bg-gray-700 rounded-sm overflow-hidden" style={{ height: '60px' }}>
        <div
          className="w-full bg-purple-500 rounded-sm transition-all duration-700"
          style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{month}</span>
    </div>
  )
}

interface WrappedCardProps {
  data: WrappedStats
  isOwn: boolean
}

function WrappedCard({ data, isOwn }: WrappedCardProps) {
  const shareURL = `${window.location.origin}/u/${data.login}/wrapped?year=${data.year}`
  const shareText = `My ${data.year} in open source: ${data.total_prs} PRs merged across ${data.unique_repos} repos, ${data.longest_streak}-day streak, Impact Score ${data.impact_score}. Check it out on @GitPulse 🚀`
  const maxCount = Math.max(...(data.monthly_activity?.map((m) => m.count) ?? [1]))

  return (
    <div id="wrapped-card" className="bg-gradient-to-br from-gray-900 via-purple-950/20 to-gray-900 border border-purple-500/30 rounded-2xl p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <img src={data.avatar_url} alt={data.login} className="w-12 h-12 rounded-full border-2 border-purple-500" />
          <div>
            <p className="font-bold text-white">{data.name || data.login}</p>
            <p className="text-gray-400 text-sm">@{data.login}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs uppercase tracking-widest">OSS Wrapped</p>
          <p className="text-white font-black text-2xl">{data.year}</p>
        </div>
      </div>

      {/* Hero score */}
      <div className="text-center mb-8">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Impact Score</p>
        <p className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
          {data.impact_score}
        </p>
      </div>

      {/* Stats grid — skip Reviews if 0 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Merged PRs', value: data.total_prs },
          ...(data.total_reviews > 0 ? [{ label: 'Reviews', value: data.total_reviews }] : []),
          { label: 'Repos', value: data.unique_repos },
          { label: 'Lines Added', value: fmtLines(data.total_additions) },
          { label: 'Lines Removed', value: fmtLines(data.total_deletions) },
          { label: '🔥 Longest Streak', value: `${data.longest_streak}d` },
        ].map((s) => (
          <div key={s.label} className="bg-black/30 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly activity */}
      {data.monthly_activity && (
        <div className="mb-8">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-4">Monthly Activity</p>
          <div className="flex items-end justify-between gap-1">
            {data.monthly_activity.map((m) => (
              <MonthBar key={m.month} month={m.month} count={m.count} max={maxCount} />
            ))}
          </div>
          {data.most_active_month && (
            <p className="text-center text-sm text-gray-400 mt-3">
              Peak month: <span className="text-purple-400 font-semibold">{data.most_active_month}</span>
              {' '}({data.most_active_month_prs} PRs)
            </p>
          )}
        </div>
      )}

      {/* Top repo */}
      {data.top_repo && (
        <div className="bg-black/30 rounded-xl p-4 mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Top Repository</p>
          <div className="flex items-center justify-between">
            <a
              href={`https://github.com/${data.top_repo}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:text-blue-300 font-mono text-sm"
            >
              {data.top_repo}
            </a>
            <span className="text-white font-bold">{data.top_repo_prs} PRs</span>
          </div>
        </div>
      )}

      {/* First / last PR */}
      {(data.first_pr_title || data.last_pr_title) && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          {data.first_pr_title && (
            <div className="bg-black/30 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">First PR of {data.year}</p>
              <p className="text-sm text-white line-clamp-2">{data.first_pr_title}</p>
              <p className="text-xs text-gray-500 mt-1 font-mono">{data.first_pr_repo}</p>
            </div>
          )}
          {data.last_pr_title && (
            <div className="bg-black/30 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Last PR of {data.year}</p>
              <p className="text-sm text-white line-clamp-2">{data.last_pr_title}</p>
              <p className="text-xs text-gray-500 mt-1 font-mono">{data.last_pr_repo}</p>
            </div>
          )}
        </div>
      )}

      {/* Share */}
      {isOwn && (
        <div className="flex gap-3">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareURL)}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 bg-black border border-gray-600 hover:border-gray-400 text-white text-sm font-medium py-2.5 rounded-lg transition-colors text-center"
          >
            Share on X
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareURL)}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors text-center"
          >
            Share on LinkedIn
          </a>
          <button
            onClick={() => navigator.clipboard.writeText(shareURL)}
            className="px-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm rounded-lg transition-colors"
          >
            Copy link
          </button>
        </div>
      )}

      <p className="text-center text-xs text-gray-600 mt-6">⚡ gitpulse.dev</p>
    </div>
  )
}

// ── Own wrapped (authenticated) ───────────────────────────────────────────────
export function Wrapped() {
  const { data: me } = useMe()
  const currentYear = new Date().getFullYear()
  // Default to current year — contributor is likely most active now
  const [year, setYear] = useState(currentYear)

  const { data, isLoading, error } = useQuery<WrappedStats>({
    queryKey: ['wrapped', year],
    queryFn: () => api.get(`/wrapped?year=${year}`).then((r) => r.data),
  })

  const years = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i)

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar user={me} />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">OSS Wrapped</h1>
            <p className="text-gray-400 text-sm">Your year in open source</p>
          </div>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg px-3 py-2"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {isLoading && (
          <div className="text-center py-16 text-gray-400 animate-pulse">Generating your Wrapped...</div>
        )}
        {error && (
          <div className="text-center py-16 text-red-400">Failed to load. Make sure you've synced your data first.</div>
        )}
        {data && data.total_prs === 0 && !isLoading && (
          <div className="text-center py-16 bg-gray-900 border border-gray-700 rounded-xl">
            <p className="text-gray-300 text-lg mb-2">No contributions found for {year}</p>
            <p className="text-gray-500 text-sm mb-4">Try syncing your data first, or pick a different year.</p>
            <button
              onClick={() => setYear(year - 1)}
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              Try {year - 1} →
            </button>
          </div>
        )}
        {data && data.total_prs > 0 && <WrappedCard data={data} isOwn />}
      </div>
    </div>
  )
}

// ── Public wrapped (no auth) ──────────────────────────────────────────────────
export function PublicWrapped() {
  const { login } = useParams<{ login: string }>()
  const { data: me } = useMe()
  const params = new URLSearchParams(window.location.search)
  const year = Number(params.get('year') ?? new Date().getFullYear())

  const { data, isLoading, error } = useQuery<WrappedStats>({
    queryKey: ['wrapped-public', login, year],
    queryFn: () => api.get(`/u/${login}/wrapped?year=${year}`, { baseURL: '' }).then((r) => r.data),
    enabled: !!login,
  })

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar user={isAuthenticated() ? me : undefined} />
      <div className="max-w-2xl mx-auto px-4 py-8">
        {isLoading && <div className="text-center py-16 text-gray-400 animate-pulse">Loading...</div>}
        {error && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-xl mb-2">Not found</p>
            <p className="text-gray-600 text-sm">@{login}'s {year} Wrapped isn't available.</p>
            <Link to="/" className="text-purple-400 text-sm mt-4 inline-block">Back to GitPulse →</Link>
          </div>
        )}
        {data && <WrappedCard data={data} isOwn={false} />}
      </div>
    </div>
  )
}

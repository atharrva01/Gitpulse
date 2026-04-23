import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toPng } from 'html-to-image'
import api from '../lib/api'
import { useMe } from '../lib/hooks'
import { isAuthenticated } from '../lib/auth'
import { Navbar } from '../components/Navbar'
import { BadgeCard } from '../components/BadgeCard'
import { BadgePopper } from '../components/BadgePopper'

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
      <span className="text-[9px] text-emerald-300/50">{count || ''}</span>
      <div className="w-5 bg-white/[0.06] rounded-sm overflow-hidden" style={{ height: '52px' }}>
        <div
          className="w-full rounded-sm transition-all duration-700"
          style={{
            height: `${pct}%`,
            marginTop: `${100 - pct}%`,
            background: 'linear-gradient(to top, #10b981, #34d399)',
          }}
        />
      </div>
      <span className="text-[9px] text-white/25">{month}</span>
    </div>
  )
}

function buildPostIdea(data: WrappedStats, shareURL: string): string {
  const candidates = [
    { score: data.total_prs / 80, hook: `${data.total_prs}+ PRs merged in ${data.year} alone...` },
    { score: data.total_additions / 100_000, hook: `I added ${fmtLines(data.total_additions)} lines of code in ${data.year}...` },
    { score: data.total_deletions / 50_000, hook: `I deleted ${fmtLines(data.total_deletions)} lines in ${data.year}...` },
    { score: data.longest_streak / 100, hook: `${data.longest_streak}-day open source streak in ${data.year}...` },
    { score: data.impact_score / 1000, hook: `${data.impact_score}+ Impact Score for my ${data.year} open source contributions...` },
  ]
  const hook = [...candidates].sort((a, b) => b.score - a.score)[0].hook
  const lines = [
    hook, '',
    "I used to think open source contributions only mattered if they were huge.",
    "But when all those small moments add up, they look like this:", '',
    `✨ Impact Score: ${data.impact_score}`,
    `🔀 ${data.total_prs} PRs merged`,
    `📦 ${data.unique_repos} repositories`,
    `🧑‍💻 ${fmtLines(data.total_additions)} lines added`,
    `🧹 ${fmtLines(data.total_deletions)} lines removed`,
    `🔥 ${data.longest_streak}-day streak`,
  ]
  if (data.first_pr_title || data.last_pr_title) {
    lines.push('')
    if (data.first_pr_title) lines.push(`First PR of ${data.year}: "${data.first_pr_title}"`)
    if (data.last_pr_title) lines.push(`Last PR: "${data.last_pr_title}"`)
    lines.push('', "That's what building in public looks like — tiny efforts, repeated, become real impact.")
  }
  lines.push('', 'Still learning. Still shipping.', '', `See yours → ${window.location.origin}`)
  return lines.join('\n')
}

interface WrappedCardProps {
  data: WrappedStats
  isOwn: boolean
}

function WrappedCard({ data, isOwn }: WrappedCardProps) {
  const [copied, setCopied] = useState(false)
  const [postCopied, setPostCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [showPopper, setShowPopper] = useState(false)

  useEffect(() => {
    if (!isOwn) return
    const key = `gp_badge_popped_${data.login}_${data.year}`
    if (localStorage.getItem(key)) return
    const t = setTimeout(() => {
      setShowPopper(true)
      localStorage.setItem(key, '1')
    }, 2500)
    return () => clearTimeout(t)
  }, [isOwn, data.login, data.year])

  const shareURL = `${window.location.origin}/u/${data.login}/wrapped?year=${data.year}`
  const shareText = `My ${data.year} in open source:\n⚡ ${data.total_prs} PRs merged · ${data.unique_repos} repos · ${data.longest_streak}-day streak\n🏆 Impact Score: ${data.impact_score}\n\nSee yours → ${shareURL}`
  const xText = `My ${data.year} in open source: ${data.total_prs} PRs merged across ${data.unique_repos} repos, ${data.longest_streak}-day streak, Impact Score ${data.impact_score} 🚀`
  const maxCount = Math.max(...(data.monthly_activity?.map((m) => m.count) ?? [1])) || 1

  async function handleDownload() {
    setDownloading(true)
    try {
      const node = document.getElementById('wrapped-card')
      if (!node) return
      const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: '#030d08' })
      const a = document.createElement('a')
      a.download = `gitpulse-wrapped-${data.login}-${data.year}.png`
      a.href = dataUrl
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  function handleLinkedIn() {
    navigator.clipboard.writeText(shareText)
    window.open(`https://www.linkedin.com/feed/?shareActive=true`, '_blank')
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareURL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleCopyPost() {
    navigator.clipboard.writeText(buildPostIdea(data, shareURL))
    setPostCopied(true)
    setTimeout(() => setPostCopied(false), 2000)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {showPopper && (
        <BadgePopper
          score={data.impact_score}
          login={data.login}
          year={data.year}
          onClose={() => setShowPopper(false)}
        />
      )}

      {/* The downloadable card */}
      <div
        id="wrapped-card"
        className="relative rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #030d08 0%, #061a0e 50%, #030a06 100%)' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-emerald-500/15 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-500/8 blur-[80px] pointer-events-none" />

        <div className="relative p-6 sm:p-8 border border-emerald-500/20 rounded-3xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <img src={data.avatar_url} alt={data.login} className="w-11 h-11 rounded-2xl ring-2 ring-emerald-500/30" />
              <div>
                <p className="font-bold text-white text-sm">{data.name || data.login}</p>
                <p className="text-emerald-300/50 text-xs">@{data.login}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-emerald-300/30 text-[9px] uppercase tracking-[0.2em] font-semibold">OSS Wrapped</p>
              <p className="text-white font-black text-3xl tracking-tight leading-none mt-0.5">{data.year}</p>
            </div>
          </div>

          {/* Score */}
          <div className="text-center mb-8">
            <p className="text-emerald-300/30 text-[9px] uppercase tracking-[0.2em] font-semibold mb-3">Impact Score</p>
            <p
              className="text-8xl font-black tracking-tighter leading-none"
              style={{ backgroundImage: 'linear-gradient(135deg, #34d399, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              {data.impact_score}
            </p>
            <div className="mt-3 h-1 bg-white/[0.06] rounded-full w-48 mx-auto overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min((data.impact_score / 1000) * 100, 100)}%`, background: 'linear-gradient(90deg, #10b981, #06b6d4)' }} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: 'Merged PRs', value: data.total_prs },
              ...(data.total_reviews > 0 ? [{ label: 'Reviews', value: data.total_reviews }] : []),
              { label: 'Repos', value: data.unique_repos },
              { label: 'Lines Added', value: fmtLines(data.total_additions) },
              { label: 'Lines Removed', value: fmtLines(data.total_deletions) },
              { label: '🔥 Streak', value: `${data.longest_streak}d` },
            ].map((s) => (
              <div key={s.label} className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-3 sm:p-4 text-center">
                <p className="text-xl sm:text-2xl font-black text-white">{s.value}</p>
                <p className="text-[9px] text-emerald-300/40 mt-1 uppercase tracking-widest font-semibold">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Monthly activity */}
          {data.monthly_activity && (
            <div className="mb-8">
              <p className="text-emerald-300/30 text-[9px] uppercase tracking-[0.2em] font-semibold mb-4">Monthly Activity</p>
              <div className="flex items-end justify-between gap-1">
                {data.monthly_activity.map((m) => (
                  <MonthBar key={m.month} month={m.month} count={m.count} max={maxCount} />
                ))}
              </div>
              {data.most_active_month && (
                <p className="text-center text-xs text-emerald-300/40 mt-3">
                  Peak: <span className="text-emerald-300/80 font-semibold">{data.most_active_month}</span> ({data.most_active_month_prs} PRs)
                </p>
              )}
            </div>
          )}

          {/* Top repo */}
          {data.top_repo && (
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 mb-6">
              <p className="text-[9px] text-emerald-300/30 uppercase tracking-[0.2em] font-semibold mb-2">Top Repository</p>
              <div className="flex items-center justify-between">
                <span className="text-emerald-300/80 font-mono text-sm truncate">{data.top_repo}</span>
                <span className="text-white font-bold shrink-0 ml-2">{data.top_repo_prs} PRs</span>
              </div>
            </div>
          )}

          {/* First / last PR */}
          {(data.first_pr_title || data.last_pr_title) && (
            <div className="grid grid-cols-2 gap-3 mb-8">
              {data.first_pr_title && (
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-3 sm:p-4">
                  <p className="text-[9px] text-emerald-300/30 uppercase tracking-[0.15em] font-semibold mb-2">First PR {data.year}</p>
                  <p className="text-sm text-white line-clamp-2 font-medium">{data.first_pr_title}</p>
                  <p className="text-xs text-emerald-300/25 mt-1 font-mono truncate">{data.first_pr_repo}</p>
                </div>
              )}
              {data.last_pr_title && (
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-3 sm:p-4">
                  <p className="text-[9px] text-emerald-300/30 uppercase tracking-[0.15em] font-semibold mb-2">Last PR {data.year}</p>
                  <p className="text-sm text-white line-clamp-2 font-medium">{data.last_pr_title}</p>
                  <p className="text-xs text-emerald-300/25 mt-1 font-mono truncate">{data.last_pr_repo}</p>
                </div>
              )}
            </div>
          )}

          <p className="text-center text-xs text-white/15 font-semibold tracking-widest uppercase">⚡ gitpulse.dev</p>
        </div>
      </div>

      {/* Share actions — outside card, not in downloaded image */}
      {isOwn && (
        <div className="space-y-3 mt-4">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-black text-sm font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {downloading ? <><span className="animate-spin inline-block">⏳</span> Generating…</> : <>↓ Download Image</>}
          </button>

          <button
            onClick={handleCopyPost}
            className="w-full bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-emerald-500/20 text-white text-sm font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {postCopied ? '✓ Copied to clipboard!' : 'Turn this into a personalized post'}
          </button>

          <div className="flex gap-2">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}&url=${encodeURIComponent(shareURL)}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 bg-black/60 border border-white/[0.08] hover:border-white/20 text-white text-sm font-medium py-2.5 rounded-xl transition-colors text-center"
            >
              Share on X
            </a>
            <button
              onClick={handleLinkedIn}
              className="flex-1 bg-blue-600/80 hover:bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors relative group"
            >
              Share on LinkedIn
              <span className="absolute -top-9 left-1/2 -translate-x-1/2 bg-black/80 border border-white/[0.06] text-xs text-white/70 px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Post text copied
              </span>
            </button>
            <button
              onClick={handleCopy}
              className="px-4 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white text-sm rounded-xl transition-colors min-w-[80px]"
            >
              {copied ? '✓' : 'Copy link'}
            </button>
          </div>
        </div>
      )}

      {/* Badge section — always visible */}
      <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <p className="text-white font-bold text-xs uppercase tracking-widest mb-5">Your Impact Badge</p>
        <BadgeCard score={data.impact_score} login={data.login} />
      </div>
    </div>
  )
}

export function Wrapped() {
  const { data: me } = useMe()
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)

  const { data, isLoading, error } = useQuery<WrappedStats>({
    queryKey: ['wrapped', year],
    queryFn: () => api.get(`/wrapped?year=${year}`).then((r) => r.data),
  })

  const years = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i)

  return (
    <div className="min-h-screen">
      <Navbar user={me} />
      <div className="w-full px-4 sm:px-6 lg:px-10 py-8 sm:py-10 max-w-screen-xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] text-emerald-400/50 uppercase tracking-[0.3em] font-semibold mb-2">Year in Review</p>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">OSS Wrapped</h1>
          </div>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-white/[0.04] border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500/40 transition-colors"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {isLoading && <div className="text-center py-16 text-white/25 animate-pulse text-sm">Generating your Wrapped...</div>}
        {error && <div className="text-center py-16 text-red-400/70 text-sm">Failed to load. Sync your data first.</div>}
        {data && data.total_prs === 0 && !isLoading && (
          <div className="text-center py-16 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <p className="text-white font-bold text-lg mb-2">No contributions found for {year}</p>
            <p className="text-white/30 text-sm mb-4">Try syncing first, or pick a different year.</p>
            <button onClick={() => setYear(year - 1)} className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              Try {year - 1} →
            </button>
          </div>
        )}
        {data && data.total_prs > 0 && <WrappedCard data={data} isOwn />}
      </div>
    </div>
  )
}

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
    <div className="min-h-screen">
      <Navbar user={isAuthenticated() ? me : undefined} />
      <div className="w-full px-4 sm:px-6 lg:px-10 py-8 sm:py-10 max-w-screen-xl mx-auto">
        {isLoading && <div className="text-center py-16 text-white/25 animate-pulse text-sm">Loading...</div>}
        {error && (
          <div className="text-center py-16">
            <p className="text-white font-bold text-xl mb-2">Not found</p>
            <p className="text-white/30 text-sm">@{login}'s {year} Wrapped isn't available.</p>
            <Link to="/" className="text-emerald-400 hover:text-emerald-300 text-sm mt-4 inline-block transition-colors">Back to GitPulse →</Link>
          </div>
        )}
        {data && <WrappedCard data={data} isOwn={false} />}
      </div>
    </div>
  )
}

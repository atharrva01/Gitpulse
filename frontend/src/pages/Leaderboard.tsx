import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { useMe } from '../lib/hooks'
import { isAuthenticated } from '../lib/auth'
import { Navbar } from '../components/Navbar'
import { getBadge } from '../lib/badges'

interface LeaderboardEntry {
  login: string
  name: string
  avatar_url: string
  impact_score: number
  current_streak: number
  longest_streak: number
  total_prs: number
}

const RANK_STYLES: Record<number, { bg: string; border: string; text: string; label: string }> = {
  1: { bg: 'rgba(253,224,71,0.06)', border: 'rgba(253,224,71,0.25)', text: '#fde047', label: '🥇' },
  2: { bg: 'rgba(203,213,225,0.05)', border: 'rgba(203,213,225,0.2)', text: '#cbd5e1', label: '🥈' },
  3: { bg: 'rgba(251,146,60,0.06)', border: 'rgba(251,146,60,0.2)', text: '#fb923c', label: '🥉' },
}

export function Leaderboard() {
  const { data: me } = useMe()

  const { data, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: () => api.get('/leaderboard', { baseURL: '' }).then((r) => r.data),
    staleTime: 60_000,
  })

  return (
    <div className="min-h-screen">
      <Navbar user={isAuthenticated() ? me : undefined} />

      <div className="w-full px-4 sm:px-6 lg:px-10 py-8 sm:py-10 max-w-screen-xl mx-auto">
        <div className="mb-8">
          <p className="text-[10px] text-emerald-400/50 uppercase tracking-[0.3em] font-semibold mb-2">Community</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Leaderboard</h1>
          <p className="text-white/30 text-sm mt-1">Top open source contributors on GitPulse.</p>
        </div>

        {isLoading && (
          <div className="text-center py-16 text-white/25 animate-pulse text-sm">Loading...</div>
        )}

        {data && data.length === 0 && (
          <div className="text-center py-16 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <p className="text-white/40 text-sm">No public profiles yet.</p>
          </div>
        )}

        {data && data.length > 0 && (
          <div className="space-y-2">
            {data.map((entry, i) => {
              const rank = i + 1
              const badge = getBadge(entry.impact_score)
              const style = RANK_STYLES[rank]
              const isMe = me?.login === entry.login

              return (
                <Link
                  key={entry.login}
                  to={`/u/${entry.login}`}
                  className="flex items-center gap-4 rounded-2xl border px-4 py-3.5 transition-all hover:border-emerald-500/20 group"
                  style={{
                    background: style?.bg ?? 'rgba(255,255,255,0.02)',
                    borderColor: style?.border ?? (isMe ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'),
                  }}
                >
                  {/* Rank */}
                  <div className="w-8 shrink-0 text-center">
                    {style ? (
                      <span className="text-lg">{style.label}</span>
                    ) : (
                      <span className="text-sm font-bold text-white/20">{rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <img
                    src={entry.avatar_url}
                    alt={entry.login}
                    className="w-9 h-9 rounded-xl ring-1 ring-white/10 shrink-0 group-hover:ring-emerald-500/30 transition-all"
                  />

                  {/* Name + badge */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white truncate">
                        {entry.name || entry.login}
                      </span>
                      {isMe && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold shrink-0">
                          you
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px]">{badge.emoji}</span>
                      <span className="text-[10px] font-semibold" style={{ color: badge.colors.accent + 'cc' }}>
                        {badge.name}
                      </span>
                      <span className="text-[10px] text-white/20">·</span>
                      <span className="text-[10px] text-white/25 font-mono">@{entry.login}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <p className="text-xs font-bold text-white/40">{entry.total_prs}</p>
                      <p className="text-[9px] text-white/20 uppercase tracking-wider">PRs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-white/40">🔥 {entry.current_streak}d</p>
                      <p className="text-[9px] text-white/20 uppercase tracking-wider">Streak</p>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="shrink-0 text-right ml-2">
                    <p
                      className="text-xl font-black"
                      style={{ color: style?.text ?? badge.colors.accent }}
                    >
                      {entry.impact_score}
                    </p>
                    <p className="text-[9px] text-white/20 uppercase tracking-wider">score</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {!isAuthenticated() && (
          <div className="mt-10 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-6 text-center">
            <p className="text-white font-semibold text-sm mb-1">See where you rank</p>
            <p className="text-white/30 text-xs mb-4">Sign in with GitHub to track your impact score and appear on the leaderboard.</p>
            <a
              href="/auth/github"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold px-5 py-2 rounded-xl transition-colors"
            >
              Sign in with GitHub
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

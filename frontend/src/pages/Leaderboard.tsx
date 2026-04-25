import { useState, useMemo } from 'react'
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

type SortKey = 'score' | 'prs' | 'streak'

const SORT_OPTS: { key: SortKey; label: string }[] = [
  { key: 'score', label: 'Impact Score' },
  { key: 'prs',   label: 'Most PRs'     },
  { key: 'streak',label: 'Streak'       },
]

const PODIUM_CFG = {
  1: { baseH: 80, avatarSz: 64, medal: '🥇', color: '#fde047', ring: 'rgba(253,224,71,0.45)', gradFrom: '#fde04712', gradTo: '#fde04704' },
  2: { baseH: 52, avatarSz: 52, medal: '🥈', color: '#cbd5e1', ring: 'rgba(203,213,225,0.35)', gradFrom: '#cbd5e112', gradTo: '#cbd5e104' },
  3: { baseH: 36, avatarSz: 44, medal: '🥉', color: '#fb923c', ring: 'rgba(251,146,60,0.35)',  gradFrom: '#fb923c12', gradTo: '#fb923c04' },
} as const

const LIST_MEDAL: Record<number, { emoji: string; text: string; bg: string; border: string }> = {
  1: { emoji: '🥇', text: '#fde047', bg: 'rgba(253,224,71,0.05)',   border: 'rgba(253,224,71,0.22)'  },
  2: { emoji: '🥈', text: '#cbd5e1', bg: 'rgba(203,213,225,0.04)', border: 'rgba(203,213,225,0.18)' },
  3: { emoji: '🥉', text: '#fb923c', bg: 'rgba(251,146,60,0.05)',  border: 'rgba(251,146,60,0.18)'  },
}

function PodiumSlot({ entry, rank }: { entry: LeaderboardEntry; rank: 1 | 2 | 3 }) {
  const cfg = PODIUM_CFG[rank]
  const badge = getBadge(entry.impact_score)
  return (
    <div className="flex flex-col items-center flex-1 min-w-0" style={{ maxWidth: rank === 1 ? 168 : 136 }}>
      <Link to={`/u/${entry.login}`} className="flex flex-col items-center gap-1.5 group w-full mb-3">
        <div className="relative">
          <img
            src={entry.avatar_url}
            alt={entry.login}
            className="rounded-2xl object-cover transition-transform duration-200 group-hover:scale-105"
            style={{ width: cfg.avatarSz, height: cfg.avatarSz, boxShadow: `0 0 0 2.5px ${cfg.ring}` }}
          />
          <span className="absolute -top-3 -right-3 text-xl drop-shadow">{cfg.medal}</span>
        </div>
        <p className="text-white font-bold text-xs sm:text-sm text-center leading-snug truncate w-full px-2 mt-1">
          {entry.name || entry.login}
        </p>
        <p className="text-[10px] text-white/30 font-mono">@{entry.login}</p>
        <div className="flex items-center gap-1 text-[10px]">
          <span>{badge.emoji}</span>
          <span style={{ color: badge.colors.accent + 'bb' }}>{badge.name}</span>
        </div>
        <p className="font-black text-lg sm:text-2xl mt-0.5" style={{ color: cfg.color }}>
          {entry.impact_score}
        </p>
      </Link>
      {/* Podium base */}
      <div
        className="w-full rounded-t-xl border-t border-l border-r"
        style={{
          height: cfg.baseH,
          borderColor: cfg.ring,
          background: `linear-gradient(to bottom, ${cfg.gradFrom}, ${cfg.gradTo})`,
        }}
      />
    </div>
  )
}

export function Leaderboard() {
  const { data: me } = useMe()
  const [search, setSearch]   = useState('')
  const [sortBy, setSortBy]   = useState<SortKey>('score')

  const { data, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard'],
    queryFn: () => api.get('/leaderboard').then((r) => r.data),
    staleTime: 60_000,
  })

  // Official score-rank (always by impact_score)
  const scoreRanked = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.impact_score - a.impact_score),
    [data],
  )

  const myScoreRank = useMemo(() => {
    if (!me) return 0
    const idx = scoreRanked.findIndex((e) => e.login === me.login)
    return idx === -1 ? 0 : idx + 1
  }, [me, scoreRanked])

  const myEntry = useMemo(
    () => scoreRanked.find((e) => e.login === me?.login),
    [me, scoreRanked],
  )

  // Filtered + sorted display list
  const filtered = useMemo(() => {
    let list = [...(data ?? [])]
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((e) => e.login.toLowerCase().includes(q) || e.name.toLowerCase().includes(q))
    switch (sortBy) {
      case 'prs':    list.sort((a, b) => b.total_prs - a.total_prs);          break
      case 'streak': list.sort((a, b) => b.current_streak - a.current_streak); break
      default:       list.sort((a, b) => b.impact_score - a.impact_score)
    }
    return list
  }, [data, search, sortBy])

  const topValue = useMemo(() => {
    if (!filtered.length) return 1
    switch (sortBy) {
      case 'prs':    return Math.max(filtered[0].total_prs, 1)
      case 'streak': return Math.max(filtered[0].current_streak, 1)
      default:       return Math.max(filtered[0].impact_score, 1)
    }
  }, [filtered, sortBy])

  const showPodium = !search.trim() && sortBy === 'score' && filtered.length >= 3
  const listEntries = showPodium ? filtered.slice(3) : filtered

  function barPct(e: LeaderboardEntry): number {
    switch (sortBy) {
      case 'prs':    return (e.total_prs / topValue) * 100
      case 'streak': return (e.current_streak / topValue) * 100
      default:       return (e.impact_score / topValue) * 100
    }
  }

  function primaryStat(e: LeaderboardEntry): { value: string; label: string } {
    switch (sortBy) {
      case 'prs':    return { value: String(e.total_prs),      label: 'PRs'   }
      case 'streak': return { value: `${e.current_streak}d`,   label: 'Streak'}
      default:       return { value: String(e.impact_score),   label: 'Score' }
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar user={isAuthenticated() ? me : undefined} />

      <div className="w-full px-4 sm:px-6 lg:px-10 py-8 sm:py-10 max-w-screen-xl mx-auto">

        {/* Page header */}
        <div className="mb-6">
          <p className="text-[10px] text-emerald-400/50 uppercase tracking-[0.3em] font-semibold mb-2">Community</p>
          <div className="flex items-end justify-between flex-wrap gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Leaderboard</h1>
            {data && (
              <span className="text-white/25 text-xs font-mono">
                {data.length} contributor{data.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-white/30 text-sm mt-1">All public contributors ranked by impact.</p>
        </div>

        {/* Your rank card */}
        {isAuthenticated() && myEntry && myScoreRank > 0 && (
          <Link
            to={`/u/${myEntry.login}`}
            className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3 mb-6 hover:bg-emerald-500/[0.07] transition-colors group"
          >
            <img
              src={myEntry.avatar_url}
              alt={myEntry.login}
              className="w-9 h-9 rounded-xl ring-1 ring-emerald-500/30 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold">
                You are ranked{' '}
                <span className="text-emerald-400">#{myScoreRank}</span>
                {' '}of {scoreRanked.length}
              </p>
              <p className="text-white/30 text-xs mt-0.5">
                {myEntry.impact_score} impact · {myEntry.total_prs} PRs · 🔥 {myEntry.current_streak}d streak
              </p>
            </div>
            <span className="text-white/25 text-xs shrink-0 group-hover:text-emerald-400 transition-colors">
              View profile →
            </span>
          </Link>
        )}

        {/* Search + Sort controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or username..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/40 focus:bg-white/[0.05] transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 text-xl leading-none transition-colors"
              >
                ×
              </button>
            )}
          </div>

          {/* Sort tabs */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 shrink-0">
            {SORT_OPTS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  sortBy === opt.key
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/25'
                    : 'text-white/35 hover:text-white/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-16 text-white/25 animate-pulse text-sm">Loading...</div>
        )}

        {/* Empty */}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <p className="text-white/40 text-sm">
              {search ? `No contributors matching "${search}"` : 'No public profiles yet.'}
            </p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                Clear search
              </button>
            )}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <>
            {/* Podium — top 3 when sorting by score with no search */}
            {showPodium && (
              <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.015] px-4 sm:px-8 pt-10 pb-0 mb-3 overflow-hidden">
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 50% 120%, rgba(16,185,129,0.15) 0%, transparent 70%)',
                  }}
                />
                <div className="flex items-end justify-center gap-2 sm:gap-6 relative">
                  {/* #2 — left */}
                  <PodiumSlot entry={filtered[1]} rank={2} />
                  {/* #1 — center */}
                  <PodiumSlot entry={filtered[0]} rank={1} />
                  {/* #3 — right */}
                  <PodiumSlot entry={filtered[2]} rank={3} />
                </div>
              </div>
            )}

            {/* Ranked list */}
            <div className="space-y-1.5">
              {listEntries.map((entry, i) => {
                const rank   = showPodium ? i + 4 : i + 1
                const medal  = LIST_MEDAL[rank]
                const badge  = getBadge(entry.impact_score)
                const isMe   = me?.login === entry.login
                const stat   = primaryStat(entry)
                const pct    = barPct(entry)

                return (
                  <Link
                    key={entry.login}
                    to={`/u/${entry.login}`}
                    className="relative flex items-center gap-2 sm:gap-3 rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 transition-all hover:border-emerald-500/20 overflow-hidden group"
                    style={{
                      background: medal?.bg ?? (isMe ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)'),
                      borderColor: medal?.border ?? (isMe ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'),
                    }}
                  >
                    {/* Score bar */}
                    <div
                      className="absolute bottom-0 left-0 h-[2px]"
                      style={{
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                        opacity: 0.35,
                        transition: 'width 0.5s ease',
                      }}
                    />

                    {/* Rank */}
                    <div className="w-6 sm:w-7 shrink-0 text-center">
                      {medal ? (
                        <span className="text-base leading-none">{medal.emoji}</span>
                      ) : (
                        <span className="text-xs font-bold text-white/20">{rank}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <img
                      src={entry.avatar_url}
                      alt={entry.login}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl ring-1 ring-white/10 shrink-0 group-hover:ring-emerald-500/30 transition-all"
                    />

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-white truncate">
                          {entry.name || entry.login}
                        </span>
                        {isMe && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold shrink-0">
                            you
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px]">{badge.emoji}</span>
                        <span className="text-[10px] font-semibold" style={{ color: badge.colors.accent + 'bb' }}>
                          {badge.name}
                        </span>
                        <span className="text-[10px] text-white/15 hidden sm:inline">·</span>
                        <span className="text-[10px] text-white/25 font-mono hidden sm:inline">@{entry.login}</span>
                        <span className="text-[10px] text-white/15">·</span>
                        <span className="text-[10px] text-white/35 font-mono">🔀 {entry.total_prs}</span>
                        <span className="text-[10px] text-white/35 font-mono">🔥 {entry.current_streak}d</span>
                      </div>
                    </div>

                    {/* Primary stat (changes with sort) */}
                    <div className="shrink-0 text-right ml-1">
                      <p
                        className="text-base sm:text-lg font-black tabular-nums"
                        style={{ color: medal?.text ?? (isMe ? '#34d399' : 'rgba(255,255,255,0.65)') }}
                      >
                        {stat.value}
                      </p>
                      <p className="text-[9px] text-white/20 uppercase tracking-wider">{stat.label}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {/* Unauthenticated CTA */}
        {!isAuthenticated() && (
          <div className="mt-10 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-5 sm:p-6 text-center">
            <p className="text-white font-semibold text-sm mb-1">See where you rank</p>
            <p className="text-white/30 text-xs mb-4">
              Sign in with GitHub to track your impact score and appear on the leaderboard.
            </p>
            <a
              href="/auth/github"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              Sign in with GitHub
            </a>
          </div>
        )}

      </div>
    </div>
  )
}

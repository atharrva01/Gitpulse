import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useMe } from '../lib/hooks'
import { Navbar } from '../components/Navbar'

interface WatchedRepo {
  id: number
  repo_full_name: string
  added_at: string
}

interface Contributor {
  login: string
  avatar_url: string
  pr_count_30d: number
  pr_count_90d: number
  last_pr_at: string | null
  is_stale: boolean
}

interface StalePR {
  number: number
  title: string
  author_login: string
  html_url: string
  opened_at: string
  days_open: number
}

interface MaintainerDashboard {
  repo: WatchedRepo
  contributors: Contributor[]
  stale_prs: StalePR[]
  total_open_prs: number
}

function daysAgo(date: string | null): string {
  if (!date) return 'never'
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (d === 0) return 'today'
  if (d === 1) return '1d ago'
  return `${d}d ago`
}

function staleBadge(days: number): { label: string; cls: string } {
  if (days > 30) return { label: 'Stale', cls: 'bg-red-500/10 text-red-400 border-red-500/20' }
  if (days > 14) return { label: 'Aging', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' }
  return { label: 'Active', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
}

function RepoDashboard({ id }: { id: number }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<MaintainerDashboard>({
    queryKey: ['maint-dash', id],
    queryFn: () => api.get(`/maintainer/repos/${id}/dashboard`).then((r) => r.data),
  })
  const refresh = useMutation({
    mutationFn: () => api.post(`/maintainer/repos/${id}/refresh`),
    onSuccess: () => setTimeout(() => qc.invalidateQueries({ queryKey: ['maint-dash', id] }), 5000),
  })

  if (isLoading) return <div className="text-white/30 text-sm animate-pulse py-8 text-center">Loading dashboard...</div>
  if (!data) return null

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-base">
            <a href={`https://github.com/${data.repo.repo_full_name}`} target="_blank" rel="noreferrer"
              className="hover:text-emerald-400 transition-colors font-mono">{data.repo.repo_full_name}</a>
          </h2>
          <p className="text-white/30 text-sm mt-0.5">{data.total_open_prs} open PRs</p>
        </div>
        <button
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="text-xs bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {refresh.isPending ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      <div>
        <p className="text-[10px] text-white/25 font-semibold uppercase tracking-widest mb-4">Contributors</p>
        {!data.contributors?.length ? (
          <p className="text-white/25 text-sm">No contributor data — refresh to fetch.</p>
        ) : (
          <div className="space-y-2">
            {data.contributors.map((c) => {
              const daysSince = c.last_pr_at
                ? Math.floor((Date.now() - new Date(c.last_pr_at).getTime()) / 86400000)
                : 9999
              const { label, cls } = staleBadge(daysSince)
              return (
                <div key={c.login} className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3">
                  <img src={c.avatar_url} alt={c.login} className="w-8 h-8 rounded-xl ring-1 ring-white/10 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <a href={`https://github.com/${c.login}`} target="_blank" rel="noreferrer"
                      className="text-white font-semibold text-sm hover:text-emerald-400 transition-colors">{c.login}</a>
                    <p className="text-white/25 text-xs">Last PR {daysAgo(c.last_pr_at)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-white/30 text-xs"><span className="font-bold text-white">{c.pr_count_30d}</span> PRs/30d</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <p className="text-[10px] text-white/25 font-semibold uppercase tracking-widest mb-4">
          Open PRs {data.stale_prs?.length ? `(${data.stale_prs.length})` : ''}
        </p>
        {!data.stale_prs?.length ? (
          <p className="text-white/25 text-sm">No open PRs — refresh to fetch latest.</p>
        ) : (
          <div className="space-y-1">
            {data.stale_prs.slice(0, 20).map((pr) => {
              const { label, cls } = staleBadge(pr.days_open)
              return (
                <div key={pr.number} className="py-3 flex items-start gap-3 border-b border-white/[0.03] last:border-0">
                  <div className="flex-1 min-w-0">
                    <a href={pr.html_url} target="_blank" rel="noreferrer"
                      className="text-sm text-white/70 hover:text-white font-medium transition-colors">
                      #{pr.number} {pr.title}
                    </a>
                    <p className="text-xs text-white/25 mt-0.5 font-mono">by @{pr.author_login}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-white/25">{pr.days_open}d open</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export function Maintainer() {
  const { data: me } = useMe()
  const qc = useQueryClient()
  const [selected, setSelected] = useState<number | null>(null)
  const [addInput, setAddInput] = useState('')
  const [addError, setAddError] = useState('')

  const { data: repos } = useQuery<WatchedRepo[]>({
    queryKey: ['watched-repos'],
    queryFn: () => api.get('/maintainer/repos').then((r) => r.data),
  })

  const add = useMutation({
    mutationFn: (repo: string) => api.post('/maintainer/repos', { repo }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['watched-repos'] })
      setAddInput('')
      setAddError('')
      setSelected(res.data.id)
    },
    onError: (err: any) => {
      setAddError(err.response?.data?.error ?? 'Failed to add repo')
    },
  })

  const remove = useMutation({
    mutationFn: (repo: string) => api.delete(`/maintainer/repos/${encodeURIComponent(repo)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watched-repos'] })
      setSelected(null)
    },
  })

  const watchedCount = repos?.length ?? 0

  return (
    <div className="min-h-screen">
      <Navbar user={me} />

      <div className="w-full px-4 sm:px-6 lg:px-10 py-8 sm:py-10 max-w-screen-2xl mx-auto">
        <div className="mb-8">
          <p className="text-[10px] text-emerald-400/50 uppercase tracking-[0.3em] font-semibold mb-2">Maintainer</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Repo Dashboard</h1>
          <p className="text-white/30 text-sm mt-1">Track contributor health and stale PRs across your repos.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <p className="text-white font-bold text-xs uppercase tracking-widest">Watched</p>
                <span className="text-[10px] text-white/25 font-mono">{watchedCount}/3</span>
              </div>

              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    value={addInput}
                    onChange={(e) => setAddInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && addInput) add.mutate(addInput.trim()) }}
                    placeholder="owner/repo"
                    className="flex-1 bg-white/[0.03] border border-white/[0.08] text-white text-xs rounded-lg px-3 py-2 placeholder-white/20 focus:outline-none focus:border-emerald-500/40 transition-colors"
                  />
                  <button
                    onClick={() => addInput && add.mutate(addInput.trim())}
                    disabled={add.isPending || watchedCount >= 3}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-40 font-bold"
                  >
                    +
                  </button>
                </div>
                {addError && <p className="text-red-400 text-xs mt-1.5">{addError}</p>}
                {watchedCount >= 3 && <p className="text-amber-400/60 text-xs mt-1.5">Free tier: 3 repos max.</p>}
              </div>

              {!repos?.length ? (
                <p className="text-white/25 text-xs">No repos watched yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {repos.map((r) => (
                    <div
                      key={r.id}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${selected === r.id ? 'bg-emerald-500/10 border border-emerald-500/25' : 'bg-white/[0.02] border border-transparent hover:border-white/[0.06]'}`}
                      onClick={() => setSelected(r.id)}
                    >
                      <span className="text-xs text-white font-mono truncate">{r.repo_full_name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); remove.mutate(r.repo_full_name) }}
                        className="text-white/25 hover:text-red-400 text-lg leading-none ml-2 shrink-0 transition-colors"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main */}
          <div className="lg:col-span-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
            {selected ? (
              <RepoDashboard id={selected} />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-center">
                <p className="text-white/50 text-base font-semibold mb-2">Select a repo</p>
                <p className="text-white/25 text-sm">Add a repo you maintain using the panel on the left.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

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
  if (days > 30) return { label: 'Stale', cls: 'bg-red-500/20 text-red-400 border-red-500/30' }
  if (days > 14) return { label: 'Aging', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' }
  return { label: 'Active', cls: 'bg-green-500/20 text-green-400 border-green-500/30' }
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

  if (isLoading) return <div className="text-gray-400 text-sm animate-pulse py-8 text-center">Loading dashboard...</div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">
            <a href={`https://github.com/${data.repo.repo_full_name}`} target="_blank" rel="noreferrer" className="hover:text-blue-400">
              {data.repo.repo_full_name}
            </a>
          </h2>
          <p className="text-gray-400 text-sm">{data.total_open_prs} open PRs</p>
        </div>
        <button
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {refresh.isPending ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {/* Contributors */}
      <div>
        <h3 className="text-gray-300 font-medium text-sm mb-3 uppercase tracking-widest">Contributors</h3>
        {!data.contributors?.length ? (
          <p className="text-gray-500 text-sm">No contributor data yet — refresh to fetch.</p>
        ) : (
          <div className="space-y-2">
            {data.contributors.map((c) => {
              const { label, cls } = staleBadge(c.is_stale ? 60 : 10)
              return (
                <div key={c.login} className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-4 py-3">
                  <img src={c.avatar_url} alt={c.login} className="w-8 h-8 rounded-full border border-gray-600" />
                  <div className="flex-1 min-w-0">
                    <a
                      href={`https://github.com/${c.login}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-white font-medium text-sm hover:text-blue-400"
                    >
                      {c.login}
                    </a>
                    <p className="text-gray-400 text-xs">Last PR {daysAgo(c.last_pr_at)}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-300"><span className="font-bold text-white">{c.pr_count_30d}</span> PRs / 30d</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Open / stale PRs */}
      <div>
        <h3 className="text-gray-300 font-medium text-sm mb-3 uppercase tracking-widest">
          Open PRs {data.stale_prs?.length ? `(${data.stale_prs.length})` : ''}
        </h3>
        {!data.stale_prs?.length ? (
          <p className="text-gray-500 text-sm">No open PRs — or refresh to fetch latest.</p>
        ) : (
          <div className="divide-y divide-gray-700">
            {data.stale_prs.slice(0, 20).map((pr) => {
              const { label, cls } = staleBadge(pr.days_open)
              return (
                <div key={pr.number} className="py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <a
                      href={pr.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                    >
                      #{pr.number} {pr.title}
                    </a>
                    <p className="text-xs text-gray-500 mt-0.5">by @{pr.author_login}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">{pr.days_open}d open</span>
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
    <div className="min-h-screen bg-gray-950">
      <Navbar user={me} />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Maintainer Dashboard</h1>
          <p className="text-gray-400 text-sm">Monitor contributor health and stale PRs across your repos.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar — watched repos list */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold text-sm">Watched Repos</h2>
                <span className="text-xs text-gray-500">{watchedCount} / 3 free</span>
              </div>

              {/* Add repo */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    value={addInput}
                    onChange={(e) => setAddInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && addInput) add.mutate(addInput.trim()) }}
                    placeholder="owner/repo"
                    className="flex-1 bg-gray-800 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => addInput && add.mutate(addInput.trim())}
                    disabled={add.isPending || watchedCount >= 3}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                {addError && <p className="text-red-400 text-xs mt-1">{addError}</p>}
                {watchedCount >= 3 && (
                  <p className="text-yellow-500 text-xs mt-1">Free tier: 3 repos max.</p>
                )}
              </div>

              {/* List */}
              {!repos?.length ? (
                <p className="text-gray-500 text-sm">No repos watched yet.</p>
              ) : (
                <div className="space-y-2">
                  {repos.map((r) => (
                    <div
                      key={r.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selected === r.id ? 'bg-purple-600/20 border border-purple-500/40' : 'bg-gray-800 hover:bg-gray-750 border border-transparent'}`}
                      onClick={() => setSelected(r.id)}
                    >
                      <span className="text-sm text-white font-mono truncate">{r.repo_full_name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); remove.mutate(r.repo_full_name) }}
                        className="text-gray-500 hover:text-red-400 text-lg leading-none ml-2 shrink-0"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main panel */}
          <div className="lg:col-span-2 bg-gray-900 border border-gray-700 rounded-xl p-6">
            {selected ? (
              <RepoDashboard id={selected} />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-gray-400 text-lg mb-2">Select a repo to view its dashboard</p>
                <p className="text-gray-600 text-sm">Or add a repo you maintain using the panel on the left.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

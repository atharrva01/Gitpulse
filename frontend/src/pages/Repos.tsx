import { useRepos, useReviewLatency, useMe } from '../lib/hooks'
import { RepoTable } from '../components/RepoTable'
import { Navbar } from '../components/Navbar'

function fmtHours(seconds: number): string {
  if (seconds === 0) return '—'
  const hours = seconds / 3600
  if (hours < 1) return `${Math.round(seconds / 60)}m`
  if (hours < 48) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

export function Repos() {
  const { data: me } = useMe()
  const { data: repos, isLoading } = useRepos()
  const { data: latency } = useReviewLatency()

  return (
    <div className="min-h-screen">
      <Navbar user={me} />

      <div className="w-full px-4 sm:px-6 lg:px-10 py-8 sm:py-10 max-w-screen-2xl mx-auto">
        <div className="mb-8">
          <p className="text-[10px] text-emerald-400/50 uppercase tracking-[0.3em] font-semibold mb-2">Analytics</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Repository Breakdown</h1>
          <p className="text-white/30 text-sm mt-1">Every repo you've shipped to, ranked by PR count.</p>
        </div>

        {latency && latency.count > 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 mb-6">
            <p className="text-white font-bold text-xs uppercase tracking-widest mb-1">Review Latency</p>
            <p className="text-white/30 text-xs mb-5">How fast you respond as a reviewer ({latency.count} reviews analyzed)</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Median', value: fmtHours(latency.median) },
                { label: 'p75', value: fmtHours(latency.p75) },
                { label: 'p95', value: fmtHours(latency.p95) },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-4 text-center">
                  <p className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-2">{s.label}</p>
                  <p className="text-xl sm:text-2xl font-black text-emerald-400">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <p className="text-white font-bold text-xs uppercase tracking-widest mb-5">All Repositories</p>
          {isLoading ? (
            <p className="text-white/25 text-sm animate-pulse">Loading...</p>
          ) : (
            <RepoTable repos={repos || []} />
          )}
        </div>
      </div>
    </div>
  )
}

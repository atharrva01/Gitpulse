import type { RepoStats } from '../lib/api'

function fmt(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function fmtLines(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

interface RepoTableProps {
  repos: RepoStats[]
}

export function RepoTable({ repos }: RepoTableProps) {
  if (!repos || repos.length === 0) {
    return <p className="text-white/25 text-sm py-4">No repository data yet — sync to load.</p>
  }
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="text-left border-b border-white/[0.04]">
            <th className="pb-3 pr-4 text-[10px] text-white/25 uppercase tracking-widest font-semibold">Repository</th>
            <th className="pb-3 pr-4 text-[10px] text-white/25 uppercase tracking-widest font-semibold text-right">PRs</th>
            <th className="pb-3 pr-4 text-[10px] text-white/25 uppercase tracking-widest font-semibold text-right">Reviews</th>
            <th className="pb-3 pr-4 text-[10px] text-white/25 uppercase tracking-widest font-semibold text-right">Lines</th>
            <th className="pb-3 pr-4 text-[10px] text-white/25 uppercase tracking-widest font-semibold text-right hidden sm:table-cell">First</th>
            <th className="pb-3 text-[10px] text-white/25 uppercase tracking-widest font-semibold text-right hidden sm:table-cell">Last</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {repos.map((r) => (
            <tr key={r.repo_full_name} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-3 pr-4 font-mono text-xs">
                <a
                  href={`https://github.com/${r.repo_full_name}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/50 hover:text-emerald-400 transition-colors"
                >
                  {r.repo_full_name}
                </a>
              </td>
              <td className="py-3 pr-4 text-right text-white font-semibold">{r.pr_count}</td>
              <td className="py-3 pr-4 text-right text-white/40">{r.review_count}</td>
              <td className="py-3 pr-4 text-right font-mono text-xs">
                <span className="text-emerald-400">+{fmtLines(r.total_additions)}</span>{' '}
                <span className="text-red-400">-{fmtLines(r.total_deletions)}</span>
              </td>
              <td className="py-3 pr-4 text-right text-white/25 text-xs hidden sm:table-cell">{fmt(r.first_contrib)}</td>
              <td className="py-3 text-right text-white/25 text-xs hidden sm:table-cell">{fmt(r.last_contrib)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

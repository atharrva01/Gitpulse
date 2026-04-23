import type { RepoStats } from '../lib/api'

function fmt(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

interface RepoTableProps {
  repos: RepoStats[]
}

export function RepoTable({ repos }: RepoTableProps) {
  if (!repos || repos.length === 0) {
    return <p className="text-gray-500 text-sm py-4">No repository data yet.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-700">
            <th className="pb-2 font-medium">Repository</th>
            <th className="pb-2 font-medium text-right">PRs</th>
            <th className="pb-2 font-medium text-right">Reviews</th>
            <th className="pb-2 font-medium text-right">Lines</th>
            <th className="pb-2 font-medium text-right hidden sm:table-cell">First Contrib</th>
            <th className="pb-2 font-medium text-right hidden sm:table-cell">Last Contrib</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {repos.map((r) => (
            <tr key={r.repo_full_name} className="hover:bg-gray-800/30 transition-colors">
              <td className="py-3 font-mono text-blue-400 text-xs">
                <a
                  href={`https://github.com/${r.repo_full_name}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-300"
                >
                  {r.repo_full_name}
                </a>
              </td>
              <td className="py-3 text-right text-white">{r.pr_count}</td>
              <td className="py-3 text-right text-gray-300">{r.review_count}</td>
              <td className="py-3 text-right text-gray-300 font-mono text-xs">
                <span className="text-green-400">+{r.total_additions}</span>{' '}
                <span className="text-red-400">-{r.total_deletions}</span>
              </td>
              <td className="py-3 text-right text-gray-500 hidden sm:table-cell">{fmt(r.first_contrib)}</td>
              <td className="py-3 text-right text-gray-500 hidden sm:table-cell">{fmt(r.last_contrib)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

import type { PullRequest } from '../lib/api'

function fmt(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function diffColor(additions: number, deletions: number): string {
  const net = additions - deletions
  if (net > 0) return 'text-green-400'
  if (net < 0) return 'text-red-400'
  return 'text-gray-400'
}

interface PRListProps {
  prs: PullRequest[]
}

export function PRList({ prs }: PRListProps) {
  if (!prs || prs.length === 0) {
    return <p className="text-gray-500 text-sm py-4">No merged PRs yet. Sync to load your data.</p>
  }
  return (
    <div className="divide-y divide-gray-700">
      {prs.map((pr) => (
        <div key={pr.github_pr_id} className="py-3 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <a
              href={pr.html_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300 font-medium truncate block"
            >
              {pr.title}
            </a>
            <p className="text-xs text-gray-500 mt-0.5">
              {pr.repo_full_name} · #{pr.number} · {fmt(pr.merged_at)}
            </p>
          </div>
          <div className={`text-xs font-mono shrink-0 ${diffColor(pr.additions, pr.deletions)}`}>
            +{pr.additions} -{pr.deletions}
          </div>
        </div>
      ))}
    </div>
  )
}

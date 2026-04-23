import type { PullRequest } from '../lib/api'

function fmt(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface PRListProps {
  prs: PullRequest[]
}

export function PRList({ prs }: PRListProps) {
  if (!prs || prs.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-white/25 text-sm">No merged PRs yet — hit sync to load your data.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {prs.map((pr) => (
        <div key={pr.github_pr_id} className="group flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.03] transition-colors">
          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <a
              href={pr.html_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-white/80 hover:text-white font-medium truncate block transition-colors"
            >
              {pr.title}
            </a>
            <p className="text-xs text-white/25 mt-0.5 font-mono">
              {pr.repo_full_name} · #{pr.number} · {fmt(pr.merged_at)}
            </p>
          </div>
          <div className="text-xs font-mono shrink-0 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-emerald-400">+{pr.additions}</span>
            <span className="text-red-400">-{pr.deletions}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

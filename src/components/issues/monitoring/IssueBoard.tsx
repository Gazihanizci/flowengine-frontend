import type { Issue } from '../../../types/issue'
import { normalizeIssueStatus, STATUS_OPTIONS } from './constants'
import { StatusBadge } from './StatusBadge'
import { IssueCard } from './IssueCard'

export function IssueBoard({ issues, onSelect }: { issues: Issue[]; onSelect: (issueId: string) => void }) {
  const grouped = STATUS_OPTIONS.map((status) => ({
    status,
    items: issues.filter((issue) => normalizeIssueStatus(String(issue.status)) === status),
  }))

  const columnBorderClass: Record<string, string> = {
    TODO: 'border-t-4 border-t-slate-300 dark:border-t-slate-600',
    IN_PROGRESS: 'border-t-4 border-t-blue-500',
    REVIEW: 'border-t-4 border-t-amber-500',
    DONE: 'border-t-4 border-t-emerald-500',
    REJECTED: 'border-t-4 border-t-rose-500',
  }

  return (
    <div className="pb-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 items-start">
        {grouped.map((group) => (
          <section 
            key={group.status} 
            className={`min-w-0 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-900/45 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow ${columnBorderClass[group.status] ?? ''}`}
          >
            <header className="mb-4 flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/60">
              <StatusBadge status={group.status} />
              <span className="rounded-full bg-slate-200/50 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                {group.items.length}
              </span>
            </header>
            <div className="space-y-3">
              {group.items.map((issue) => (
                <IssueCard key={issue.id} issue={issue} onSelect={onSelect} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

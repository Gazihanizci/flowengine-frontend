import type { Issue } from '../../../types/issue'
import { normalizeIssueStatus, STATUS_OPTIONS } from './constants'
import { StatusBadge } from './StatusBadge'
import { IssueCard } from './IssueCard'

export function IssueBoard({ issues, onSelect }: { issues: Issue[]; onSelect: (issueId: string) => void }) {
  const grouped = STATUS_OPTIONS.map((status) => ({
    status,
    items: issues.filter((issue) => normalizeIssueStatus(String(issue.status)) === status),
  }))

  return (
    <div className="pb-2">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {grouped.map((group) => (
          <section key={group.status} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <header className="mb-3 flex items-center justify-between">
              <StatusBadge status={group.status} />
              <span className="text-xs text-slate-500">{group.items.length}</span>
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

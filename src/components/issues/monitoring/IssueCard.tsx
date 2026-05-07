import { motion } from 'framer-motion'
import type { Issue } from '../../../types/issue'
import { PriorityBadge } from './PriorityBadge'

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('tr-TR')
}

function initials(name?: string) {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return `${first}${second}`.toUpperCase() || 'U'
}

export function IssueCard({ issue, onSelect }: { issue: Issue; onSelect: (issueId: string) => void }) {
  const owner = issue.currentOwner?.name || issue.assignedUserName || 'Atanmadi'
  return (
    <motion.button
      whileHover={{ y: -2 }}
      className="w-full rounded-2xl border border-slate-300 bg-white p-4 text-left transition hover:border-blue-400 hover:shadow-md"
      onClick={() => onSelect(String(issue.id))}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <PriorityBadge priority={issue.priority} />
        <span className="text-xs font-medium text-slate-500">#ISS-{issue.id}</span>
      </div>
      <p className="line-clamp-2 text-xl font-semibold text-slate-900">{issue.title}</p>
      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{issue.description || '-'}</p>

      <div className="mt-4 border-t border-slate-200 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700">
              {initials(owner)}
            </span>
            <span className="text-sm text-slate-800">{owner}</span>
          </div>
          <span className="text-xs text-slate-500">{formatDate(issue.lastActivityAt || issue.updatedAt || issue.createdAt)}</span>
        </div>
      </div>
    </motion.button>
  )
}

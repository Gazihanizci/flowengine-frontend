import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import type { Issue } from '../../../types/issue'
import { PriorityBadge } from './PriorityBadge'

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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
      className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-200 hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90"
      onClick={() => onSelect(String(issue.id))}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <PriorityBadge priority={issue.priority} />
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">#ISS-{issue.id}</span>
      </div>
      <p className="line-clamp-2 text-sm font-bold text-slate-850 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400 transition-colors duration-150">{issue.title}</p>
      {issue.description ? (
        <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{issue.description}</p>
      ) : null}

      <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-[10px] font-bold text-white shadow-sm shadow-blue-500/10">
              {initials(owner)}
            </span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{owner}</span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1 shrink-0">
            <Clock className="h-3 w-3" />
            <span>{formatDate(issue.lastActivityAt || issue.updatedAt || issue.createdAt)}</span>
          </span>
        </div>
      </div>
    </motion.button>
  )
}

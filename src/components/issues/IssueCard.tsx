import { Link } from 'react-router-dom'
import type { Issue } from '../../types/issue'

interface IssueCardProps {
  issue: Issue
}

const STATUS_LABEL_MAP: Record<string, string> = {
  TODO: 'Acik',
  IN_PROGRESS: 'Devam Ediyor',
  REVIEW: 'Incelemede',
  DONE: 'Cozuldu',
  REJECTED: 'Reddedildi',
}

const PRIORITY_LABEL_MAP: Record<string, string> = {
  LOW: 'Dusuk',
  MEDIUM: 'Orta',
  HIGH: 'Yuksek',
}

function toStatusClass(status: string) {
  return status.toLowerCase().replace(/_/g, '-')
}

function resolvePriority(priority: unknown) {
  if (typeof priority !== 'string' || !priority.trim()) {
    return 'MEDIUM'
  }
  return priority.toUpperCase()
}

function IssueCard({ issue }: IssueCardProps) {
  const statusValue = String(issue.status ?? '')
  const statusClass = toStatusClass(statusValue)
  const priorityValue = resolvePriority(issue.priority)
  const priorityClass = priorityValue.toLowerCase()
  const statusLabel = STATUS_LABEL_MAP[statusValue] ?? statusValue
  const priorityLabel = PRIORITY_LABEL_MAP[priorityValue] ?? priorityValue

  return (
    <article className={`issue-card status-${statusClass}`}>
      <header className="issue-card-head">
        <span className={`issue-chip priority-${priorityClass}`}>
          Oncelik: {priorityLabel}
        </span>
        <span className="issue-chip neutral">#{issue.id}</span>
      </header>

      <h3 className="issue-card-title">
        <Link to={`/issues/${issue.id}`} className="auth-link">
          {issue.title}
        </Link>
      </h3>

      <div className="issue-card-meta">
        <span className={`issue-chip status ${statusClass}`}>
          {statusLabel}
        </span>
        <span className="issue-chip user">U: {issue.assignedUserName ?? '-'}</span>
      </div>
    </article>
  )
}

export default IssueCard

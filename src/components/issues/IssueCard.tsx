import { Link } from 'react-router-dom'
import type { Issue } from '../../types/issue'

interface IssueCardProps {
  issue: Issue
}

function IssueCard({ issue }: IssueCardProps) {
  const statusLabelMap: Record<string, string> = {
    OPEN: 'Acik',
    IN_PROGRESS: 'Devam Ediyor',
    RESOLVED: 'Cozuldu',
    CLOSED: 'Kapali',
  }

  const priorityLabelMap: Record<string, string> = {
    LOW: 'Dusuk',
    MEDIUM: 'Orta',
    HIGH: 'Yuksek',
  }

  return (
    <article className={`issue-card status-${String(issue.status).toLowerCase()}`}>
      <header className="issue-card-head">
        <span className={`issue-chip priority-${String(issue.priority ?? 'MEDIUM').toLowerCase()}`}>
          Oncelik: {priorityLabelMap[String(issue.priority ?? 'MEDIUM')] ?? String(issue.priority ?? 'MEDIUM')}
        </span>
        <span className="issue-chip neutral">#{issue.id}</span>
      </header>

      <h3 className="issue-card-title">
        <Link to={`/issues/${issue.id}`} className="auth-link">
          {issue.title}
        </Link>
      </h3>

      <div className="issue-card-meta">
        <span className={`issue-chip status ${String(issue.status).toLowerCase()}`}>
          {statusLabelMap[issue.status] ?? issue.status}
        </span>
        <span className="issue-chip user">Atanan: {issue.assignedUserId ?? '-'}</span>
      </div>
    </article>
  )
}

export default IssueCard

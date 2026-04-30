import type { Issue } from '../../types/issue'
import IssueCard from './IssueCard'

interface IssueListProps {
  issues: Issue[]
  mode: 'all' | 'my'
}

function IssueList({ issues, mode }: IssueListProps) {
  if (issues.length === 0) {
    return <p className="hint">Issue bulunamadi.</p>
  }

  return (
    <div className={`issue-grid ${mode === 'my' ? 'my-mode' : ''}`}>
      {issues.map((issue) => (
        <IssueCard key={issue.id} issue={issue} />
      ))}
    </div>
  )
}

export default IssueList

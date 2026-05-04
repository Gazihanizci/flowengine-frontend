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

  const columns = [
    { key: 'OPEN', title: 'ACIK' },
    { key: 'IN_PROGRESS', title: 'DEVAM EDIYOR' },
    { key: 'RESOLVED', title: 'COZULDU' },
    { key: 'CLOSED', title: 'KAPALI' },
  ] as const

  type GroupItem = {
    key: string
    title: string
    items: Issue[]
  }

  const grouped: GroupItem[] = columns.map((column) => ({
    ...column,
    items: issues.filter((issue) => String(issue.status).toUpperCase() === column.key),
  }))

  const uncategorized = issues.filter(
    (issue) => !columns.some((column) => column.key === String(issue.status).toUpperCase()),
  )

  if (uncategorized.length > 0) {
    grouped.push({
      key: 'OTHER',
      title: 'DIGER',
      items: uncategorized,
    })
  }

  return (
    <div className={`issue-board ${mode === 'my' ? 'my-mode' : ''}`}>
      {grouped.map((group) => (
        <section key={group.key} className="issue-column">
          <header className="issue-column-head">
            <strong>{group.title}</strong>
            <span>{group.items.length}</span>
          </header>
          <div className="issue-column-body">
            {group.items.length === 0 ? <p className="hint">Kart yok</p> : null}
            {group.items.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default IssueList

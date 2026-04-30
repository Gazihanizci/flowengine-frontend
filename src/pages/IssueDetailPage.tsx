import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import CommentSection from '../components/CommentSection'
import { addComment, getComments } from '../api/issueApi'
import {
  assignIssueUser,
  fetchIssueById,
  fetchIssueHistory,
  updateIssueStatus,
} from '../services/issueApi'
import type { Issue, IssueComment, IssueHistoryItem, IssueStatus } from '../types/issue'

const statusOptions: IssueStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
const assignOptions = [1, 2, 3]
const statusLabelMap: Record<string, string> = {
  OPEN: 'Acik',
  IN_PROGRESS: 'Devam Ediyor',
  RESOLVED: 'Cozuldu',
  CLOSED: 'Kapali',
}

function IssueDetailPage() {
  const { id } = useParams()
  const issueId = useMemo(() => id ?? '', [id])

  const [issue, setIssue] = useState<Issue | null>(null)
  const [comments, setComments] = useState<IssueComment[]>([])
  const [history, setHistory] = useState<IssueHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState('')
  const [statusSaving, setStatusSaving] = useState(false)
  const [assignSaving, setAssignSaving] = useState(false)

  const loadComments = async (numericIssueId: number) => {
    setCommentsLoading(true)
    setCommentsError('')
    try {
      const data = await getComments(numericIssueId)
      setComments(Array.isArray(data) ? data : [])
    } catch (loadError) {
      setCommentsError(loadError instanceof Error ? loadError.message : 'Yorumlar yuklenemedi.')
    } finally {
      setCommentsLoading(false)
    }
  }

  useEffect(() => {
    const loadDetail = async () => {
      if (!issueId) return
      const numericIssueId = Number(issueId)
      if (!Number.isFinite(numericIssueId)) {
        setError('Gecersiz issueId.')
        return
      }

      setLoading(true)
      setError('')
      try {
        const [issueData, historyData] = await Promise.all([
          fetchIssueById(issueId),
          fetchIssueHistory(issueId),
        ])
        setIssue(issueData)
        setHistory(historyData)
        await loadComments(numericIssueId)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Issue detayi yuklenemedi.')
      } finally {
        setLoading(false)
      }
    }
    void loadDetail()
  }, [issueId])

  const handleStatusChange = async (nextStatus: IssueStatus) => {
    if (!issueId) return
    setStatusSaving(true)
    try {
      const updated = await updateIssueStatus(issueId, nextStatus)
      setIssue(updated)
    } finally {
      setStatusSaving(false)
    }
  }

  const handleAssignChange = async (nextAssignedUserId: number) => {
    if (!issueId) return
    setAssignSaving(true)
    try {
      const updated = await assignIssueUser(issueId, nextAssignedUserId)
      setIssue(updated)
    } finally {
      setAssignSaving(false)
    }
  }

  const handleAddComment = async (message: string) => {
    if (!issueId) return
    const numericIssueId = Number(issueId)
    if (!Number.isFinite(numericIssueId)) {
      throw new Error('Gecersiz issueId.')
    }

    await addComment(numericIssueId, message)
    await loadComments(numericIssueId)
  }

  if (loading) {
    return (
      <div className="content">
        <p className="hint">Issue yukleniyor...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="content">
        <p className="error-text">{error}</p>
      </div>
    )
  }

  if (!issue) {
    return (
      <div className="content">
        <p className="hint">Issue bulunamadi.</p>
      </div>
    )
  }

  return (
    <div className="content" style={{ display: 'grid', gap: 16 }}>
      <section className="panel">
        <div className="panel-header">
          <h2>{issue.title}</h2>
          <span>Issue #{issue.id}</span>
        </div>
        <p>{issue.description ?? '-'}</p>
        <div style={{ display: 'grid', gap: 10, maxWidth: 320 }}>
          <label className="form-label">
            Durum
            <select
              className="input"
              value={issue.status}
              onChange={(event) => void handleStatusChange(event.target.value)}
              disabled={statusSaving}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {statusLabelMap[status] ?? status}
                </option>
              ))}
            </select>
          </label>
          <label className="form-label">
            Kullanici Ata
            <select
              className="input"
              value={Number(issue.assignedUserId ?? assignOptions[0])}
              onChange={(event) => void handleAssignChange(Number(event.target.value))}
              disabled={assignSaving}
            >
              {assignOptions.map((userId) => (
                <option key={userId} value={userId}>
                  Kullanici {userId}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <CommentSection
        comments={comments}
        loading={commentsLoading}
        error={commentsError}
        onAddComment={handleAddComment}
      />

      <section className="panel">
        <div className="panel-header">
          <h2>Gecmis</h2>
        </div>
        {history.length === 0 && <p className="hint">Gecmis kaydi bulunamadi.</p>}
        {history.map((item, index) => (
          <article key={item.id ?? index} className="card">
            <strong>{item.action ?? item.field ?? 'Guncelleme'}</strong>
            <p style={{ margin: '4px 0' }}>
              {item.oldValue ?? '-'} {'->'} {item.newValue ?? '-'}
            </p>
            <small className="hint">{item.changedAt ?? ''}</small>
          </article>
        ))}
      </section>
    </div>
  )
}

export default IssueDetailPage

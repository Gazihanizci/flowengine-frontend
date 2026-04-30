import { useState, type FormEvent } from 'react'
import type { IssueComment } from '../../types/issue'

interface CommentSectionProps {
  comments: IssueComment[]
  onAddComment: (comment: string) => Promise<void>
}

function CommentSection({ comments, onAddComment }: CommentSectionProps) {
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = comment.trim()
    if (!trimmed) return
    setSubmitting(true)
    try {
      await onAddComment(trimmed)
      setComment('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Yorumlar</h2>
      </div>
      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        {comments.length === 0 && <p className="hint">Henuz yorum yok.</p>}
        {comments.map((item) => (
          <article key={item.id} className="card">
            <p style={{ margin: 0 }}>{item.message}</p>
            <small className="hint">{item.createdAt}</small>
          </article>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <label className="form-label">
          Yorum Ekle
          <textarea
            className="input"
            value={comment}
            rows={3}
            onChange={(event) => setComment(event.target.value)}
            required
          />
        </label>
        <button className="button" type="submit" disabled={submitting}>
          {submitting ? 'Gonderiliyor...' : 'Yorum Gonder'}
        </button>
      </form>
    </section>
  )
}

export default CommentSection

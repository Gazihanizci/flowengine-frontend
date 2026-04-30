import { useState, type FormEvent } from 'react'
import type { IssueComment } from '../types/issue'

interface CommentSectionProps {
  comments: IssueComment[]
  loading: boolean
  error: string
  onAddComment: (message: string) => Promise<void>
}

function CommentSection({ comments, loading, error, onAddComment }: CommentSectionProps) {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) return

    setSubmitting(true)
    setSubmitError('')
    try {
      await onAddComment(trimmed)
      setMessage('')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Yorum eklenemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Yorumlar</h2>
      </div>

      {loading ? <p className="hint">Yorumlar yukleniyor...</p> : null}
      {!loading && comments.length === 0 ? <p className="hint">Henüz yorum yok</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {submitError ? <p className="error-text">{submitError}</p> : null}

      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
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
            value={message}
            rows={3}
            onChange={(event) => setMessage(event.target.value)}
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

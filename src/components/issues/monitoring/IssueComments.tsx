import { useState } from 'react'
import type { IssueComment } from '../../../types/issue'

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('tr-TR')
}

export function IssueComments({ comments, onSend, sending }: { comments: IssueComment[]; onSend: (message: string) => void; sending: boolean }) {
  const [message, setMessage] = useState('')

  return (
    <div>
      <div className="mb-3 space-y-2">
        {comments.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">{item.user?.name || 'Kullanıcı'} · {formatDate(item.createdAt)}</p>
            <p className="text-sm text-slate-900">{item.message}</p>
          </div>
        ))}
      </div>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            const trimmed = message.trim()
            if (!trimmed) return
            setMessage('')
            onSend(trimmed)
          }
        }}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
        placeholder="Yorum yaz ve Enter ile gönder"
        rows={3}
      />
      {sending ? <p className="mt-2 text-xs text-slate-500">Yorum gönderiliyor...</p> : null}
    </div>
  )
}

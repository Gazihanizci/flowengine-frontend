import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react'
import type { IssueActivity } from '../../../types/issue'

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('tr-TR')
}

export function IssueTimeline({ activities }: { activities: IssueActivity[] }) {
  if (!activities.length) return <p className="text-sm text-slate-500">Zaman tüneli boş.</p>

  return (
    <div className="space-y-3">
      {activities.map((item, index) => (
        <motion.div key={`${item.createdAt}-${index}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="mt-1">
            {item.type.includes('COMPLETED') ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : item.type.includes('REJECT') ? <AlertCircle className="h-4 w-4 text-rose-500" /> : <Clock3 className="h-4 w-4 text-sky-500" />}
          </div>
          <div>
            <p className="text-sm text-slate-900">{item.message}</p>
            <p className="text-xs text-slate-500">{item.userName || `Kullanıcı ${item.userId || '-'}`} · {formatDate(item.createdAt)} · {item.workflowStep || '-'}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

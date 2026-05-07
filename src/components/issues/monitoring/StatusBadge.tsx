import { STATUS_COLOR_CLASS, STATUS_LABELS } from './constants'

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-medium ${STATUS_COLOR_CLASS[status] ?? 'bg-slate-100 text-slate-700 border-slate-300'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

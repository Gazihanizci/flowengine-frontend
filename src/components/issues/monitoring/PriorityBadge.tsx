import { PRIORITY_COLOR_CLASS } from './constants'

export function PriorityBadge({ priority }: { priority?: string }) {
  const value = priority || 'MEDIUM'
  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-medium ${PRIORITY_COLOR_CLASS[value] ?? 'bg-slate-100 text-slate-700 border-slate-300'}`}>
      {value}
    </span>
  )
}

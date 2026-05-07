import { AlertCircle, CheckCircle2, Circle, Clock3 } from 'lucide-react'
import type { Issue } from '../../../types/issue'

function getProgress(issue: Issue) {
  if (typeof issue.progress === 'number') return Math.max(0, Math.min(100, issue.progress))
  const steps = issue.workflow?.steps ?? []
  if (!steps.length) return 0
  const done = steps.filter((step) => step.status === 'DONE').length
  return Math.round((done / steps.length) * 100)
}

export function WorkflowTracker({ issue }: { issue: Issue }) {
  const progress = getProgress(issue)

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-xs text-slate-500">Workflow Durumu</p>
        <p className="text-sm text-slate-900">{issue.workflow?.status || issue.status}</p>
        <div className="mt-2 h-2 rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} /></div>
      </div>
      {(issue.workflow?.steps ?? []).map((step) => (
        <div key={step.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 text-sm text-slate-900">
            {step.status === 'DONE' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : step.status === 'ACTIVE' ? <Clock3 className="h-4 w-4 text-sky-500" /> : step.status === 'REJECTED' ? <AlertCircle className="h-4 w-4 text-rose-500" /> : <Circle className="h-4 w-4 text-slate-400" />}
            <span>{step.name}</span>
          </div>
          <span className="text-xs text-slate-500">{step.owner?.name || '-'}</span>
        </div>
      ))}
    </div>
  )
}

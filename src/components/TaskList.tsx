import { useMemo } from 'react'
import type { WorkflowTask } from '../types/task'

interface TaskListProps {
  tasks: WorkflowTask[]
  loading: boolean
  error: string | null
  onSelectTask: (task: WorkflowTask) => void
  onRetry: () => void
}

interface TaskGroup {
  flowName: string
  tasks: WorkflowTask[]
}

function toFlowName(task: WorkflowTask) {
  return task.akisAdi?.trim() || 'Akis adi belirtilmedi'
}

export default function TaskList({ tasks, loading, error, onSelectTask, onRetry }: TaskListProps) {
  const groupedTasks = useMemo<TaskGroup[]>(() => {
    const map = new Map<string, WorkflowTask[]>()

    tasks.forEach((task) => {
      const flowName = toFlowName(task)
      const group = map.get(flowName)
      if (group) {
        group.push(task)
      } else {
        map.set(flowName, [task])
      }
    })

    return Array.from(map.entries())
      .map(([flowName, items]) => ({
        flowName,
        tasks: items.sort((a, b) => b.taskId - a.taskId),
      }))
      .sort((a, b) => a.flowName.localeCompare(b.flowName, 'tr'))
  }, [tasks])

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Inbox</p>
          <h2 className="text-lg font-semibold text-slate-900">Gorevlerim (Akis Bazli)</h2>
        </div>
        <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700">{tasks.length}</span>
      </div>

      {loading ? (
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
          Yukleniyor...
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white"
            onClick={onRetry}
          >
            Tekrar dene
          </button>
        </div>
      ) : null}

      {!loading && !error && tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
          Gorev bulunamadi
        </div>
      ) : null}

      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {groupedTasks.map((group) => (
          <div key={group.flowName} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">{group.flowName}</p>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">{group.tasks.length} gorev</span>
            </div>

            <div className="space-y-2">
              {group.tasks.map((task) => (
                <button
                  key={task.taskId}
                  type="button"
                  onClick={() => onSelectTask(task)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-cyan-300 hover:bg-cyan-50"
                >
                  <p className="text-sm font-semibold text-slate-900">{task.adimAdi}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Task ID: {task.taskId} | Surec ID: {task.surecId}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

import type { WorkflowTask } from '../types/task'

interface TaskListProps {
  tasks: WorkflowTask[]
  selectedTaskId: number | null
  loading: boolean
  error: string | null
  onSelectTask: (task: WorkflowTask) => void
  onRetry: () => void
}

export default function TaskList({
  tasks,
  selectedTaskId,
  loading,
  error,
  onSelectTask,
  onRetry,
}: TaskListProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Inbox</p>
          <h2 className="text-lg font-semibold text-slate-900">Gorevlerim</h2>
        </div>
        <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700">
          {tasks.length}
        </span>
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

      <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
        {tasks.map((task, index) => {
          const isSelected = selectedTaskId === task.taskId

          return (
            <div key={task.taskId} className="relative">
              {index < tasks.length - 1 ? (
                <span className="pointer-events-none absolute left-4 top-10 h-[calc(100%+8px)] w-px bg-slate-200" />
              ) : null}
              <button
                type="button"
                onClick={() => onSelectTask(task)}
                className={`relative flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                  isSelected
                    ? 'border-cyan-300 bg-cyan-50/80 shadow-[0_8px_20px_rgba(8,145,178,0.16)]'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    isSelected ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-900">{task.adimAdi}</span>
                  <span className="mt-1 block text-sm text-slate-500">Task ID: {task.taskId}</span>
                </span>
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

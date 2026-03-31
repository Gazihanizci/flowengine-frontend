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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Gorevlerim</h2>
        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
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

      <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
        {tasks.map((task) => {
          const isSelected = selectedTaskId === task.taskId

          return (
            <button
              key={task.taskId}
              type="button"
              onClick={() => onSelectTask(task)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                isSelected
                  ? 'border-sky-400 bg-sky-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50'
              }`}
            >
              <p className="font-semibold text-slate-900">{task.adimAdi}</p>
              <p className="mt-1 text-sm text-slate-500">Task ID: {task.taskId}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}

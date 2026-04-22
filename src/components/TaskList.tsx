import type { WorkflowTask } from '../types/task'

interface TaskListProps {
  tasks: WorkflowTask[]
  loading: boolean
  error: string | null
  onSelectTask: (task: WorkflowTask) => void
  onRetry: () => void
}

function toFlowName(task: WorkflowTask) {
  return task.akisAdi?.trim() || 'Akis adi belirtilmedi'
}

export default function TaskList({ tasks, loading, error, onSelectTask, onRetry }: TaskListProps) {
  const sortedTasks = [...tasks].sort((a, b) => b.taskId - a.taskId)

  return (
    <section className="task-inbox">
      <div className="task-inbox-head">
        <div>
          <p className="task-kicker">Execution Queue</p>
          <h2>Gorev Formlari</h2>
        </div>
        <div className="task-inbox-count">
          <strong>{tasks.length}</strong>
          <span>Aktif Kayit</span>
        </div>
      </div>

      {loading ? (
        <div className="task-list-state">
          <span className="task-spinner" />
          Yukleniyor...
        </div>
      ) : null}

      {error ? (
        <div className="task-list-error">
          <p>{error}</p>
          <button
            type="button"
            className="button reject"
            onClick={onRetry}
          >
            Tekrar dene
          </button>
        </div>
      ) : null}

      {!loading && !error && tasks.length === 0 ? (
        <div className="task-list-empty">
          Gorev bulunamadi
        </div>
      ) : null}

      <div className="task-list-grid">
        {sortedTasks.map((task) => (
          <button
            key={task.taskId}
            type="button"
            onClick={() => onSelectTask(task)}
            className="task-list-card"
          >
            <div className="task-list-card-top">
              <p>{toFlowName(task)}</p>
              <span>Task #{task.taskId}</span>
            </div>
            <div className="task-list-card-meta">
              <span>Surec #{task.surecId}</span>
              <span>Adim {task.adimId}</span>
              <span className="task-chip">Yanit Bekleniyor</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

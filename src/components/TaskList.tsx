import { useMemo, useState } from 'react'
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
  const [searchTerm, setSearchTerm] = useState('')
  const [sortType, setSortType] = useState<'LATEST' | 'OLDEST'>('LATEST')

  const filteredTasks = useMemo(() => {
    const normalized = searchTerm.trim().toLocaleLowerCase('tr-TR')
    const base = tasks.filter((task) => {
      if (!normalized) return true
      const flowName = toFlowName(task).toLocaleLowerCase('tr-TR')
      return (
        flowName.includes(normalized) ||
        String(task.taskId).includes(normalized) ||
        String(task.surecId).includes(normalized) ||
        String(task.adimId).includes(normalized)
      )
    })

    return [...base].sort((a, b) => (sortType === 'LATEST' ? b.taskId - a.taskId : a.taskId - b.taskId))
  }, [searchTerm, sortType, tasks])

  return (
    <section className="task-inbox">
      <div className="task-inbox-head">
        <div>
          <p className="task-kicker">Execution Queue</p>
          <h2>Gorev Formlari</h2>
        </div>
        <div className="task-inbox-count">
          <strong>{filteredTasks.length}</strong>
          <span>Aktif Kayit</span>
        </div>
      </div>

      <div className="task-toolbar">
        <label className="task-search">
          <span>Gorev Ara</span>
          <input
            className="input"
            type="search"
            value={searchTerm}
            placeholder="Task ID, surec ID, akis adi..."
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
        <div className="task-sort-group">
          <button
            type="button"
            className={`task-sort-chip ${sortType === 'LATEST' ? 'active' : ''}`}
            onClick={() => setSortType('LATEST')}
          >
            En Yeni
          </button>
          <button
            type="button"
            className={`task-sort-chip ${sortType === 'OLDEST' ? 'active' : ''}`}
            onClick={() => setSortType('OLDEST')}
          >
            En Eski
          </button>
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

      {!loading && !error && filteredTasks.length === 0 ? (
        <div className="task-list-empty">
          {tasks.length === 0 ? 'Gorev bulunamadi' : 'Arama kriterine uygun gorev bulunamadi'}
        </div>
      ) : null}

      <div className="task-list-grid">
        {filteredTasks.map((task) => (
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

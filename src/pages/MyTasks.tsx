import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TaskList from '../components/TaskList'
import { fetchMyTasks } from '../services/taskApi'
import type { WorkflowTask } from '../types/task'

function isActionableTask(task: WorkflowTask) {
  const hasEditableField = Array.isArray(task.form) && task.form.some((field) => field.editable)
  const hasAction = Array.isArray(task.actions) && task.actions.length > 0
  return hasEditableField || hasAction
}

export default function MyTasks() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<WorkflowTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTasks = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchMyTasks()
      const taskList = Array.isArray(data) ? data.filter(isActionableTask) : []
      setTasks(taskList)
    } catch {
      setError('Gorevler alinamadi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const uniqueFlowCount = useMemo(() => {
    const flowNames = new Set(tasks.map((task) => task.akisAdi?.trim() || 'Akis adi belirtilmedi'))
    return flowNames.size
  }, [tasks])

  const handleOpenTask = (task: WorkflowTask) => {
    navigate(`/tasks/${task.taskId}`)
  }

  return (
    <div className="task-page">
      <section className="task-hero">
        <div className="task-hero-inner">
          <p className="task-kicker">Operational Workspace</p>
          <h1>Workflow Task Inbox</h1>
          <p>
            Bu listede sadece akis adi ve durum gorunur. Bir kayda tikladiginizda mevcut step detayi acilir.
          </p>
          <div className="task-hero-metrics">
            <div>
              <p>Toplam Gorev</p>
              <strong>{tasks.length}</strong>
            </div>
            <div>
              <p>Toplam Akis</p>
              <strong>{uniqueFlowCount}</strong>
            </div>
            <div>
              <p>Aksiyon</p>
              <strong className="task-action-label">Kart secimi ile devam edin</strong>
            </div>
          </div>
        </div>
      </section>

      <TaskList tasks={tasks} loading={loading} error={error} onSelectTask={handleOpenTask} onRetry={loadTasks} />
    </div>
  )
}

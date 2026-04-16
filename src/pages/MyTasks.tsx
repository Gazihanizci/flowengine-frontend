import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TaskList from '../components/TaskList'
import { fetchMyTasks } from '../services/taskApi'
import type { WorkflowTask } from '../types/task'

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
      const taskList = Array.isArray(data) ? data : []
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
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-[0_20px_45px_rgba(2,6,23,0.35)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-400/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-sky-500/20 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Operational Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Workflow Task Inbox</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Gorevler akis adina gore gruplanir. Bir goreve tiklandiginda form, ayri detay sayfasinda acilir.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-300">Toplam Gorev</p>
              <p className="mt-1 text-2xl font-semibold">{tasks.length}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-300">Toplam Akis</p>
              <p className="mt-1 text-2xl font-semibold">{uniqueFlowCount}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-300">Aksiyon</p>
              <p className="mt-1 text-sm font-medium">Form icin gorev kartina tiklayin</p>
            </div>
          </div>
        </div>
      </div>

      <TaskList tasks={tasks} loading={loading} error={error} onSelectTask={handleOpenTask} onRetry={loadTasks} />
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TaskList from '../components/TaskList'
import { fetchMyTasks } from '../services/taskApi'
import type { WorkflowTask } from '../types/task'
import { Briefcase, Layers, Info, ListTodo } from 'lucide-react'

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
      setError('Görev listesi alınamadı. Lütfen bağlantınızı kontrol edin.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const uniqueFlowCount = useMemo(() => {
    const flowNames = new Set(tasks.map((task) => task.akisAdi?.trim() || 'Tanımlanmamış Akış'))
    return flowNames.size
  }, [tasks])

  const handleOpenTask = (task: WorkflowTask) => {
    navigate(`/tasks/${task.taskId}`)
  }

  return (
    <div className="space-y-6">
      {/* Premium Dashboard Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-[0_20px_45px_rgba(2,6,23,0.35)] dark:border-slate-900">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
            <Briefcase className="h-3 w-3" />
            Operational Workspace
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Workflow Task Inbox</h1>
          <p className="mt-1.5 text-sm text-slate-300 max-w-2xl leading-relaxed">
            Bu listede yalnızca aktif ve üzerinde aksiyon alabileceğiniz görev formları listelenir. 
            Detayları görüntülemek ve form alanlarını doldurmak için ilgili karta tıklayabilirsiniz.
          </p>

          {/* Metrics Grid Widgets */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <ListTodo className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Toplam Görev</p>
                <strong className="text-lg font-black text-white">{tasks.length}</strong>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Toplam Akış</p>
                <strong className="text-lg font-black text-white">{uniqueFlowCount}</strong>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Aksiyon</p>
                <strong className="text-xs font-bold text-slate-200">Seçim yaparak ilerleyin</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Task List Section */}
      <TaskList tasks={tasks} loading={loading} error={error} onSelectTask={handleOpenTask} onRetry={loadTasks} />
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import TaskForm from '../components/TaskForm'
import TaskList from '../components/TaskList'
import { fetchMyTasks, submitTaskAction } from '../services/taskApi'
import type { TaskFormData, TaskFormValue, WorkflowTask } from '../types/task'

function resolveInitialValue(field: WorkflowTask['form'][number]): TaskFormValue {
  if (field.value !== undefined) {
    return field.value
  }

  return field.type === 'CHECKBOX' ? false : ''
}

function createInitialFormData(task: WorkflowTask): TaskFormData {
  const initialData: TaskFormData = {}

  task.form.forEach((field) => {
    initialData[field.fieldId] = resolveInitialValue(field)
  })

  return initialData
}

function buildEditableFormData(task: WorkflowTask, formData: TaskFormData): TaskFormData {
  const payload: TaskFormData = {}

  task.form.forEach((field) => {
    if (!field.editable) {
      return
    }

    payload[field.fieldId] = formData[field.fieldId] ?? resolveInitialValue(field)
  })

  return payload
}

export default function MyTasks() {
  const [tasks, setTasks] = useState<WorkflowTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [formData, setFormData] = useState<TaskFormData>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const selectedTask = useMemo(
    () => tasks.find((task) => task.taskId === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  )
  const editableCount = selectedTask ? selectedTask.form.filter((field) => field.editable).length : 0
  const readonlyCount = selectedTask ? selectedTask.form.length - editableCount : 0

  const loadTasks = async (autoSelectFirst = true) => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchMyTasks()
      const taskList = Array.isArray(data) ? data : []
      setTasks(taskList)

      if (taskList.length === 0) {
        setSelectedTaskId(null)
        setFormData({})
        return
      }

      if (!autoSelectFirst) {
        setSelectedTaskId(null)
        setFormData({})
        return
      }

      const activeTask = taskList.find((task) => task.taskId === selectedTaskId) ?? taskList[0]
      setSelectedTaskId(activeTask.taskId)
      setFormData(createInitialFormData(activeTask))
    } catch (requestError) {
      setError('Gorevler alinamadi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  useEffect(() => {
    if (!successMessage) return

    const timer = window.setTimeout(() => setSuccessMessage(null), 2500)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  const handleSelectTask = (task: WorkflowTask) => {
    setSelectedTaskId(task.taskId)
    setSubmitError(null)
    setFormData(createInitialFormData(task))
  }

  const handleChangeField = (fieldId: number, value: TaskFormValue) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }))
  }

  const handleSubmitAction = async (aksiyonId: number) => {
    if (!selectedTask) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      await submitTaskAction(selectedTask.taskId, {
        aksiyonId,
        formData: buildEditableFormData(selectedTask, formData),
      })

      setSuccessMessage('Islem basariyla tamamlandi.')
      await loadTasks(false)
    } catch (requestError) {
      setSubmitError('Aksiyon gonderilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-[0_20px_45px_rgba(2,6,23,0.35)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-400/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-sky-500/20 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Operational Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Workflow Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Gorev adimini sec, sadece sana ait alanlari guncelle ve sureci kontrollu sekilde ilerlet.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-300">Toplam Gorev</p>
              <p className="mt-1 text-2xl font-semibold">{tasks.length}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-300">Secili Task</p>
              <p className="mt-1 text-2xl font-semibold">{selectedTask ? selectedTask.taskId : '-'}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-300">Duzenlenebilir Alan</p>
              <p className="mt-1 text-2xl font-semibold">{editableCount}</p>
            </div>
          </div>
        </div>
      </div>

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[340px,1fr]">
        <TaskList
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          loading={loading}
          error={error}
          onSelectTask={handleSelectTask}
          onRetry={loadTasks}
        />

        <TaskForm
          task={selectedTask}
          formData={formData}
          submitError={submitError}
          submitting={submitting}
          onChangeField={handleChangeField}
          onSubmitAction={handleSubmitAction}
        />
      </div>

      {selectedTask ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
          <strong className="font-semibold text-slate-800">Sistem Ozeti:</strong> Toplam {selectedTask.form.length} alanin{' '}
          {editableCount} adedi kullaniciya atanmis, {readonlyCount} adedi salt okunur.
        </div>
      ) : null}
    </div>
  )
}

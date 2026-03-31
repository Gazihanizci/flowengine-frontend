import { useEffect, useMemo, useState } from 'react'
import TaskForm from '../components/TaskForm'
import TaskList from '../components/TaskList'
import { fetchMyTasks, submitTaskAction } from '../services/taskApi'
import type { TaskFormData, WorkflowTask } from '../types/task'

function createInitialFormData(task: WorkflowTask): TaskFormData {
  const initialData: TaskFormData = {}

  task.form.forEach((field) => {
    initialData[field.fieldId] = field.type === 'CHECKBOX' ? false : ''
  })

  return initialData
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

  const loadTasks = async () => {
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

  const handleChangeField = (fieldId: number, value: TaskFormData[number]) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }))
  }

  const handleSubmitAction = async (aksiyonId: 1 | 2) => {
    if (!selectedTask) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      await submitTaskAction(selectedTask.taskId, {
        aksiyonId,
        formData,
      })

      setSuccessMessage('Islem basariyla tamamlandi.')
      await loadTasks()
    } catch (requestError) {
      setSubmitError('Aksiyon gonderilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">My Tasks</h1>
        <p className="mt-1 text-sm text-slate-600">`/api/mytasks` endpointinden gelen gorevler.</p>
      </div>

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
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
    </div>
  )
}

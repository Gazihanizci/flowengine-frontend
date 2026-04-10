import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import TaskForm from '../components/TaskForm'
import TaskList from '../components/TaskList'
import { fetchMyTasks, submitTaskAction } from '../services/taskApi'
import { fetchMe } from '../services/userApi'
import { useUserStore } from '../store/userStore'
import type { TaskFileMap, TaskFormData, TaskFormValue, WorkflowTask } from '../types/task'
import { validateTaskForm } from '../utils/taskValidation'

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

function buildEditableFiles(task: WorkflowTask, files: TaskFileMap): TaskFileMap {
  const payload: TaskFileMap = {}

  task.form.forEach((field) => {
    if (!field.editable || field.type !== 'FILE') {
      return
    }

    const file = files[field.fieldId]
    if (file) {
      payload[field.fieldId] = file
    }
  })

  return payload
}

export default function MyTasks() {
  const navigate = useNavigate()
  const user = useUserStore((state) => state.user)
  const setUser = useUserStore((state) => state.setUser)
  const [tasks, setTasks] = useState<WorkflowTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [formData, setFormData] = useState<TaskFormData>({})
  const [files, setFiles] = useState<TaskFileMap>({})
  const [loadingAction, setLoadingAction] = useState<'save' | 'submit' | 'cancel' | null>(null)
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
        setFiles({})
        return
      }

      if (!autoSelectFirst) {
        setSelectedTaskId(null)
        setFormData({})
        setFiles({})
        return
      }

      const activeTask = taskList.find((task) => task.taskId === selectedTaskId) ?? taskList[0]
      setSelectedTaskId(activeTask.taskId)
      setFormData(createInitialFormData(activeTask))
      setFiles({})
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
    setFiles({})
  }

  const handleChangeField = (fieldId: number, value: TaskFormValue) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }))
  }

  const handleChangeFile = (fieldId: number, file: File | null) => {
    setFiles((prev) => {
      const next = { ...prev }
      if (file) {
        next[fieldId] = file
      } else {
        delete next[fieldId]
      }
      return next
    })

    setFormData((prev) => {
      const next = { ...prev }
      if (file) {
        next[fieldId] = file.name
      } else {
        next[fieldId] = ''
      }
      return next
    })
  }

  const handleSubmitAction = async (aksiyonId: 1 | 2 | 3) => {
    if (!selectedTask) return

    if (aksiyonId === 1) {
      const validationError = validateTaskForm(selectedTask, formData)
      if (validationError) {
        setSubmitError(validationError)
        return
      }
    }

    setLoadingAction(aksiyonId === 2 ? 'save' : aksiyonId === 3 ? 'cancel' : 'submit')
    setSubmitError(null)

    try {
      const payload = buildEditableFormData(selectedTask, formData)
      const filePayload = buildEditableFiles(selectedTask, files)
      const hasFile = Object.keys(filePayload).length > 0

      let userId = user?.kullaniciId
      if (hasFile && !userId) {
        const token = localStorage.getItem('auth_token')
        if (token) {
          const me = await fetchMe(token)
          const meUser = Array.isArray(me) ? (me[0] ?? null) : null
          if (meUser) {
            setUser(meUser)
            userId = meUser.kullaniciId
          }
        }
      }

      if (hasFile && !userId) {
        throw new Error('Dosya yuklemek icin kullanici bilgisi bulunamadi.')
      }

      await submitTaskAction(selectedTask.taskId, payload, aksiyonId, filePayload, {
        surecId: selectedTask.surecId,
        adimId: selectedTask.adimId,
        userId: userId ?? 0,
      })

      if (aksiyonId === 2) {
        setSuccessMessage(
          hasFile ? `Taslak basariyla kaydedildi. ${'\u{1F4CE}'} Dosyalar yuklendi.` : 'Taslak basariyla kaydedildi.',
        )
        await loadTasks(true)
      } else if (aksiyonId === 3) {
        setSuccessMessage('Form basariyla iptal edildi.')
        navigate('/')
      } else {
        setSuccessMessage(
          hasFile ? `Form basariyla gonderildi. ${'\u{1F4CE}'} Dosyalar yuklendi.` : 'Form basariyla gonderildi.',
        )
        navigate('/')
      }
    } catch (requestError) {
      const runtimeMessage = requestError instanceof Error ? requestError.message : null
      const apiMessage = axios.isAxiosError(requestError)
        ? ((requestError.response?.data?.message ||
            requestError.response?.data?.error ||
            requestError.response?.data?.detail) as string | undefined)
        : null
      const status = axios.isAxiosError(requestError) ? requestError.response?.status : undefined

      setSubmitError(
        runtimeMessage ??
        apiMessage ??
          `${aksiyonId === 2 ? 'Kaydetme islemi basarisiz oldu.' : aksiyonId === 3 ? 'Iptal islemi basarisiz oldu.' : 'Gonderim islemi basarisiz oldu.'}${
            status ? ` (HTTP ${status})` : ''
          }`,
      )
    } finally {
      setLoadingAction(null)
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
          files={files}
          submitError={submitError}
          loadingAction={loadingAction}
          onChangeField={handleChangeField}
          onChangeFile={handleChangeFile}
          onSave={() => handleSubmitAction(2)}
          onSubmit={() => handleSubmitAction(1)}
          onCancel={() => handleSubmitAction(3)}
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

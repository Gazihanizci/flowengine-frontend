import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import TaskForm from '../components/TaskForm'
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

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const user = useUserStore((state) => state.user)
  const setUser = useUserStore((state) => state.setUser)
  const [tasks, setTasks] = useState<WorkflowTask[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<'save' | 'submit' | 'cancel' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState<TaskFormData>({})
  const [files, setFiles] = useState<TaskFileMap>({})

  const numericTaskId = Number(taskId)

  const selectedTask = useMemo(
    () => tasks.find((task) => task.taskId === numericTaskId) ?? null,
    [tasks, numericTaskId],
  )

  const editableCount = selectedTask ? selectedTask.form.filter((field) => field.editable).length : 0
  const readonlyCount = selectedTask ? selectedTask.form.length - editableCount : 0

  const loadTasks = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchMyTasks()
      const taskList = Array.isArray(data) ? data : []
      setTasks(taskList)
    } catch {
      setError('Gorev detayi alinamadi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  useEffect(() => {
    if (!selectedTask) return
    setFormData(createInitialFormData(selectedTask))
    setFiles({})
    setSubmitError(null)
  }, [selectedTask])

  useEffect(() => {
    if (!successMessage) return

    const timer = window.setTimeout(() => setSuccessMessage(null), 2500)
    return () => window.clearTimeout(timer)
  }, [successMessage])

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
      next[fieldId] = file ? file.name : ''
      return next
    })
  }

  const handleSubmitAction = async (aksiyonId: 1 | 2 | 3) => {
    if (!selectedTask) return

    const confirmMessage =
      aksiyonId === 2
        ? 'Formu kaydetmek istediginize emin misiniz?'
        : aksiyonId === 3
          ? 'Formu iptal etmek istediginize emin misiniz?'
          : 'Formu gondermek istediginize emin misiniz?'

    if (!window.confirm(confirmMessage)) {
      return
    }

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
        await loadTasks()
      } else if (aksiyonId === 3) {
        setSuccessMessage('Form basariyla iptal edildi.')
        navigate('/tasks')
      } else {
        setSuccessMessage(
          hasFile ? `Form basariyla gonderildi. ${'\u{1F4CE}'} Dosyalar yuklendi.` : 'Form basariyla gonderildi.',
        )
        navigate('/tasks')
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

  if (!taskId || Number.isNaN(numericTaskId)) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Gecersiz gorev adresi.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Gorev detaylari yukleniyor...</div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!selectedTask) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Bu gorev artik listede bulunamadi veya tamamlanmis olabilir.
        </div>
        <button
          type="button"
          onClick={() => navigate('/tasks')}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
        >
          Gorev listesine don
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-[0_20px_45px_rgba(2,6,23,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Task Detail</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{selectedTask.akisAdi?.trim() || 'Akis adi belirtilmedi'}</h1>
        <p className="mt-2 text-sm text-slate-300">
          Task #{selectedTask.taskId} | Surec #{selectedTask.surecId} | Adim: {selectedTask.adimAdi}
        </p>
      </div>

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      ) : null}

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

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
        <strong className="font-semibold text-slate-800">Sistem Ozeti:</strong> Toplam {selectedTask.form.length} alanin {editableCount} adedi kullaniciya atanmis, {readonlyCount} adedi salt okunur.
      </div>

      <button
        type="button"
        onClick={() => navigate('/tasks')}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Gorev listesine don
      </button>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import TaskFieldRenderer from '../components/TaskFieldRenderer'
import { fetchFlowDetailBySurecId, fetchMyTasks, submitTaskAction } from '../services/taskApi'
import { fetchMe } from '../services/userApi'
import { useUserStore } from '../store/userStore'
import type { TaskField, TaskFieldType, TaskFileMap, TaskFormData, TaskFormValue, WorkflowTask } from '../types/task'
import { validateTaskForm } from '../utils/taskValidation'

type RawField = {
  fieldId?: number
  id?: number
  type?: string
  label?: string
  editable?: boolean
  value?: TaskFormValue
  deger?: TaskFormValue
  fieldValue?: TaskFormValue
  selectedValue?: TaskFormValue
  options?: Array<{ label?: string; value?: string | number; ad?: string; kod?: string | number }>
  secenekler?: Array<{ label?: string; value?: string | number; ad?: string; kod?: string | number }>
  choices?: Array<{ label?: string; value?: string | number; name?: string; id?: string | number }>
  values?: Array<{ label?: string; value?: string | number }>
}

type FlowStepView = {
  adimId: number
  adimAdi: string
  form: TaskField[]
}

type RawFlowStep = {
  adimId?: number
  adimAdi?: string
  form?: unknown[]
  fields?: unknown[]
}

type RawFlowDetail = RawFlowStep[] | { steps?: RawFlowStep[] } | null

const SUPPORTED_FIELD_TYPES: TaskFieldType[] = [
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'DATE',
  'RADIO',
  'CHECKBOX',
  'FILE',
  'COMBOBOX',
  'BUTTON',
]

function normalizeField(rawField: RawField, index: number): TaskField {
  const fieldId = Number(rawField.fieldId ?? rawField.id ?? index + 1)
  const resolvedType = String(rawField.type ?? 'TEXT').toUpperCase() as TaskFieldType
  const type = SUPPORTED_FIELD_TYPES.includes(resolvedType) ? resolvedType : 'TEXT'
  const rawValue = rawField.value ?? rawField.deger ?? rawField.fieldValue ?? rawField.selectedValue ?? null

  const rawOptions =
    (Array.isArray(rawField.options) && rawField.options) ||
    (Array.isArray(rawField.secenekler) && rawField.secenekler) ||
    (Array.isArray(rawField.choices) && rawField.choices) ||
    (Array.isArray(rawField.values) && rawField.values) ||
    []

  const options = rawOptions
    .map((option) => {
      const record = option as Record<string, unknown>
      const label = record.label ?? record.ad ?? record.name
      const value = record.value ?? record.kod ?? record.id
      if (label === undefined && value === undefined) {
        return null
      }
      return {
        label: String(label ?? value ?? ''),
        value: String(value ?? label ?? ''),
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  return {
    fieldId: Number.isFinite(fieldId) ? fieldId : index + 1,
    type,
    label: String(rawField.label ?? `Alan ${fieldId}`),
    editable: rawField.editable === true,
    value: rawValue,
    options,
  }
}

function normalizeFlowSteps(rawDetail: RawFlowDetail): FlowStepView[] {
  const rawSteps: RawFlowStep[] = Array.isArray(rawDetail)
    ? rawDetail
    : Array.isArray(rawDetail?.steps)
      ? rawDetail.steps
      : []

  return rawSteps.map((step, stepIndex) => {
    const rawFields = Array.isArray(step.form) ? step.form : Array.isArray(step.fields) ? step.fields : []
    const form = rawFields
      .map((item, fieldIndex) => normalizeField(item as RawField, fieldIndex))
      .filter((field) => Number.isFinite(field.fieldId))

    return {
      adimId: Number(step.adimId ?? stepIndex + 1),
      adimAdi: String(step.adimAdi ?? `Adim ${stepIndex + 1}`),
      form,
    }
  })
}

function buildFormDataPayload(form: TaskField[]): TaskFormData {
  return form.reduce<TaskFormData>((acc, field) => {
    if (!field.editable) {
      return acc
    }
    acc[field.fieldId] = field.value ?? ''
    return acc
  }, {})
}

function buildFilePayload(form: TaskField[], filesByFieldId: Record<number, File>): TaskFileMap {
  return form.reduce<TaskFileMap>((acc, field) => {
    if (!field.editable || field.type !== 'FILE') {
      return acc
    }

    const file = filesByFieldId[field.fieldId]
    if (file) {
      acc[field.fieldId] = file
    }
    return acc
  }, {})
}

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const user = useUserStore((state) => state.user)
  const setUser = useUserStore((state) => state.setUser)

  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null)
  const [steps, setSteps] = useState<FlowStepView[]>([])
  const [selectedStepId, setSelectedStepId] = useState<number | null>(null)
  const [form, setForm] = useState<TaskField[]>([])
  const [filesByFieldId, setFilesByFieldId] = useState<Record<number, File>>({})

  const [loading, setLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<'save' | 'submit' | 'cancel' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const numericTaskId = Number(taskId)
  const editableCount = useMemo(() => form.filter((field) => field.editable).length, [form])

  const selectedStep = useMemo(
    () => steps.find((step) => step.adimId === selectedStepId) ?? null,
    [steps, selectedStepId],
  )
  const isCurrentStepSelected = selectedTask ? selectedStep?.adimId === selectedTask.adimId : false

  const loadTask = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchMyTasks()
      const taskList = Array.isArray(data) ? data : []
      const currentTask = taskList.find((task) => task.taskId === numericTaskId) ?? null
      setSelectedTask(currentTask)
      setForm(currentTask?.form ?? [])
      setFilesByFieldId({})

      if (!currentTask) {
        setSteps([])
        setSelectedStepId(null)
        return
      }

      try {
        const rawDetail = (await fetchFlowDetailBySurecId(currentTask.surecId)) as RawFlowDetail
        const normalizedSteps = normalizeFlowSteps(rawDetail)

        const currentStepFromTask: FlowStepView = {
          adimId: currentTask.adimId,
          adimAdi: currentTask.adimAdi || `Adim ${currentTask.adimId}`,
          form: currentTask.form ?? [],
        }

        const hasCurrentStep = normalizedSteps.some((step) => step.adimId === currentTask.adimId)
        const mergedSteps = hasCurrentStep
          ? normalizedSteps.map((step) => (step.adimId === currentTask.adimId ? currentStepFromTask : step))
          : [currentStepFromTask, ...normalizedSteps]

        setSteps(mergedSteps)
        setSelectedStepId(currentTask.adimId)
      } catch {
        setSteps([
          {
            adimId: currentTask.adimId,
            adimAdi: currentTask.adimAdi || `Adim ${currentTask.adimId}`,
            form: currentTask.form ?? [],
          },
        ])
        setSelectedStepId(currentTask.adimId)
      }
    } catch {
      setError('Gorev detayi alinamadi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!taskId || Number.isNaN(numericTaskId)) return
    loadTask()
  }, [taskId, numericTaskId])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(null), 2500)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  const handleChange = (fieldId: number, value: TaskFormValue) => {
    setForm((prev) =>
      prev.map((field) =>
        field.fieldId === fieldId
          ? {
              ...field,
              value,
            }
          : field,
      ),
    )
  }

  const handleFileChange = (fieldId: number, file: File | null) => {
    setFilesByFieldId((prev) => {
      const next = { ...prev }
      if (file) {
        next[fieldId] = file
      } else {
        delete next[fieldId]
      }
      return next
    })

    handleChange(fieldId, file ? file.name : '')
  }

  const handleSubmitAction = async (aksiyonId: 1 | 2 | 3) => {
    if (!selectedTask) return

    const confirmMessage =
      aksiyonId === 2
        ? 'Formu kaydetmek istediginize emin misiniz?'
        : aksiyonId === 3
          ? 'Formu reddetmek istediginize emin misiniz?'
          : 'Formu gondermek istediginize emin misiniz?'

    if (!window.confirm(confirmMessage)) {
      return
    }

    if (aksiyonId === 1) {
      const currentTaskForValidation: WorkflowTask = {
        ...selectedTask,
        form,
      }
      const validationError = validateTaskForm(currentTaskForValidation, buildFormDataPayload(form))
      if (validationError) {
        setSubmitError(validationError)
        return
      }
    }

    setLoadingAction(aksiyonId === 2 ? 'save' : aksiyonId === 3 ? 'cancel' : 'submit')
    setSubmitError(null)

    try {
      const payload = buildFormDataPayload(form)
      const filePayload = buildFilePayload(form, filesByFieldId)
      const hasFile = Object.keys(filePayload).length > 0

      let userId = user?.kullaniciId
      if (!userId) {
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

      if (!userId) {
        throw new Error('Aksiyon icin kullanici bilgisi bulunamadi. Lutfen tekrar giris yapin.')
      }

      await submitTaskAction(selectedTask.taskId, payload, aksiyonId, filePayload, {
        surecId: selectedTask.surecId,
        adimId: selectedTask.adimId,
        userId: Number(userId),
      })

      if (aksiyonId === 2) {
        setSuccessMessage(hasFile ? 'Taslak kaydedildi. Dosyalar yuklendi.' : 'Taslak kaydedildi.')
        await loadTask()
      } else if (aksiyonId === 3) {
        setSuccessMessage('Form reddedildi.')
        navigate('/tasks')
      } else {
        setSuccessMessage(hasFile ? 'Form gonderildi. Dosyalar yuklendi.' : 'Form gonderildi.')
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
          `${aksiyonId === 2 ? 'Kaydetme' : aksiyonId === 3 ? 'Reddetme' : 'Gonderim'} islemi basarisiz oldu.${
            status ? ` (HTTP ${status})` : ''
          }`,
      )
    } finally {
      setLoadingAction(null)
    }
  }

  if (!taskId || Number.isNaN(numericTaskId)) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Gecersiz gorev adresi.</div>
  }

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Gorev detaylari yukleniyor...</div>
  }

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
  }

  if (!selectedTask) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Bu gorev listede bulunamadi veya tamamlanmis olabilir.
        </div>
        <button
          type="button"
          onClick={() => navigate('/tasks')}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Gorev listesine don
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Gorev Formu</p>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">{selectedTask.akisAdi?.trim() || 'Akis formu'}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Gorev #{selectedTask.taskId} | Surec #{selectedTask.surecId}
        </p>
      </section>

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-3">
          <h2 className="px-2 pb-2 text-sm font-semibold text-slate-800">Akis Adimlari</h2>
          <div className="space-y-2">
            {steps.map((step, index) => {
              const isSelected = step.adimId === selectedStepId
              const canView = step.form.length > 0
              const isCurrent = step.adimId === selectedTask.adimId

              return (
                <button
                  key={`${step.adimId}-${index}`}
                  type="button"
                  disabled={!canView}
                  onClick={() => {
                    if (canView) {
                      setSelectedStepId(step.adimId)
                    }
                  }}
                  className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition ${
                    !canView
                      ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                      : isSelected
                        ? 'border-cyan-500 bg-cyan-50 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50/60'
                  }`}
                >
                  <p className="font-medium">
                    {index + 1}. {step.adimAdi}
                  </p>
                  <p className="mt-1 text-xs">
                    {!canView ? 'Yetki yok' : isCurrent ? 'Mevcut adim' : 'Sadece goruntuleme'}
                  </p>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          {!selectedStep ? (
            <p className="text-sm text-slate-600">Goruntulenecek adim bulunamadi.</p>
          ) : (
            <>
              <div className="mb-4 border-b border-slate-200 pb-4">
                <h2 className="text-lg font-semibold text-slate-900">{selectedStep.adimAdi}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {isCurrentStepSelected
                    ? 'Bu ekran mevcut adiminizdir; alanlari duzenleyebilirsiniz.'
                    : 'Bu adimi goruntuleme yetkiniz var. Alanlar salt okunur gosterilir.'}
                </p>
              </div>

              {(isCurrentStepSelected ? form : selectedStep.form).length === 0 ? (
                <p className="text-sm text-slate-600">Bu adim icin gosterilecek alan yok.</p>
              ) : (
                <div className="grid gap-4">
                  {(isCurrentStepSelected ? form : selectedStep.form).map((field) => (
                    <TaskFieldRenderer
                      key={`${selectedStep.adimId}-${field.fieldId}`}
                      field={isCurrentStepSelected ? field : { ...field, editable: false }}
                      value={field.value ?? ''}
                      fileName={isCurrentStepSelected ? filesByFieldId[field.fieldId]?.name : undefined}
                      onChange={isCurrentStepSelected ? handleChange : () => undefined}
                      onFileChange={isCurrentStepSelected ? handleFileChange : () => undefined}
                    />
                  ))}
                </div>
              )}

              {isCurrentStepSelected && editableCount > 0 ? (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={loadingAction !== null}
                      onClick={() => handleSubmitAction(2)}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingAction === 'save' ? 'Kaydediliyor...' : 'Taslak Kaydet'}
                    </button>
                    <button
                      type="button"
                      disabled={loadingAction !== null}
                      onClick={() => handleSubmitAction(3)}
                      className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingAction === 'cancel' ? 'Reddediliyor...' : 'Reddet'}
                    </button>
                    <button
                      type="button"
                      disabled={loadingAction !== null}
                      onClick={() => handleSubmitAction(1)}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingAction === 'submit' ? 'Gonderiliyor...' : 'Gonder'}
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>

      <button
        type="button"
        onClick={() => navigate('/tasks')}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Gorev listesine don
      </button>
    </div>
  )
}

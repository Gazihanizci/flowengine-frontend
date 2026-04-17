import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import TaskFieldRenderer from '../components/TaskFieldRenderer'
import { fetchFlowDetailBySurecId, fetchMyTasks, submitTaskAction } from '../services/taskApi'
import { fetchMe } from '../services/userApi'
import { useUserStore } from '../store/userStore'
import type { TaskAction, TaskField, TaskFieldType, TaskFormData, TaskFormValue, WorkflowTask } from '../types/task'
import { validateTaskForm } from '../utils/taskValidation'

interface FlowDetailStep {
  adimId: number
  adimAdi: string
  form: TaskField[]
  actions: TaskAction[]
}

type RawFlowDetailArrayItem = {
  adimId?: number
  adimAdi?: string
  form?: unknown[]
  fields?: unknown[]
  actions?: Array<{ actionId?: number; id?: number; label?: string; name?: string }>
}

type RawFlowDetail = RawFlowDetailArrayItem[] | { steps?: RawFlowDetailArrayItem[] } | null

type RawField = {
  fieldId?: number
  id?: number
  type?: string
  label?: string
  secenekler?: Array<{
    label?: string
    value?: string | number
    ad?: string
    kod?: string | number
  }>
  choices?: Array<{
    label?: string
    value?: string | number
    name?: string
    id?: string | number
  }>
  values?: Array<{
    label?: string
    value?: string | number
  }>
  options?: Array<{
    label?: string
    value?: string | number
    selected?: boolean
    isSelected?: boolean
    checked?: boolean
    default?: boolean
  }>
  editable?: boolean
  value?: TaskFormValue
  deger?: TaskFormValue
  fieldValue?: TaskFormValue
  selectedValue?: TaskFormValue
  actionId?: number
}

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

function toStepFieldKey(adimId: number, fieldId: number) {
  return `${adimId}:${fieldId}`
}

function resolveInitialValue(field: TaskField): TaskFormValue {
  if (field.value !== undefined) {
    return field.value
  }

  return field.type === 'CHECKBOX' ? false : ''
}

function extractOptions(rawField: RawField, fallbackOptions: TaskField['options'] = []): TaskField['options'] {
  const rawOptions =
    (Array.isArray(rawField.options) && rawField.options) ||
    (Array.isArray(rawField.secenekler) && rawField.secenekler) ||
    (Array.isArray(rawField.choices) && rawField.choices) ||
    (Array.isArray(rawField.values) && rawField.values) ||
    []

  const mapped = rawOptions
    .map((option) => {
      const optionRecord = option as Record<string, unknown>
      const rawLabel = optionRecord.label ?? optionRecord.ad ?? optionRecord.name
      const rawValue = optionRecord.value ?? optionRecord.kod ?? optionRecord.id
      if (rawLabel === undefined && rawValue === undefined) {
        return null
      }

      return {
        label: String(rawLabel ?? rawValue ?? ''),
        value: String(rawValue ?? rawLabel ?? ''),
      }
    })
    .filter((option): option is NonNullable<typeof option> => option !== null)

  if (mapped.length > 0) {
    return mapped
  }

  return fallbackOptions ?? []
}

function normalizeField(rawField: RawField, index: number, fallbackField?: TaskField): TaskField {
  const resolvedType = (rawField.type || 'TEXT').toUpperCase() as TaskFieldType
  const type = SUPPORTED_FIELD_TYPES.includes(resolvedType) ? resolvedType : 'TEXT'
  const fieldId = Number(rawField.fieldId ?? rawField.id ?? index + 1)
  const normalizedOptions = extractOptions(rawField, fallbackField?.options)

  let normalizedValue: TaskFormValue =
    rawField.value ?? rawField.deger ?? rawField.fieldValue ?? rawField.selectedValue ?? fallbackField?.value ?? null

  if ((type === 'RADIO' || type === 'COMBOBOX') && (normalizedValue === null || normalizedValue === '')) {
    const selectedSource =
      (Array.isArray(rawField.options) && rawField.options) ||
      (Array.isArray(rawField.secenekler) && rawField.secenekler) ||
      (Array.isArray(rawField.choices) && rawField.choices) ||
      (Array.isArray(rawField.values) && rawField.values) ||
      []

    const selectedOption = selectedSource.find((option) => {
      const optionRecord = option as Record<string, unknown>
      return Boolean(
        optionRecord.selected || optionRecord.isSelected || optionRecord.checked || optionRecord.default,
      )
    }) as Record<string, unknown> | undefined

    const selectedValue = selectedOption?.value ?? selectedOption?.kod ?? selectedOption?.id
    if (selectedValue !== undefined && selectedValue !== null) {
      normalizedValue = String(selectedValue)
    }
  }

  if ((type === 'RADIO' || type === 'COMBOBOX') && normalizedValue !== null && normalizedValue !== undefined) {
    normalizedValue = String(normalizedValue)
  }

  if (type === 'NUMBER' && typeof normalizedValue === 'string' && normalizedValue.trim() !== '') {
    const asNumber = Number(normalizedValue)
    if (!Number.isNaN(asNumber)) {
      normalizedValue = asNumber
    }
  }

  return {
    fieldId,
    type,
    label: rawField.label?.trim() || fallbackField?.label || `Alan ${fieldId}`,
    editable: rawField.editable === true,
    value: normalizedValue,
    actionId: rawField.actionId ?? fallbackField?.actionId,
    options: normalizedOptions,
  }
}

function normalizeFlowDetail(rawDetail: RawFlowDetail, selectedTask: WorkflowTask): FlowDetailStep[] {
  const rawSteps: RawFlowDetailArrayItem[] = Array.isArray(rawDetail)
    ? rawDetail
    : Array.isArray(rawDetail?.steps)
      ? rawDetail.steps
      : []

  const normalized = rawSteps.map((step, stepIndex) => {
    const rawFields = Array.isArray(step.form) ? step.form : Array.isArray(step.fields) ? step.fields : []
    const fields = rawFields
      .map((item, index) => {
        const rawField = item as RawField
        const fallbackField = selectedTask.form.find(
          (taskField) => taskField.fieldId === Number(rawField.fieldId ?? rawField.id ?? -1),
        )
        return normalizeField(rawField, index, fallbackField)
      })
      .filter((field) => Number.isFinite(field.fieldId))

    const actions = (step.actions ?? []).map((action, index) => ({
      actionId: Number(action.actionId ?? action.id ?? index + 1),
      label: action.label ?? action.name ?? `Aksiyon ${index + 1}`,
    }))

    return {
      adimId: Number(step.adimId ?? stepIndex + 1),
      adimAdi: step.adimAdi?.trim() || `Adim ${stepIndex + 1}`,
      form: fields,
      actions,
    }
  })

  if (normalized.length > 0) {
    return normalized
  }

  return [
    {
      adimId: selectedTask.adimId,
      adimAdi: selectedTask.adimAdi,
      form: selectedTask.form,
      actions: selectedTask.actions ?? [],
    },
  ]
}

function createInitialFormData(steps: FlowDetailStep[]): TaskFormData {
  const initialData: TaskFormData = {}
  steps.forEach((step) => {
    step.form.forEach((field) => {
      initialData[toStepFieldKey(step.adimId, field.fieldId)] = resolveInitialValue(field)
    })
  })
  return initialData
}

function buildEditableStepPayload(step: FlowDetailStep, formData: TaskFormData) {
  const payload: TaskFormData = {}

  step.form.forEach((field) => {
    if (!field.editable) {
      return
    }

    payload[field.fieldId] = formData[toStepFieldKey(step.adimId, field.fieldId)] ?? resolveInitialValue(field)
  })

  return payload
}

function buildEditableStepFiles(step: FlowDetailStep, filesByStepField: Record<string, File>) {
  const payload: Record<number, File> = {}

  step.form.forEach((field) => {
    if (!field.editable || field.type !== 'FILE') {
      return
    }

    const file = filesByStepField[toStepFieldKey(step.adimId, field.fieldId)]
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
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null)
  const [flowDetail, setFlowDetail] = useState<FlowDetailStep[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingFlowDetail, setLoadingFlowDetail] = useState(false)
  const [loadingAction, setLoadingAction] = useState<'save' | 'submit' | 'cancel' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState<TaskFormData>({})
  const [filesByStepField, setFilesByStepField] = useState<Record<string, File>>({})

  const numericTaskId = Number(taskId)

  const activeSteps = useMemo(() => flowDetail.filter((step) => step.form.some((field) => field.editable)), [flowDetail])
  const editableCount = useMemo(
    () => flowDetail.reduce((count, step) => count + step.form.filter((field) => field.editable).length, 0),
    [flowDetail],
  )
  const totalCount = useMemo(() => flowDetail.reduce((count, step) => count + step.form.length, 0), [flowDetail])

  const loadTasks = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchMyTasks()
      const taskList = Array.isArray(data) ? data : []
      setTasks(taskList)

      const currentTask = taskList.find((task) => task.taskId === numericTaskId) ?? null
      setSelectedTask(currentTask)
    } catch {
      setError('Gorev detayi alinamadi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!taskId || Number.isNaN(numericTaskId)) return
    loadTasks()
  }, [taskId, numericTaskId])

  useEffect(() => {
    if (!selectedTask) {
      setFlowDetail([])
      return
    }

    const loadFlowDetail = async () => {
      setLoadingFlowDetail(true)
      setSubmitError(null)

      try {
        const rawDetail = (await fetchFlowDetailBySurecId(selectedTask.surecId)) as RawFlowDetail
        const normalizedSteps = normalizeFlowDetail(rawDetail, selectedTask)
        setFlowDetail(normalizedSteps)
        setFormData(createInitialFormData(normalizedSteps))
        setFilesByStepField({})
      } catch {
        setFlowDetail([])
        setSubmitError('Flow detayi alinamadi. Form gosterilemiyor.')
      } finally {
        setLoadingFlowDetail(false)
      }
    }

    loadFlowDetail()
  }, [selectedTask])

  useEffect(() => {
    if (!successMessage) return

    const timer = window.setTimeout(() => setSuccessMessage(null), 2500)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  const handleChangeField = (adimId: number, fieldId: number, value: TaskFormValue) => {
    setFormData((prev) => ({
      ...prev,
      [toStepFieldKey(adimId, fieldId)]: value,
    }))
  }

  const handleChangeFile = (adimId: number, fieldId: number, file: File | null) => {
    const key = toStepFieldKey(adimId, fieldId)

    setFilesByStepField((prev) => {
      const next = { ...prev }
      if (file) {
        next[key] = file
      } else {
        delete next[key]
      }
      return next
    })

    setFormData((prev) => ({
      ...prev,
      [key]: file ? file.name : '',
    }))
  }

  const handleSubmitAction = async (step: FlowDetailStep, aksiyonId: 1 | 2 | 3) => {
    if (!selectedTask) return
    const isActive = step.form.some((field) => field.editable)
    if (!isActive) return

    const confirmMessage =
      aksiyonId === 2
        ? 'Formu kaydetmek istediginize emin misiniz?'
        : aksiyonId === 3
          ? 'Formu iptal etmek istediginize emin misiniz?'
          : 'Formu gondermek istediginize emin misiniz?'

    if (!window.confirm(confirmMessage)) {
      return
    }

    const activeStepTask: WorkflowTask = {
      ...selectedTask,
      adimId: step.adimId,
      adimAdi: step.adimAdi,
      form: step.form,
      actions: step.actions,
    }

    if (aksiyonId === 1) {
      const stepFormData: TaskFormData = {}
      step.form.forEach((field) => {
        stepFormData[field.fieldId] = formData[toStepFieldKey(step.adimId, field.fieldId)] ?? resolveInitialValue(field)
      })
      const validationError = validateTaskForm(activeStepTask, stepFormData)
      if (validationError) {
        setSubmitError(validationError)
        return
      }
    }

    setLoadingAction(aksiyonId === 2 ? 'save' : aksiyonId === 3 ? 'cancel' : 'submit')
    setSubmitError(null)

    try {
      const payload = buildEditableStepPayload(step, formData)
      const filePayload = buildEditableStepFiles(step, filesByStepField)
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
        adimId: step.adimId,
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
          Task #{selectedTask.taskId} | Surec #{selectedTask.surecId}
        </p>
        <p className="mt-1 text-xs text-slate-400">Aktif gorev listesi kayit sayisi: {tasks.length}</p>
      </div>

      {loadingFlowDetail ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Flow detay verisi yukleniyor...
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </div>
      ) : null}

      <div className="space-y-4">
        {flowDetail.map((step, index) => {
          const isActive = step.form.some((field) => field.editable)

          return (
            <section
              key={`${step.adimId}-${index}`}
              className={`rounded-3xl border p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ${
                isActive ? 'border-cyan-300 bg-white' : 'border-slate-300 bg-slate-100'
              }`}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Step {index + 1}</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">{step.adimAdi}</h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isActive ? 'border border-cyan-200 bg-cyan-50 text-cyan-700' : 'border border-slate-300 bg-slate-200 text-slate-700'
                  }`}
                >
                  {isActive ? 'Aktif' : 'Tamamlandi'}
                </span>
              </div>

              <div className="grid gap-4">
                {step.form.map((field) => {
                  const readonlyField = isActive ? field : { ...field, editable: false }
                  return (
                    <TaskFieldRenderer
                      key={`${step.adimId}-${field.fieldId}`}
                      field={readonlyField}
                      value={formData[toStepFieldKey(step.adimId, field.fieldId)]}
                      fileName={filesByStepField[toStepFieldKey(step.adimId, field.fieldId)]?.name}
                      onChange={(fieldId, value) => handleChangeField(step.adimId, fieldId, value)}
                      onFileChange={(fieldId, file) => handleChangeFile(step.adimId, fieldId, file)}
                    />
                  )
                })}
              </div>

              {isActive ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-sm font-medium text-slate-700">
                    Kaydet taslak olusturur ve validation atlar. Gonder butonu zorunlu alan kontrolu yapar.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={loadingAction !== null}
                      onClick={() => handleSubmitAction(step, 2)}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {loadingAction === 'save' ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                          Kaydediliyor...
                        </>
                      ) : (
                        'Kaydet'
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={loadingAction !== null}
                      onClick={() => handleSubmitAction(step, 3)}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
                    >
                      {loadingAction === 'cancel' ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                          Iptal ediliyor...
                        </>
                      ) : (
                        'Reddet'
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={loadingAction !== null}
                      onClick={() => handleSubmitAction(step, 1)}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                    >
                      {loadingAction === 'submit' ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                          Gonderiliyor...
                        </>
                      ) : (
                        'Gonder'
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          )
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
        <strong className="font-semibold text-slate-800">Sistem Ozeti:</strong> Toplam {totalCount} alanin {editableCount} adedi kullaniciya atanmis, {totalCount - editableCount} adedi salt okunur. Aktif adim sayisi: {activeSteps.length}
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

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
    editable: rawField.editable === true || fallbackField?.editable === true,
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

function canEditStep(step: FlowDetailStep) {
  return step.form.some((field) => field.editable)
}

function canViewStep(step: FlowDetailStep) {
  return step.form.length > 0 || step.actions.length > 0
}

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const user = useUserStore((state) => state.user)
  const setUser = useUserStore((state) => state.setUser)

  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null)
  const [flowDetail, setFlowDetail] = useState<FlowDetailStep[]>([])
  const [selectedStepId, setSelectedStepId] = useState<number | null>(null)

  const [loading, setLoading] = useState(false)
  const [loadingFlowDetail, setLoadingFlowDetail] = useState(false)
  const [loadingAction, setLoadingAction] = useState<'save' | 'submit' | 'cancel' | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState<TaskFormData>({})
  const [filesByStepField, setFilesByStepField] = useState<Record<string, File>>({})

  const numericTaskId = Number(taskId)

  const selectedStep = useMemo(
    () => flowDetail.find((step) => step.adimId === selectedStepId) ?? null,
    [flowDetail, selectedStepId],
  )
  const selectedStepCanEdit = selectedStep ? canEditStep(selectedStep) : false
  const selectedStepCanView = selectedStep ? canViewStep(selectedStep) : false

  const loadTasks = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchMyTasks()
      const taskList = Array.isArray(data) ? data : []
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
      setSelectedStepId(null)
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
    if (flowDetail.length === 0) {
      setSelectedStepId(null)
      return
    }

    const selectedStillValid =
      selectedStepId !== null &&
      flowDetail.some((step) => step.adimId === selectedStepId && canViewStep(step))

    if (selectedStillValid) {
      return
    }

    const firstViewable = flowDetail.find((step) => canViewStep(step))
    setSelectedStepId(firstViewable?.adimId ?? flowDetail[0].adimId)
  }, [flowDetail, selectedStepId])

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
    if (!selectedTask || !canEditStep(step)) return

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
      const activeStepTask: WorkflowTask = {
        ...selectedTask,
        adimId: step.adimId,
        adimAdi: step.adimAdi,
        form: step.form,
        actions: step.actions,
      }

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
        adimId: step.adimId,
        userId: Number(userId),
      })

      if (aksiyonId === 2) {
        setSuccessMessage(hasFile ? 'Taslak kaydedildi. Dosyalar yuklendi.' : 'Taslak kaydedildi.')
        await loadTasks()
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

      {loadingFlowDetail ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Form verisi yukleniyor...
        </div>
      ) : null}

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
          <h2 className="px-2 pb-2 text-sm font-semibold text-slate-800">Flow Adimlari</h2>
          <div className="space-y-2">
            {flowDetail.map((step, index) => {
              const isSelected = step.adimId === selectedStepId
              const stepCanView = canViewStep(step)
              const stepCanEdit = canEditStep(step)

              return (
                <button
                  key={`${step.adimId}-${index}`}
                  type="button"
                  disabled={!stepCanView}
                  onClick={() => {
                    if (stepCanView) {
                      setSelectedStepId(step.adimId)
                    }
                  }}
                  className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition ${
                    !stepCanView
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
                    {!stepCanView ? 'Yetki yok' : stepCanEdit ? 'Duzenleme yetkisi var' : 'Salt goruntuleme'}
                  </p>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          {!selectedStep ? (
            <p className="text-sm text-slate-600">Goruntulenecek adim bulunamadi.</p>
          ) : !selectedStepCanView ? (
            <p className="text-sm text-slate-600">Bu adim icin goruntuleme yetkiniz yok.</p>
          ) : (
            <>
              <div className="mb-4 border-b border-slate-200 pb-4">
                <h2 className="text-lg font-semibold text-slate-900">{selectedStep.adimAdi}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedStepCanEdit
                    ? 'Bu adimda veri girebilir ve aksiyon alabilirsiniz.'
                    : 'Bu adim salt goruntuleme yetkisine aciktir.'}
                </p>
              </div>

              {selectedStep.form.length === 0 ? (
                <p className="text-sm text-slate-600">Bu adim icin gosterilecek alan yok.</p>
              ) : (
                <div className="grid gap-4">
                  {selectedStep.form.map((field) => {
                    const readonlyField = selectedStepCanEdit ? field : { ...field, editable: false }
                    return (
                      <TaskFieldRenderer
                        key={`${selectedStep.adimId}-${field.fieldId}`}
                        field={readonlyField}
                        value={formData[toStepFieldKey(selectedStep.adimId, field.fieldId)]}
                        fileName={filesByStepField[toStepFieldKey(selectedStep.adimId, field.fieldId)]?.name}
                        onChange={(fieldId, value) => handleChangeField(selectedStep.adimId, fieldId, value)}
                        onFileChange={(fieldId, file) => handleChangeFile(selectedStep.adimId, fieldId, file)}
                      />
                    )
                  })}
                </div>
              )}

              {selectedStepCanEdit ? (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={loadingAction !== null}
                      onClick={() => handleSubmitAction(selectedStep, 2)}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingAction === 'save' ? 'Kaydediliyor...' : 'Taslak Kaydet'}
                    </button>
                    <button
                      type="button"
                      disabled={loadingAction !== null}
                      onClick={() => handleSubmitAction(selectedStep, 3)}
                      className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingAction === 'cancel' ? 'Reddediliyor...' : 'Reddet'}
                    </button>
                    <button
                      type="button"
                      disabled={loadingAction !== null}
                      onClick={() => handleSubmitAction(selectedStep, 1)}
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

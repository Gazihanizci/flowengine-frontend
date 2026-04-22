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
  fileId?: number | null
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

function sanitizeEditableFieldValues(fields: TaskField[]) {
  return fields.map((field) => (field.editable ? { ...field, value: null } : field))
}

function normalizeStepName(value?: string) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
}

function isSameStep(
  left: { adimId: number; adimAdi?: string },
  right: { adimId: number; adimAdi?: string },
) {
  return left.adimId === right.adimId || normalizeStepName(left.adimAdi) === normalizeStepName(right.adimAdi)
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

function normalizeField(rawField: RawField, index: number): TaskField {
  const fieldId = Number(rawField.fieldId ?? rawField.id ?? index + 1)
  const resolvedType = String(rawField.type ?? 'TEXT').toUpperCase() as TaskFieldType
  const type = SUPPORTED_FIELD_TYPES.includes(resolvedType) ? resolvedType : 'TEXT'
  const editable = rawField.editable === true
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
    editable,
    fileId: rawField.fileId ?? null,
    value: editable ? null : rawValue,
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
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectAciklama, setRejectAciklama] = useState('')
  const [rejectValidationError, setRejectValidationError] = useState<string | null>(null)

  const numericTaskId = Number(taskId)
  const editableCount = useMemo(() => form.filter((field) => field.editable).length, [form])

  const selectedStep = useMemo(
    () => steps.find((step) => step.adimId === selectedStepId) ?? null,
    [steps, selectedStepId],
  )
  const isCurrentStepSelected = selectedTask && selectedStep ? isSameStep(selectedStep, selectedTask) : false

  const loadTask = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchMyTasks()
      const taskList = Array.isArray(data) ? data : []
      const currentTask = taskList.find((task) => task.taskId === numericTaskId) ?? null
      setSelectedTask(currentTask)
      setForm(sanitizeEditableFieldValues(currentTask?.form ?? []))
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
          form: sanitizeEditableFieldValues(currentTask.form ?? []),
        }

        const hasCurrentStep = normalizedSteps.some((step) => isSameStep(step, currentTask))
        const mergedSteps = hasCurrentStep
          ? normalizedSteps.map((step) => (isSameStep(step, currentTask) ? currentStepFromTask : step))
          : [currentStepFromTask, ...normalizedSteps]

        setSteps(mergedSteps)
        setSelectedStepId(currentTask.adimId)
      } catch {
        setSteps([
          {
            adimId: currentTask.adimId,
            adimAdi: currentTask.adimAdi || `Adim ${currentTask.adimId}`,
            form: sanitizeEditableFieldValues(currentTask.form ?? []),
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

  const handleSubmitAction = async (
    aksiyonId: 1 | 2 | 3,
    options?: {
      skipConfirm?: boolean
      aciklama?: string
    },
  ) => {
    if (!selectedTask) return

    const confirmMessage =
      aksiyonId === 2
        ? 'Formu kaydetmek istediginize emin misiniz?'
        : aksiyonId === 3
          ? 'Formu reddetmek istediginize emin misiniz?'
          : 'Formu gondermek istediginize emin misiniz?'

    if (!options?.skipConfirm && !window.confirm(confirmMessage)) {
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
      }, {
        aciklama: options?.aciklama,
      })

      if (aksiyonId === 2) {
        setSuccessMessage(hasFile ? 'Taslak kaydedildi. Dosyalar yuklendi.' : 'Taslak kaydedildi.')
        await loadTask()
      } else if (aksiyonId === 3) {
        setRejectAciklama('')
        setRejectValidationError(null)
        setRejectModalOpen(false)
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

  const openRejectModal = () => {
    setRejectValidationError(null)
    setRejectModalOpen(true)
  }

  const closeRejectModal = () => {
    if (loadingAction === 'cancel') return
    setRejectModalOpen(false)
    setRejectValidationError(null)
  }

  const handleConfirmReject = async () => {
    const trimmed = rejectAciklama.trim()
    if (!trimmed) {
      setRejectValidationError('Aciklama zorunludur')
      return
    }
    await handleSubmitAction(3, { skipConfirm: true, aciklama: trimmed })
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
    <div className="task-detail-page">
      <section className="task-detail-hero">
        <div>
          <p className="task-kicker">Task Workspace</p>
          <h1>{selectedTask.akisAdi?.trim() || 'Akis formu'}</h1>
          <p>Gorev #{selectedTask.taskId} | Surec #{selectedTask.surecId}</p>
        </div>
        <div className="task-detail-hero-meta">
          <span>Aktif Adim: {selectedTask.adimAdi || `Adim ${selectedTask.adimId}`}</span>
          <span>Duzenlenebilir Alan: {editableCount}</span>
        </div>
      </section>

      {successMessage ? <div className="task-feedback success">{successMessage}</div> : null}
      {submitError ? <div className="task-feedback error">{submitError}</div> : null}

      <div className="task-detail-layout">
        <aside className="task-steps-panel">
          <h2>Akis Adimlari</h2>
          <div className="task-steps-list">
            {steps.map((step, index) => {
              const isSelected = step.adimId === selectedStepId
              const canView = step.form.length > 0
              const isCurrent = isSameStep(step, selectedTask)

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
                  className={`task-step-btn ${isSelected ? 'selected' : ''} ${!canView ? 'disabled' : ''}`}
                >
                  <p>
                    {index + 1}. {step.adimAdi}
                  </p>
                  <span>{!canView ? 'Yetki yok' : isCurrent ? 'Mevcut adim' : 'Salt goruntuleme'}</span>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="task-form-panel">
          {!selectedStep ? (
            <p className="hint">Goruntulenecek adim bulunamadi.</p>
          ) : (
            <>
              <header className="task-form-panel-head">
                <h2>{selectedStep.adimAdi}</h2>
                <p>
                  {isCurrentStepSelected
                    ? 'Bu adim size ait. Alanlari duzenleyip aksiyon alabilirsiniz.'
                    : 'Bu adim sadece goruntulenebilir. Alanlar salt okunur durumdadir.'}
                </p>
              </header>

              {(isCurrentStepSelected ? form : selectedStep.form).length === 0 ? (
                <p className="hint">Bu adim icin gosterilecek alan yok.</p>
              ) : (
                <div className="task-form-grid">
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
                <div className="task-action-bar">
                  <button
                    type="button"
                    disabled={loadingAction !== null}
                    onClick={() => handleSubmitAction(2)}
                    className="button secondary"
                  >
                    {loadingAction === 'save' ? 'Kaydediliyor...' : 'Taslak Kaydet'}
                  </button>
                  <button
                    type="button"
                    disabled={loadingAction !== null}
                    onClick={openRejectModal}
                    className="button reject"
                  >
                    {loadingAction === 'cancel' ? 'Reddediliyor...' : 'Reddet'}
                  </button>
                  <button
                    type="button"
                    disabled={loadingAction !== null}
                    onClick={() => handleSubmitAction(1)}
                    className="button primary"
                  >
                    {loadingAction === 'submit' ? 'Gonderiliyor...' : 'Gonder'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>

      <button type="button" onClick={() => navigate('/tasks')} className="button secondary">
        Gorev listesine don
      </button>

      {rejectModalOpen ? (
        <div className="task-modal-backdrop">
          <div className="task-modal">
            <h2>Iptal Aciklamasi</h2>
            <textarea
              className="input"
              rows={5}
              value={rejectAciklama}
              onChange={(event) => {
                setRejectAciklama(event.target.value)
                if (rejectValidationError) {
                  setRejectValidationError(null)
                }
              }}
              placeholder="Iptal sebebini yaziniz..."
            />

            {rejectValidationError ? <p className="error-text">{rejectValidationError}</p> : null}

            <div className="task-modal-actions">
              <button
                type="button"
                onClick={closeRejectModal}
                disabled={loadingAction === 'cancel'}
                className="button secondary"
              >
                Vazgec
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={loadingAction === 'cancel'}
                className="button reject"
              >
                {loadingAction === 'cancel' ? 'Iptal Ediliyor...' : 'Iptal Et'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

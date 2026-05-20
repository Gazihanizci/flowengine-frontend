import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import TaskFieldRenderer from '../components/TaskFieldRenderer'
import { fetchFlowDetailBySurecId, fetchMyTasks, submitTaskAction } from '../services/taskApi'
import { fetchMe } from '../services/userApi'
import { isPhotoField } from '../services/fileApi'
import { useUserStore } from '../store/userStore'
import type { TaskField, TaskFieldType, TaskFileMap, TaskFormData, TaskFormValue, WorkflowTask } from '../types/task'
import { validateTaskForm } from '../utils/taskValidation'
import {
  Briefcase,
  GitBranch,
  Edit3,
  Calendar,
  Activity,
  CheckCircle2,
  ArrowLeft,
  Save,
  XCircle,
  Send,
  X,
  Info,
  AlertCircle
} from 'lucide-react'

type RawField = {
  fieldId?: number
  id?: number
  type?: string
  label?: string
  editable?: boolean
  fileId?: number | null
  fotografId?: number | null
  value?: TaskFormValue
  deger?: TaskFormValue
  fieldValue?: TaskFormValue
  selectedValue?: TaskFormValue
  options?: Array<{ label?: string; value?: string | number; ad?: string; kod?: string | number }>
  secenekler?: Array<{ label?: string; value?: string | number; ad?: string; kod?: string | number }>
  choices?: Array<{ label?: string; value?: string | number; name?: string; id?: string | number }>
  values?: Array<{ label?: string; value?: string | number }>
  accept?: string | null
  multiple?: boolean
}

type FlowStepView = {
  stepKey: string
  adimId: number
  adimAdi: string
  form: TaskField[]
  source: 'main' | 'related'
  relatedTask?: {
    taskId: number
    surecId: number
    akisAdi?: string | null
  }
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
    accept: rawField.accept ?? null,
    multiple: Boolean(rawField.multiple),
    isPhoto:
      rawField.fotografId !== null && rawField.fotografId !== undefined
        ? true
        : isPhotoField({
            label: rawField.label,
            accept: rawField.accept,
            type: rawField.type,
            value: rawValue,
          }),
    editable,
    fileId: rawField.fileId ?? rawField.fotografId ?? null,
    value: editable ? null : rawValue,
    options,
  }
}

function normalizeFlowSteps(rawDetail: RawFlowDetail, surecId: number): FlowStepView[] {
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
      stepKey: `main-${surecId}-${Number(step.adimId ?? stepIndex + 1)}`,
      adimId: Number(step.adimId ?? stepIndex + 1),
      adimAdi: String(step.adimAdi ?? `Adım ${stepIndex + 1}`),
      form,
      source: 'main',
    }
  })
}

function pickRelatedTasks(currentTask: WorkflowTask, taskList: WorkflowTask[]) {
  return taskList
    .filter((task) => task.taskId !== currentTask.taskId)
    .filter((task) => {
      const surecDistance = Math.abs(task.surecId - currentTask.surecId)
      const stepDistance = Math.abs(task.adimId - currentTask.adimId)
      const sameFlowName =
        task.akisAdi?.trim() &&
        currentTask.akisAdi?.trim() &&
        task.akisAdi.trim().toLocaleLowerCase('tr-TR') === currentTask.akisAdi.trim().toLocaleLowerCase('tr-TR')

      return sameFlowName || surecDistance <= 2 || stepDistance <= 1
    })
    .sort((a, b) => {
      const scoreA = Math.abs(a.surecId - currentTask.surecId) * 2 + Math.abs(a.adimId - currentTask.adimId)
      const scoreB = Math.abs(b.surecId - currentTask.surecId) * 2 + Math.abs(b.adimId - currentTask.adimId)
      return scoreA - scoreB
    })
    .slice(0, 4)
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
  const [selectedStepKey, setSelectedStepKey] = useState<string | null>(null)
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
    () => steps.find((step) => step.stepKey === selectedStepKey) ?? null,
    [steps, selectedStepKey],
  )
  const isCurrentStepSelected =
    selectedTask && selectedStep && selectedStep.source === 'main' ? isSameStep(selectedStep, selectedTask) : false
  const mainSteps = useMemo(() => steps.filter((step) => step.source === 'main'), [steps])
  const visibleMainSteps = useMemo(() => {
    if (!selectedTask) return mainSteps

    const currentIndex = mainSteps.findIndex((step) => isSameStep(step, selectedTask))
    if (currentIndex >= 0) {
      return mainSteps.filter((_, index) => index <= currentIndex)
    }

    return mainSteps.filter((step) => step.adimId <= selectedTask.adimId)
  }, [mainSteps, selectedTask])
  const relatedSteps = useMemo(() => steps.filter((step) => step.source === 'related'), [steps])

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
        setSelectedStepKey(null)
        return
      }

      try {
        const rawDetail = (await fetchFlowDetailBySurecId(currentTask.surecId)) as RawFlowDetail
        const normalizedSteps = normalizeFlowSteps(rawDetail, currentTask.surecId)

        const currentStepFromTask: FlowStepView = {
          stepKey: `main-${currentTask.surecId}-${currentTask.adimId}`,
          adimId: currentTask.adimId,
          adimAdi: currentTask.adimAdi || `Adım ${currentTask.adimId}`,
          form: sanitizeEditableFieldValues(currentTask.form ?? []),
          source: 'main',
        }

        const hasCurrentStep = normalizedSteps.some((step) => isSameStep(step, currentTask))
        const mainSteps = hasCurrentStep
          ? normalizedSteps.map((step) => (isSameStep(step, currentTask) ? currentStepFromTask : step))
          : [currentStepFromTask, ...normalizedSteps]

        const relatedSteps: FlowStepView[] = pickRelatedTasks(currentTask, taskList).map((task) => ({
          stepKey: `related-${task.taskId}-${task.adimId}`,
          adimId: task.adimId,
          adimAdi: task.adimAdi || `Adım ${task.adimId}`,
          form: sanitizeEditableFieldValues(task.form ?? []),
          source: 'related',
          relatedTask: {
            taskId: task.taskId,
            surecId: task.surecId,
            akisAdi: task.akisAdi,
          },
        }))

        setSteps([...mainSteps, ...relatedSteps])
        setSelectedStepKey(currentStepFromTask.stepKey)
      } catch {
        setSteps([
          {
            stepKey: `main-${currentTask.surecId}-${currentTask.adimId}`,
            adimId: currentTask.adimId,
            adimAdi: currentTask.adimAdi || `Adım ${currentTask.adimId}`,
            form: sanitizeEditableFieldValues(currentTask.form ?? []),
            source: 'main',
          },
        ])
        setSelectedStepKey(`main-${currentTask.surecId}-${currentTask.adimId}`)
      }
    } catch {
      setError('Görev detayları alınamadı.')
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
        ? 'Formu taslak olarak kaydetmek istediğinize emin misiniz?'
        : aksiyonId === 3
          ? 'Formu reddetmek istediğinize emin misiniz?'
          : 'Formu göndermek istediğinize emin misiniz?'

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
      const photoFieldIds = form.filter((field) => field.type === 'FILE' && isPhotoField(field)).map((field) => field.fieldId)

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
        throw new Error('Aksiyon için kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.')
      }

      await submitTaskAction(selectedTask.taskId, payload, aksiyonId, filePayload, {
        surecId: selectedTask.surecId,
        adimId: selectedTask.adimId,
        userId: Number(userId),
        photoFieldIds,
      }, {
        aciklama: options?.aciklama,
      })

      if (aksiyonId === 2) {
        setSuccessMessage(hasFile ? 'Taslak başarıyla kaydedildi. Dosyalar yüklendi.' : 'Taslak başarıyla kaydedildi.')
        await loadTask()
      } else if (aksiyonId === 3) {
        setRejectAciklama('')
        setRejectValidationError(null)
        setRejectModalOpen(false)
        setSuccessMessage('Form başarıyla reddedildi.')
        navigate('/tasks')
      } else {
        setSuccessMessage(hasFile ? 'Form başarıyla gönderildi. Dosyalar yüklendi.' : 'Form başarıyla gönderildi.')
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
          `${aksiyonId === 2 ? 'Kaydetme' : aksiyonId === 3 ? 'Reddetme' : 'Gönderim'} işlemi başarısız oldu.${
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
      setRejectValidationError('Reddetme açıklaması yazılması zorunludur.')
      return
    }
    await handleSubmitAction(3, { skipConfirm: true, aciklama: trimmed })
  }

  if (!taskId || Number.isNaN(numericTaskId)) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Geçersiz görev adresi.</div>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm font-medium text-slate-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mr-2"></div>
        Görev detayları yükleniyor...
      </div>
    )
  }

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
  }

  if (!selectedTask) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Bu görev listedde bulunamadı veya tamamlanmış olabilir.
        </div>
        <button
          type="button"
          onClick={() => navigate('/tasks')}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Görev listesine dön
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-[0_20px_45px_rgba(2,6,23,0.35)] dark:border-slate-900">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-cyan-500/10 blur-3xl"></div>
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
              <Briefcase className="h-3 w-3" />
              Task Workspace
            </span>
            <h1 className="mt-2.5 text-2xl font-extrabold tracking-tight">
              {selectedTask.akisAdi?.trim() || 'İş Akış Formu'}
            </h1>
            <p className="mt-1 text-sm text-slate-350 flex flex-wrap items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              Görev #{selectedTask.taskId}
              <span className="text-slate-500">|</span>
              Süreç #{selectedTask.surecId}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                <GitBranch className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Aktif Adım</p>
                <p className="text-xs font-bold text-white truncate max-w-[140px]" title={selectedTask.adimAdi}>
                  {selectedTask.adimAdi || `Adım ${selectedTask.adimId}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <Edit3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Düzenlenebilir</p>
                <p className="text-xs font-black text-white">{editableCount} Alan</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {successMessage ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-250 bg-emerald-50 px-4 py-3.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/50">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          {successMessage}
        </div>
      ) : null}

      {submitError ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-semibold text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/50">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          {submitError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr] items-start">
        {/* Left Sidebar: Timeline Stepper */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 dark:border-slate-800 dark:bg-slate-950 sticky top-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-900">
            <Activity className="h-4 w-4 text-blue-600" />
            Akış Adımları
          </h2>
          
          <div className="relative pl-3 space-y-4 before:absolute before:left-5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-900">
            {visibleMainSteps.map((step, index) => {
              const isSelected = step.stepKey === selectedStepKey
              const canView = step.form.length > 0
              const isCurrent = isSameStep(step, selectedTask)

              return (
                <div key={`${step.stepKey}-${index}`} className="relative flex gap-3 items-start group">
                  {/* Timeline icon indicator */}
                  <div className="relative z-10 flex h-4 w-4 mt-3 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-950">
                    {isCurrent ? (
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                      </span>
                    ) : (
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 fill-emerald-50 dark:fill-slate-950 shrink-0" />
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!canView}
                    onClick={() => {
                      if (canView) {
                        setSelectedStepKey(step.stepKey)
                      }
                    }}
                    className={`w-full text-left rounded-xl border p-3 transition duration-150 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/10 shadow-sm dark:border-blue-900 dark:bg-blue-950/20'
                        : !canView
                        ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed dark:border-slate-900 dark:bg-slate-900/10'
                        : 'border-slate-200 bg-white hover:border-slate-350 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight">
                      {index + 1}. {step.adimAdi}
                    </p>
                    <span className="text-[10px] mt-1.5 block font-bold text-slate-400 uppercase tracking-wide">
                      {!canView
                        ? 'Görüntüleme yetkisi yok'
                        : isCurrent
                        ? 'Mevcut adım (Aktif)'
                        : 'Tamamlandı (Salt okunur)'}
                    </span>
                  </button>
                </div>
              )
            })}
          </div>

          {relatedSteps.length > 0 ? (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-900 space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <GitBranch className="h-4 w-4 text-purple-600" />
                İlişkili Adımlar
              </h2>
              <div className="space-y-2">
                {relatedSteps.map((step, index) => {
                  const isSelected = step.stepKey === selectedStepKey
                  const canView = step.form.length > 0
                  return (
                    <button
                      key={`${step.stepKey}-${index}`}
                      type="button"
                      disabled={!canView}
                      onClick={() => {
                        if (canView) {
                          setSelectedStepKey(step.stepKey)
                        }
                      }}
                      className={`w-full text-left rounded-xl border p-3 transition duration-150 ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50/15 dark:border-purple-900 dark:bg-purple-950/20'
                          : !canView
                          ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed dark:border-slate-900'
                          : 'border-dashed border-slate-250 bg-white hover:border-slate-350 dark:border-slate-800 dark:bg-slate-950'
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-850 dark:text-white truncate">
                        {step.relatedTask?.akisAdi?.trim() || 'İlişkili Akış'}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1 font-semibold">{step.adimAdi}</p>
                      <span className="text-[9px] mt-1.5 block font-bold text-slate-400 uppercase tracking-wider">
                        Süreç #{step.relatedTask?.surecId ?? '-'} | İlişkili Adım
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </aside>

        {/* Right Section: Form Fields Container */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {!selectedStep ? (
            <div className="p-8 text-center text-sm font-semibold text-slate-400">
              Görüntülenecek adım bulunamadı.
            </div>
          ) : (
            <>
              {/* Form Step Banner */}
              <header className="p-5 border-b border-slate-100 bg-slate-50/40 dark:border-slate-900 dark:bg-slate-900/10 rounded-t-2xl">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{selectedStep.adimAdi}</h2>
                <div className="mt-2.5 flex items-start gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                  <p>
                    {selectedStep?.source === 'related'
                      ? 'Bu adım ilişkili bir akıştan gelmektedir ve salt okunur olarak görüntülenmektedir.'
                      : isCurrentStepSelected
                      ? 'Bu adım size atanmıştır. Form alanlarını doldurarak işlemi tamamlayabilirsiniz.'
                      : 'Bu adım sadece görüntülenebilir. Form alanları salt okunur durumdadır.'}
                  </p>
                </div>
              </header>

              <div className="p-6">
                {(isCurrentStepSelected ? form : selectedStep.form).length === 0 ? (
                  <p className="text-center py-8 text-sm font-semibold text-slate-400">Bu adım için tanımlanmış alan bulunmamaktadır.</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-1">
                    {(isCurrentStepSelected ? form : selectedStep.form).map((field) => (
                      <TaskFieldRenderer
                        key={`${selectedStep.stepKey}-${field.fieldId}`}
                        field={isCurrentStepSelected ? field : { ...field, editable: false }}
                        value={field.value ?? ''}
                        fileName={isCurrentStepSelected ? filesByFieldId[field.fieldId]?.name : undefined}
                        onChange={isCurrentStepSelected ? handleChange : () => undefined}
                        onFileChange={isCurrentStepSelected ? handleFileChange : () => undefined}
                      />
                    ))}
                  </div>
                )}

                {/* Form Action Controls */}
                {isCurrentStepSelected && editableCount > 0 ? (
                  <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-900 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={loadingAction !== null}
                      onClick={() => handleSubmitAction(2)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/30 px-5 py-3 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-50 transition active:scale-[0.98] disabled:opacity-50 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-400"
                    >
                      <Save className="h-4 w-4" />
                      {loadingAction === 'save' ? 'Kaydediliyor...' : 'Taslak Kaydet'}
                    </button>
                    <button
                      type="button"
                      disabled={loadingAction !== null}
                      onClick={openRejectModal}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-rose-700 transition active:scale-[0.98] disabled:opacity-50 ml-auto"
                    >
                      <XCircle className="h-4 w-4" />
                      {loadingAction === 'cancel' ? 'Reddediliyor...' : 'Reddet'}
                    </button>
                    <button
                      type="button"
                      disabled={loadingAction !== null}
                      onClick={() => handleSubmitAction(1)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition active:scale-[0.98] disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      {loadingAction === 'submit' ? 'Gönderiliyor...' : 'Gönder'}
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Back to list button */}
      <div className="pt-4">
        <button
          type="button"
          onClick={() => navigate('/tasks')}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Görev Listesine Dön
        </button>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600">Görev Reddetme</p>
                <h3 className="mt-1.5 text-lg font-extrabold text-slate-900 dark:text-white">Reddetme Açıklaması</h3>
                <p className="mt-0.5 text-xs text-slate-400 font-semibold">Görevi reddetmek için bir gerekçe yazmanız gerekmektedir.</p>
              </div>
              <button
                type="button"
                onClick={closeRejectModal}
                className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition disabled:opacity-50"
                disabled={loadingAction === 'cancel'}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-2">
              <label htmlFor="reject-textarea" className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Açıklama / Gerekçe
              </label>
              <textarea
                id="reject-textarea"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:bg-slate-950"
                rows={5}
                value={rejectAciklama}
                onChange={(event) => {
                  setRejectAciklama(event.target.value)
                  if (rejectValidationError) {
                    setRejectValidationError(null)
                  }
                }}
                placeholder="Lütfen reddetme gerekçesini detaylıca buraya yazınız..."
                disabled={loadingAction === 'cancel'}
              />

              {rejectValidationError ? (
                <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5 mt-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {rejectValidationError}
                </p>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-900 pt-4">
              <button
                type="button"
                onClick={closeRejectModal}
                disabled={loadingAction === 'cancel'}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-355 dark:text-slate-300 dark:hover:bg-slate-800 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={loadingAction === 'cancel'}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 transition active:scale-[0.99] disabled:cursor-not-allowed"
              >
                {loadingAction === 'cancel' ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Reddediliyor...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Görevi Reddet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

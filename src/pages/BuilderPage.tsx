import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useNavigate, useParams } from 'react-router-dom'
import {
  PenTool,
  Eye,
  Save
} from 'lucide-react'
import type { FormField, FieldType } from '../types/form'
import type { FlowStep, ExternalFlowCancelBehavior } from '../types/flow'
import { useFlowStore } from '../store/flowStore'
import { fetchFlows, saveFlow, type FlowListItem, type SaveFlowPayload } from '../services/flowApi'
import Toolbox from '../components/Toolbox'
import Canvas from '../components/Canvas'
import PropertiesPanel from '../components/PropertiesPanel'
import StepNavigation from '../components/StepNavigation'

const typeDefaults: Record<FieldType, Partial<FormField>> = {
  TEXT: { label: 'Metin Girişi', placeholder: 'Yazı girin' },
  TEXTAREA: { label: 'Metin Alanı', placeholder: 'Metin girin' },
  COMBOBOX: {
    label: 'Açılır Liste',
    options: [{ label: 'Seçenek A', value: 'A' }],
  },
  RADIO: {
    label: 'Radyo Grubu',
    options: [{ label: 'Seçenek 1', value: '1' }],
  },
  CHECKBOX: { label: 'Onay Kutusu' },
  DATE: { label: 'Tarih' },
  NUMBER: { label: 'Sayı', placeholder: '0' },
  FILE: { label: 'Dosya Yükleme' },
  BUTTON: { label: 'Buton' },
}

type DragMeta = {
  from?: 'toolbox' | 'canvas'
  fieldType?: FieldType
  template?: Partial<FormField>
}

type ActiveDragState = {
  id: string
  from: 'toolbox' | 'canvas'
  label: string
}

function createField(type: FieldType, id: string, template?: Partial<FormField>): FormField {
  const mergedOptions = template?.options ?? typeDefaults[type].options

  return {
    id,
    type,
    label: template?.label ?? typeDefaults[type].label ?? type,
    placeholder: template?.placeholder ?? typeDefaults[type].placeholder,
    required: false,
    options: mergedOptions ? [...mergedOptions] : undefined,
    accept: template?.accept,
    multiple: template?.multiple,
  }
}

function isBlank(value?: string) {
  return !value || value.trim().length === 0
}

function normalizeRequiredApprovalCount(value?: number) {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.floor(value as number))
}

function validateFieldDefinition(field: FormField): string | null {
  if (isBlank(field.label)) {
    return 'Alan etiketleri boş bırakılamaz.'
  }

  const needsPlaceholder = ['TEXT', 'TEXTAREA', 'NUMBER'].includes(field.type)
  if (needsPlaceholder && isBlank(field.placeholder)) {
    return `${field.label || field.type} alanı için yer tutucu boş bırakılamaz.`
  }

  if ((field.type === 'COMBOBOX' || field.type === 'RADIO')) {
    if (!field.options || field.options.length === 0) {
      return `${field.label || field.type} alanı için en az bir seçenek eklenmelidir.`
    }

    const hasInvalidOption = field.options.some((option) => isBlank(option.label) || isBlank(option.value))
    if (hasInvalidOption) {
      return `${field.label || field.type} alanındaki tüm seçenekler dolu olmalidir.`
    }
  }

  return null
}

function validateStepDefinition(step: FlowStep): string | null {
  if (isBlank(step.stepName)) {
    return 'Adım adı boş bırakılamaz.'
  }

  if (!step.fields || step.fields.length === 0) {
    return `${step.stepName || `Adım ${step.stepId}`} için en az bir alan eklenmelidir.`
  }

  for (const field of step.fields) {
    const fieldError = validateFieldDefinition(field)
    if (fieldError) return fieldError
  }

  if (step.externalFlowEnabled && !step.externalFlowId) {
    return `${step.stepName || `Adım ${step.stepId}`} için dış akış seçimi zorunludur.`
  }

  if (!Number.isFinite(step.requiredApprovalCount) || step.requiredApprovalCount < 1) {
    return `${step.stepName || `Adım ${step.stepId}`} için gerekli onay sayısı en az 1 olmalıdır.`
  }

  return null
}

export default function BuilderPage() {
  const navigate = useNavigate()
  const { stepId } = useParams<{ stepId: string }>()
  const flowName = useFlowStore((state) => state.flowName)
  const setFlowName = useFlowStore((state) => state.setFlowName)
  const aciklama = useFlowStore((state) => state.aciklama)
  const setAciklama = useFlowStore((state) => state.setAciklama)
  const starterRoleIds = useFlowStore((state) => state.starterRoleIds)
  const starterUserIds = useFlowStore((state) => state.starterUserIds)
  const steps = useFlowStore((state) => state.steps)
  const updateStepFields = useFlowStore((state) => state.updateStepFields)
  const updateStepName = useFlowStore((state) => state.updateStepName)
  const updateStepRequiredApprovalCount = useFlowStore(
    (state) => state.updateStepRequiredApprovalCount,
  )
  const updateStepExternalFlow = useFlowStore((state) => state.updateStepExternalFlow)
  const resetFlow = useFlowStore((state) => state.resetFlow)

  const currentStepId = Number(stepId)
  const currentStep = steps.find((step) => step.stepId === currentStepId)

  const [fields, setFields] = useState<FormField[]>(currentStep?.fields ?? [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null)
  const [saving, setSaving] = useState(false)
  const [availableFlows, setAvailableFlows] = useState<FlowListItem[]>([])
  const [loadingFlows, setLoadingFlows] = useState(false)
  const [flowLoadError, setFlowLoadError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  useEffect(() => {
    setFields(currentStep?.fields ?? [])
    setSelectedId(null)
  }, [currentStepId])

  useEffect(() => {
    let mounted = true

    const loadFlows = async () => {
      try {
        setLoadingFlows(true)
        setFlowLoadError(null)
        const data = await fetchFlows()
        if (mounted) {
          setAvailableFlows(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        if (mounted) {
          setFlowLoadError('Akış listesi yüklenemedi.')
        }
      } finally {
        if (mounted) {
          setLoadingFlows(false)
        }
      }
    }

    loadFlows()

    return () => {
      mounted = false
    }
  }, [])

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedId) ?? null,
    [fields, selectedId],
  )
  const flowNameById = useMemo(() => {
    const entries = availableFlows.map((flow) => [flow.akisId, flow.akisAdi] as const)
    return new Map<number, string>(entries)
  }, [availableFlows])

  const updateFields = (next: FormField[]) => {
    setFields(next)
    if (currentStep) {
      updateStepFields(currentStep.stepId, next)
    }
  }

  const findFieldIndexById = (id: string) => fields.findIndex((item) => item.id === id)

  const handleSelect = (id: string) => {
    setSelectedId(id)
  }

  const handleDelete = (id: string) => {
    const next = fields.filter((field) => field.id !== id)
    updateFields(next)
    setSelectedId((prev) => (prev === id ? null : prev))
  }

  const handleUpdate = (updated: FormField) => {
    const next = fields.map((field) => (field.id === updated.id ? updated : field))
    updateFields(next)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const activeMeta = event.active.data.current as DragMeta | undefined
    const from = activeMeta?.from === 'canvas' ? 'canvas' : 'toolbox'
    const label =
      from === 'toolbox'
        ? activeMeta?.template?.label ?? activeMeta?.fieldType ?? 'Yeni Alan'
        : fields.find((item) => item.id === String(event.active.id))?.label ?? 'Taşınıyor'

    setActiveDrag({
      id: String(event.active.id),
      from,
      label: String(label),
    })
  }

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveDrag(null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDrag(null)

    if (!over) return

    const activeMeta = active.data.current as DragMeta | undefined
    const activeFrom = activeMeta?.from
    const fieldType = activeMeta?.fieldType
    const template = activeMeta?.template

    if (activeFrom === 'toolbox' && fieldType) {
      const overId = String(over.id)
      const isCanvasTarget = overId === 'canvas-drop' || findFieldIndexById(overId) !== -1
      if (!isCanvasTarget) return

      const newId = `field-${currentStepId}-${Date.now()}`
      const newField = createField(fieldType, newId, template)
      const overIndex = findFieldIndexById(overId)

      if (overIndex === -1) {
        updateFields([...fields, newField])
      } else {
        const next = [...fields]
        next.splice(overIndex, 0, newField)
        updateFields(next)
      }
      setSelectedId(newId)
      return
    }

    if (activeFrom === 'canvas' && active.id !== over.id && String(over.id) !== 'canvas-drop') {
      const oldIndex = fields.findIndex((item) => item.id === String(active.id))
      const newIndex = fields.findIndex((item) => item.id === String(over.id))
      if (oldIndex === -1 || newIndex === -1) return
      updateFields(arrayMove(fields, oldIndex, newIndex))
    }
  }

  const handlePrev = () => {
    if (currentStepId > 1) {
      navigate(`/builder/${currentStepId - 1}`)
    }
  }

  const handleNext = () => {
    if (!currentStep) return
    const stepError = validateStepDefinition(currentStep)
    if (stepError) {
      alert(stepError)
      return
    }

    if (currentStepId < steps.length) {
      navigate(`/builder/${currentStepId + 1}`)
    }
  }

  const buildPayload = useCallback((): SaveFlowPayload => {
    // Flow baslatma yetkileri (flow seviyesinde) sadece CreateFlow ekranindan gelir.
    const baslatmaYetkileri: SaveFlowPayload['baslatmaYetkileri'] = [
      ...starterRoleIds.map((roleId) => ({ tip: 'ROLE' as const, refId: roleId })),
      ...starterUserIds.map((userId) => ({ tip: 'USER' as const, refId: userId })),
    ]

    // Form bileseni yetkileri (alan seviyesinde) field.permissions listesinden gelir.
    const stepPayload: SaveFlowPayload['steps'] = steps.map((step, stepIndex) => ({
      stepName: step.stepName,
      stepOrder: stepIndex + 1,
      requiredApprovalCount: normalizeRequiredApprovalCount(step.requiredApprovalCount),
      fields: step.fields.map((field, fieldIndex) => ({
        type: field.type,
        label: field.label,
        placeholder: field.placeholder ?? '',
        required: Boolean(field.required),
        orderNo: fieldIndex + 1,
        permissions: field.permissions ?? [],
        options: field.options ?? [],
        ...(field.type === 'FILE'
          ? {
              accept: field.accept ?? '',
              multiple: Boolean(field.multiple),
            }
          : {}),
      })),
      ...(step.externalFlowEnabled
        ? {
            externalFlowEnabled: true,
            externalFlowId: step.externalFlowId ?? null,
            subFlowId: step.externalFlowId ?? null,
            nextFlowId: step.externalFlowId ?? null,
            waitForExternalFlowCompletion: Boolean(step.waitForExternalFlowCompletion),
            resumeParentAfterSubFlow: Boolean(step.resumeParentAfterSubFlow),
            cancelBehavior: step.cancelBehavior ?? 'PROPAGATE',
          }
        : {}),
    }))

    return {
      flowName,
      aciklama,
      baslatmaYetkileri,
      steps: stepPayload,
    }
  }, [flowName, aciklama, starterRoleIds, starterUserIds, steps])

  const handleSave = useCallback(async () => {
    const invalidStep = steps.find((step) => validateStepDefinition(step) !== null)
    if (invalidStep) {
      const invalidStepError = validateStepDefinition(invalidStep)
      alert(invalidStepError ?? 'Step doğrulaması başarısız.')
      return
    }

    const invalidExternalStep = steps.find(
      (step) => step.externalFlowEnabled && !step.externalFlowId,
    )

    if (invalidExternalStep) {
      alert(`${invalidExternalStep.stepName} için dış akış seçmeden kaydedemezsiniz.`)
      return
    }

    try {
      setSaving(true)
      const payload = buildPayload()
      const response = await saveFlow(payload)
      alert('Başarılı')
      console.log(response)
      resetFlow()
      navigate('/', { replace: true })
    } catch (error) {
      console.error(error)
      alert('Kayıt sırasında hata oluştu')
    } finally {
      setSaving(false)
    }
  }, [buildPayload, navigate, resetFlow])

  if (!steps.length) {
    return (
      <div className="empty-flow">
        <div className="dashboard-card">
          <h1>Henüz akış oluşturulmadı</h1>
          <p>Önce akış oluşturup adım sayısını belirleyin.</p>
          <button
            className="button primary"
            type="button"
            onClick={() => navigate('/create-flow')}
          >
            Akış Oluştur
          </button>
        </div>
      </div>
    )
  }

  if (!currentStep) {
    return (
      <div className="empty-flow">
        <div className="dashboard-card">
          <h1>Adım bulunamadı</h1>
          <button className="button primary" type="button" onClick={() => navigate('/builder/1')}>
            İlk Adıma Git
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="builder form-designer-page">
      {/* Compact Hero Header */}
      <header className="builder-header relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-850/50">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-400/5 blur-2xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 dark:bg-blue-500">
              <PenTool className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">İş Akışları / Yeni Akış / Form Tasarımcısı</p>
              <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">Form Tasarımı</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition active:scale-95"
              type="button"
              onClick={() => navigate(`/preview/${currentStepId}`)}
            >
              <Eye className="h-3.5 w-3.5" /> Önizle
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold shadow-sm shadow-blue-500/10 transition active:scale-95"
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-3.5 w-3.5" /> {saving ? 'Kaydediliyor...' : 'Kaydet ve Devam Et'}
            </button>
          </div>
        </div>
      </header>

      {/* Step Pill Bar (Very Compact) */}
      <div className="step-bar mt-2.5">
        <div className="step-list flex flex-wrap gap-1.5">
          {steps.map((step, index) => {
            const linkedFlowId =
              step.externalFlowEnabled && step.externalFlowId ? step.externalFlowId : null
            const linkedFlowName = linkedFlowId ? flowNameById.get(linkedFlowId) : null
            const hasNextStep = index < steps.length - 1

            return (
              <Fragment key={step.stepId}>
                <button
                  className={`step-pill px-3.5 py-1 text-[11.5px] font-bold rounded-full transition ${
                    step.stepId === currentStepId
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                      : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
                  }`}
                  type="button"
                  onClick={() => navigate(`/builder/${step.stepId}`)}
                >
                  {step.stepName || `Adım ${step.stepId}`}
                </button>
                {hasNextStep && linkedFlowId ? (
                  <button
                    className="embedded-flow-pill px-2.5 py-1 text-[10.5px] font-bold rounded-full bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400 hover:bg-amber-100 transition"
                    type="button"
                    onClick={() => navigate(`/preview/${linkedFlowId}`)}
                    title="Ara akış özetini aç"
                  >
                    Ara Akış: {linkedFlowName ?? `#${linkedFlowId}`}
                  </button>
                ) : null}
              </Fragment>
            )
          })}
        </div>
        <div className="step-progress mt-2 h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="step-progress-bar h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-305"
            style={{ width: `${(currentStepId / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* DnD Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="builder-grid mt-3">
          <Toolbox />
          <SortableContext
            items={fields.map((field) => field.id)}
            strategy={verticalListSortingStrategy}
          >
            <Canvas
              fields={fields}
              selectedId={selectedId}
              onSelect={handleSelect}
              onDelete={handleDelete}
            />
          </SortableContext>
          <PropertiesPanel
            field={selectedField}
            onUpdate={handleUpdate}
            currentStepRequiredApprovalCount={normalizeRequiredApprovalCount(
              currentStep.requiredApprovalCount,
            )}
            onUpdateStepRequiredApprovalCount={(count) =>
              updateStepRequiredApprovalCount(currentStep.stepId, count)
            }
            flowName={flowName}
            setFlowName={setFlowName}
            aciklama={aciklama ?? ''}
            setAciklama={setAciklama}
            stepName={currentStep.stepName}
            onUpdateStepName={(val) => updateStepName(currentStep.stepId, val)}
            externalFlowEnabled={Boolean(currentStep.externalFlowEnabled)}
            externalFlowId={currentStep.externalFlowId ?? null}
            waitForExternalFlowCompletion={Boolean(currentStep.waitForExternalFlowCompletion)}
            resumeParentAfterSubFlow={Boolean(currentStep.resumeParentAfterSubFlow)}
            cancelBehavior={currentStep.cancelBehavior ?? 'PROPAGATE'}
            onUpdateStepExternalFlow={(updates) => updateStepExternalFlow(currentStep.stepId, updates)}
            availableFlows={availableFlows}
            loadingFlows={loadingFlows}
            flowLoadError={flowLoadError}
          />
        </div>
        <DragOverlay dropAnimation={null}>
          {activeDrag ? (
            <div className="drag-overlay">
              {activeDrag.from === 'toolbox' ? `Yeni: ${activeDrag.label}` : activeDrag.label}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Adım Sonrası Dış Akış */}
      <div className="step-link-editor mt-3 border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 rounded-2xl">
        <div className="step-link-top flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-200">Adım Sonrası Dış Akış</h3>
            <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">Bu adım tamamlandığında, sonraki adıma geçmeden önce seçilen akış çalışsın mı?</p>
          </div>
          <label className="step-link-toggle flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-650 dark:text-slate-350">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={Boolean(currentStep.externalFlowEnabled)}
              onChange={(event) =>
                updateStepExternalFlow(currentStep.stepId, {
                  externalFlowEnabled: event.target.checked,
                })
              }
            />
            <span>Dış akış başlat</span>
          </label>
        </div>

        {currentStep.externalFlowEnabled ? (
          <div className="step-link-controls mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Başlatılacak Dış Akış</span>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  value={currentStep.externalFlowId ?? ''}
                  onChange={(event) =>
                    updateStepExternalFlow(currentStep.stepId, {
                      externalFlowEnabled: true,
                      externalFlowId: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                  disabled={loadingFlows}
                >
                  <option value="">
                    {loadingFlows ? 'Akışlar yükleniyor...' : 'Akış seçin'}
                  </option>
                  {availableFlows.map((flow) => (
                    <option key={flow.akisId} value={flow.akisId}>
                      {flow.akisAdi} (ID: {flow.akisId})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">İptal Davranışı</span>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  value={currentStep.cancelBehavior ?? 'PROPAGATE'}
                  onChange={(event) =>
                    updateStepExternalFlow(currentStep.stepId, {
                      cancelBehavior: event.target.value as ExternalFlowCancelBehavior,
                    })
                  }
                >
                  <option value="PROPAGATE">Alt akış reddedilirse ana akış da iptal olsun</option>
                  <option value="WAIT">Ana akış beklemede kalsın</option>
                </select>
              </label>
            </div>

            <div className="space-y-3 flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={Boolean(currentStep.waitForExternalFlowCompletion)}
                  onChange={(event) =>
                    updateStepExternalFlow(currentStep.stepId, {
                      waitForExternalFlowCompletion: event.target.checked,
                    })
                  }
                />
                <span className="text-[12px] font-medium text-slate-650 dark:text-slate-400">Alt akış tamamlanmadan bekle</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={Boolean(currentStep.resumeParentAfterSubFlow)}
                  onChange={(event) =>
                    updateStepExternalFlow(currentStep.stepId, {
                      resumeParentAfterSubFlow: event.target.checked,
                    })
                  }
                />
                <span className="text-[12px] font-medium text-slate-655 dark:text-slate-400">Alt akıştan sonra ana akış devam etsin</span>
              </label>

              {flowLoadError && <p className="text-xs text-rose-500 font-bold">{flowLoadError}</p>}
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                * Seçilen akış tamamlandıktan sonra mevcut akışın bir sonraki adımına dönülür.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <StepNavigation
        currentStep={currentStepId}
        totalSteps={steps.length}
        onPrev={handlePrev}
        onNext={handleNext}
        onFinish={handleSave}
      />
    </div>
  )
}

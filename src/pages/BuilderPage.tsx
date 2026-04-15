import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useNavigate, useParams } from 'react-router-dom'
import type { FormField, FieldType } from '../types/form'
import type { ExternalFlowCancelBehavior, FlowStep } from '../types/flow'
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

function validateFieldDefinition(field: FormField): string | null {
  if (isBlank(field.label)) {
    return 'Alan etiketleri bos birakilamaz.'
  }

  const needsPlaceholder = ['TEXT', 'TEXTAREA', 'NUMBER'].includes(field.type)
  if (needsPlaceholder && isBlank(field.placeholder)) {
    return `${field.label || field.type} alani icin yer tutucu bos birakilamaz.`
  }

  if ((field.type === 'COMBOBOX' || field.type === 'RADIO')) {
    if (!field.options || field.options.length === 0) {
      return `${field.label || field.type} alani icin en az bir secenek eklenmelidir.`
    }

    const hasInvalidOption = field.options.some((option) => isBlank(option.label) || isBlank(option.value))
    if (hasInvalidOption) {
      return `${field.label || field.type} alanindaki tum secenekler dolu olmalidir.`
    }
  }

  return null
}

function validateStepDefinition(step: FlowStep): string | null {
  if (isBlank(step.stepName)) {
    return 'Adim adi bos birakilamaz.'
  }

  if (!step.fields || step.fields.length === 0) {
    return `${step.stepName || `Adim ${step.stepId}`} icin en az bir alan eklenmelidir.`
  }

  for (const field of step.fields) {
    const fieldError = validateFieldDefinition(field)
    if (fieldError) return fieldError
  }

  if (step.externalFlowEnabled && !step.externalFlowId) {
    return `${step.stepName || `Adim ${step.stepId}`} icin dis akis secimi zorunludur.`
  }

  return null
}

export default function BuilderPage() {
  const navigate = useNavigate()
  const { stepId } = useParams<{ stepId: string }>()
  const flowName = useFlowStore((state) => state.flowName)
  const aciklama = useFlowStore((state) => state.aciklama)
  const starterRoleIds = useFlowStore((state) => state.starterRoleIds)
  const starterUserIds = useFlowStore((state) => state.starterUserIds)
  const steps = useFlowStore((state) => state.steps)
  const updateStepFields = useFlowStore((state) => state.updateStepFields)
  const updateStepName = useFlowStore((state) => state.updateStepName)
  const updateStepExternalFlow = useFlowStore((state) => state.updateStepExternalFlow)
  const resetFlow = useFlowStore((state) => state.resetFlow)

  const currentStepId = Number(stepId)
  const currentStep = steps.find((step) => step.stepId === currentStepId)

  const [fields, setFields] = useState<FormField[]>(currentStep?.fields ?? [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
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
          setFlowLoadError('Akis listesi yuklenemedi.')
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
    setActiveDragId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)

    if (!over) return

    const activeMeta = active.data.current as DragMeta | undefined
    const activeFrom = activeMeta?.from
    const fieldType = activeMeta?.fieldType
    const template = activeMeta?.template

    if (activeFrom === 'toolbox' && fieldType) {
      if (over.id === 'canvas-drop') {
        const newId = `field-${currentStepId}-${Date.now()}`
        const newField = createField(fieldType, newId, template)
        updateFields([...fields, newField])
        setSelectedId(newId)
      }
      return
    }

    if (activeFrom === 'canvas' && active.id !== over.id) {
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

    // Form bileşeni yetkileri (alan seviyesinde) field.permissions listesinden gelir.
    const stepPayload: SaveFlowPayload['steps'] = steps.map((step, stepIndex) => ({
      stepName: step.stepName,
      stepOrder: stepIndex + 1,
      fields: step.fields.map((field, fieldIndex) => ({
        type: field.type,
        label: field.label,
        placeholder: field.placeholder ?? '',
        required: Boolean(field.required),
        orderNo: fieldIndex + 1,
        permissions: field.permissions ?? [],
        options: field.options ?? [],
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
      alert(invalidStepError ?? 'Step dogrulamasi basarisiz.')
      return
    }

    const invalidExternalStep = steps.find(
      (step) => step.externalFlowEnabled && !step.externalFlowId,
    )

    if (invalidExternalStep) {
      alert(`${invalidExternalStep.stepName} icin dis akis secmeden kaydedemezsiniz.`)
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
    <div className="builder">
      <header className="builder-header">
        <div>
          <span className="page-kicker">Akış Tasarımı</span>
          <h1>{flowName || 'Yeni Akış'}</h1>
          <p>Adım tasarımını tamamlayın.</p>
        </div>
        <div className="header-actions">
          <button className="button secondary" type="button" onClick={() => navigate('/')}>
            Panele Dön
          </button>
          <button className="button primary" type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </header>

      <div className="builder-summary">
        <div className="summary-card">
          <span>Akış Adı</span>
          <strong>{flowName || 'Yeni Akış'}</strong>
        </div>
        <div className="summary-card">
          <span>Adım</span>
          <strong>
            {currentStepId} / {steps.length}
          </strong>
        </div>
        <div className="summary-card">
          <span>Alan Sayısı</span>
          <strong>{fields.length}</strong>
        </div>
      </div>

      <div className="step-name-editor">
        <label>
          <span>Adım Adı</span>
          <input
            className="input"
            value={currentStep.stepName}
            onChange={(event) => updateStepName(currentStep.stepId, event.target.value)}
            placeholder={`Adım ${currentStep.stepId}`}
          />
        </label>
      </div>

      <div className="step-link-editor">
        <div className="step-link-top">
          <div>
            <h3>Adim Sonrasi Dis Akis</h3>
            <p>Bu adim tamamlandiginda, sonraki adıma gecmeden once secilen akis calissin mi?</p>
          </div>
          <label className="step-link-toggle">
            <input
              type="checkbox"
              checked={Boolean(currentStep.externalFlowEnabled)}
              onChange={(event) =>
                updateStepExternalFlow(currentStep.stepId, {
                  externalFlowEnabled: event.target.checked,
                })
              }
            />
            <span>Dis akis baslat</span>
          </label>
        </div>

        {currentStep.externalFlowEnabled ? (
          <div className="step-link-controls">
            <label>
              <span>Baslatilacak Akis</span>
              <select
                className="input"
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
                  {loadingFlows ? 'Akislar yukleniyor...' : 'Akis secin'}
                </option>
                {availableFlows.map((flow) => (
                  <option key={flow.akisId} value={flow.akisId}>
                    {flow.akisAdi} (ID: {flow.akisId})
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={Boolean(currentStep.waitForExternalFlowCompletion)}
                onChange={(event) =>
                  updateStepExternalFlow(currentStep.stepId, {
                    waitForExternalFlowCompletion: event.target.checked,
                  })
                }
              />
              <span>Alt akis tamamlanmadan bekle</span>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={Boolean(currentStep.resumeParentAfterSubFlow)}
                onChange={(event) =>
                  updateStepExternalFlow(currentStep.stepId, {
                    resumeParentAfterSubFlow: event.target.checked,
                  })
                }
              />
              <span>Alt akistan sonra ana akis devam etsin</span>
            </label>
            <label>
              <span>Iptal Davranisi</span>
              <select
                className="input"
                value={currentStep.cancelBehavior ?? 'PROPAGATE'}
                onChange={(event) =>
                  updateStepExternalFlow(currentStep.stepId, {
                    cancelBehavior: event.target.value as ExternalFlowCancelBehavior,
                  })
                }
              >
                <option value="PROPAGATE">Alt akis reddedilirse ana akis da iptal olsun</option>
                <option value="WAIT">Ana akis beklemede kalsin</option>
              </select>
            </label>
            {flowLoadError ? <p className="error-text">{flowLoadError}</p> : null}
            <p className="hint">
              Secilen akis tamamlandiktan sonra mevcut akisin bir sonraki adimina donulur.
            </p>
          </div>
        ) : null}
      </div>

      <div className="step-bar">
        <div className="step-list">
          {steps.map((step, index) => {
            const linkedFlowId =
              step.externalFlowEnabled && step.externalFlowId ? step.externalFlowId : null
            const linkedFlowName = linkedFlowId ? flowNameById.get(linkedFlowId) : null
            const hasNextStep = index < steps.length - 1

            return (
              <Fragment key={step.stepId}>
                <button
                  className={`step-pill ${step.stepId === currentStepId ? 'active' : ''}`}
                  type="button"
                  onClick={() => navigate(`/builder/${step.stepId}`)}
                >
                  {step.stepName}
                </button>
                {hasNextStep && linkedFlowId ? (
                  <button
                    className="embedded-flow-pill"
                    type="button"
                    onClick={() => navigate(`/preview/${linkedFlowId}`)}
                    title="Ara akis onizlemesini ac"
                  >
                    Ara Akis: {linkedFlowName ?? `#${linkedFlowId}`}
                  </button>
                ) : null}
              </Fragment>
            )
          })}
        </div>
        <div className="step-progress">
          <div
            className="step-progress-bar"
            style={{ width: `${(currentStepId / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="builder-grid">
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
          <PropertiesPanel field={selectedField} onUpdate={handleUpdate} />
        </div>
        <DragOverlay>
          {activeDragId ? (
            <div className="drag-overlay">
              {activeDragId.startsWith('toolbox-') ? 'Yeni Alan' : 'Taşınıyor'}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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



import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { useFlowStore } from '../store/flowStore'
import { saveFlow } from '../services/flowApi'
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
}

function createField(type: FieldType, id: string): FormField {
  return {
    id,
    type,
    label: typeDefaults[type].label ?? type,
    placeholder: typeDefaults[type].placeholder,
    required: false,
    options: typeDefaults[type].options,
  }
}

export default function BuilderPage() {
  const navigate = useNavigate()
  const { stepId } = useParams<{ stepId: string }>()
  const flowName = useFlowStore((state) => state.flowName)
  const aciklama = useFlowStore((state) => state.aciklama)
  const steps = useFlowStore((state) => state.steps)
  const updateStepFields = useFlowStore((state) => state.updateStepFields)

  const currentStepId = Number(stepId)
  const currentStep = steps.find((step) => step.stepId === currentStepId)

  const [fields, setFields] = useState<FormField[]>(currentStep?.fields ?? [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  useEffect(() => {
    setFields(currentStep?.fields ?? [])
    setSelectedId(null)
  }, [currentStepId, currentStep?.fields])

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedId) ?? null,
    [fields, selectedId],
  )

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

    if (activeFrom === 'toolbox' && fieldType) {
      if (over.id === 'canvas-drop') {
        const newId = `field-${currentStepId}-${Date.now()}`
        const newField = createField(fieldType, newId)
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
    if (currentStepId < steps.length) {
      navigate(`/builder/${currentStepId + 1}`)
    }
  }

  const buildPayload = useCallback(() => {
    return {
      flowName,
      aciklama,
      steps: steps.map((step, stepIndex) => ({
        stepName: step.stepName,
        stepOrder: stepIndex + 1,
        fields: step.fields.map((field, fieldIndex) => ({
          type: field.type,
          label: field.label,
          placeholder: field.placeholder ?? '',
          required: Boolean(field.required),
          orderNo: fieldIndex + 1,
          options: field.options ?? [],
        })),
      })),
    }
  }, [flowName, aciklama, steps])

  const handleSave = useCallback(async () => {
    try {
      setSaving(true)
      const payload = buildPayload()
      const response = await saveFlow(payload)
      alert('Başaraılı')
      console.log(response)
    } catch (error) {
      console.error(error)
      alert('Kayıt sırasında hata oluştu')
    } finally {
      setSaving(false)
    }
  }, [buildPayload])

  if (!steps.length) {
    return (
      <div className="empty-flow">
        <div className="dashboard-card">
          <h1>Henüz flow oluşturulmadı</h1>
          <p>Önce flow oluşturma adımı sayısını belirleyin.</p>
          <button
            className="button primary"
            type="button"
            onClick={() => navigate('/create-flow')}
          >
            Flow Oluştur
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
          <h1>{flowName || 'Yeni Flow'}</h1>
          <p>Adım tasarımı tamamlayınız.</p>
        </div>
        <button className="button primary" type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </header>

      <div className="step-bar">
        <div className="step-list">
          {steps.map((step) => (
            <button
              key={step.stepId}
              className={`step-pill ${step.stepId === currentStepId ? 'active' : ''}`}
              type="button"
              onClick={() => navigate(`/builder/${step.stepId}`)}
            >
              {step.stepName}
            </button>
          ))}
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
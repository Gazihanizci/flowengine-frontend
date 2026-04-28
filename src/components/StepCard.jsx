import { useEffect, useState } from 'react'
import FieldCard from './FieldCard'

export default function StepCard({
  step,
  selectedFieldId,
  savingStep,
  savingFieldIds,
  onStepNameSave,
  onFieldClick,
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(step.stepName || '')

  useEffect(() => {
    if (!editingTitle) {
      setTitleDraft(step.stepName || '')
    }
  }, [editingTitle, step.stepName])

  function commitTitle() {
    const nextName = titleDraft.trim()
    setEditingTitle(false)

    if (!nextName || nextName === step.stepName) {
      setTitleDraft(step.stepName || '')
      return
    }

    onStepNameSave(step.stepId, nextName)
  }

  return (
    <section className="panel flow-live-step-card">
      <div className="flow-live-step-head">
        {editingTitle ? (
          <input
            autoFocus
            className="input flow-live-step-input"
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur()
              }
              if (event.key === 'Escape') {
                setEditingTitle(false)
                setTitleDraft(step.stepName || '')
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="flow-live-step-title"
            onClick={() => setEditingTitle(true)}
          >
            {step.stepName || 'İsimsiz Adım'}
          </button>
        )}
        <span className="flow-live-step-order">#{step.stepOrder}</span>
        {savingStep ? <span className="flow-live-saving-chip">Kaydediliyor...</span> : null}
      </div>

      <div className="flow-live-fields">
        {step.fields.length === 0 ? (
          <p className="hint">Bu adımda alan yok.</p>
        ) : (
          step.fields.map((field) => (
            <FieldCard
              key={field.fieldId}
              field={field}
              selected={selectedFieldId === field.fieldId}
              saving={savingFieldIds.has(field.fieldId)}
              onClick={(event) => onFieldClick(step.stepId, field, event.currentTarget)}
            />
          ))
        )}
      </div>
    </section>
  )
}

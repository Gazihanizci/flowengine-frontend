export default function StepList({ steps, selectedStepId, onSelectStep }) {
  if (!steps.length) {
    return <p className="hint">Filtreye uygun adim bulunamadi.</p>
  }

  return (
    <div className="flow-edit-step-list">
      {steps.map((step) => {
        const isSelected = step.stepId === selectedStepId

        return (
          <button
            key={step.stepId}
            type="button"
            className={`flow-edit-step-item ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelectStep(step.stepId)}
          >
            <div className="flow-edit-step-item-head">
              <strong>{step.stepName || 'Isimsiz Adim'}</strong>
              <span className="flow-edit-step-chip">#{step.stepId}</span>
            </div>
            <span className="flow-edit-step-meta">Sira: {step.stepOrder}</span>
          </button>
        )
      })}
    </div>
  )
}
